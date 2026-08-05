package com.openopportunity.chat;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.ContentBlockParam;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Model;
import com.anthropic.models.messages.ToolResultBlockParam;
import com.anthropic.models.messages.ToolUseBlock;
import com.openopportunity.chat.dto.ChatTurn;
import com.openopportunity.chat.exception.ChatRateLimitedException;
import com.openopportunity.chat.exception.ChatUnavailableException;
import com.openopportunity.chat.tool.ChatTool;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

/** The AI chat/voice support assistant — plain conversational Q&A about how OpenOpportunity works
 * (see chat-support-system-prompt.md), read-only tool-calling (search_jobs, search_candidates),
 * and state-changing tool-calling with a confirm-before-execute protocol (post_job, apply_to_job,
 * post_idea, express_interest_in_idea) — see the {@code chat.tool} package for all of those.
 * Before any of that, chat() checks ChatFaqCache for a small set of very common questions that
 * are answered without ever calling the LLM, since that's a real per-request cost — see its
 * Javadoc for when it does (and deliberately doesn't) fire.
 *
 * <p>Deliberately keeps no server-side conversation history — the caller (ChatController) passes
 * the running conversation back on every request, same "client owns the state, server is
 * stateless per call" shape as most of this app's other endpoints. A persisted ChatSession/
 * ChatMessage pair (mirroring MockInterviewSession) is the natural next step if cross-device/
 * cross-reload history turns out to matter. */
@Service
public class ChatService {

    private static final Logger log = LoggerFactory.getLogger(ChatService.class);

    // Bounds how much conversation context (and therefore cost) one request can carry,
    // independent of ChatRequest's own @Size cap on the wire — trims from the oldest end so the
    // most recent exchange (what the new message is actually replying to) is never dropped.
    private static final int MAX_HISTORY_TURNS = 20;

    // A normal tool-assisted reply is one round trip (call a tool, read the result, answer) —
    // this is a safety cap against a runaway back-and-forth (e.g. the model repeatedly calling
    // a tool instead of ever answering), not a limit anyone should expect to actually hit.
    private static final int MAX_TOOL_ITERATIONS = 4;

    private final AnthropicClient client;
    private final ChatRateLimiter rateLimiter;
    private final ChatFaqCache faqCache;
    private final String systemPrompt;
    private final List<ChatTool> tools;

    public ChatService(ChatRateLimiter rateLimiter, ChatFaqCache faqCache, List<ChatTool> tools) {
        this.rateLimiter = rateLimiter;
        this.faqCache = faqCache;
        this.tools = tools;
        this.systemPrompt = loadSystemPrompt();
        AnthropicClient created;
        try {
            created = AnthropicOkHttpClient.fromEnv();
        } catch (RuntimeException ex) {
            created = null;
        }
        this.client = created;
    }

    public String chat(
            String clientIp, UUID currentUserId, String currentUserRole, String message, List<ChatTurn> history) {
        if (!rateLimiter.tryAcquire(clientIp)) {
            throw new ChatRateLimitedException();
        }
        Optional<String> cachedAnswer = faqCache.lookup(message, !history.isEmpty());
        if (cachedAnswer.isPresent()) {
            return cachedAnswer.get();
        }
        if (client == null) {
            throw new ChatUnavailableException();
        }

        List<ChatTool> availableTools = tools.stream()
                .filter(tool -> tool.isAvailableTo(currentUserId, currentUserRole))
                .toList();

        MessageCreateParams.Builder paramsBuilder = MessageCreateParams.builder()
                .model(Model.CLAUDE_HAIKU_4_5)
                .maxTokens(1024L)
                .system(systemPrompt);
        for (ChatTurn turn : trimHistory(history)) {
            if ("assistant".equals(turn.role())) {
                paramsBuilder.addAssistantMessage(turn.content());
            } else {
                paramsBuilder.addUserMessage(turn.content());
            }
        }
        paramsBuilder.addUserMessage(message);
        for (ChatTool tool : availableTools) {
            paramsBuilder.addTool(tool.definition());
        }

        try {
            return runToolLoop(paramsBuilder, availableTools, currentUserId);
        } catch (ChatUnavailableException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.warn("Chat completion failed: {}", ex.getMessage(), ex);
            throw new ChatUnavailableException();
        }
    }

    /** Calls the model, and if it asks to use a tool, executes it and feeds the result back for
     * another round — repeating until the model responds with plain text instead of a tool
     * call, or MAX_TOOL_ITERATIONS is hit. Mutates paramsBuilder in place (each round appends
     * the assistant's tool-use turn and the tool result(s) as the next turn), so this only ever
     * needs one growing conversation rather than rebuilding it from scratch per round. */
    private String runToolLoop(MessageCreateParams.Builder paramsBuilder, List<ChatTool> availableTools, UUID currentUserId) {
        for (int iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
            Message response = client.messages().create(paramsBuilder.build());
            List<ToolUseBlock> toolUses =
                    response.content().stream().flatMap(block -> block.toolUse().stream()).toList();

            if (toolUses.isEmpty()) {
                return response.content().stream()
                        .flatMap(block -> block.text().stream())
                        .findFirst()
                        .orElseThrow(ChatUnavailableException::new)
                        .text();
            }

            List<ContentBlockParam> toolResults = new ArrayList<>();
            for (ToolUseBlock toolUse : toolUses) {
                toolResults.add(ContentBlockParam.ofToolResult(executeTool(toolUse, availableTools, currentUserId)));
            }
            paramsBuilder.addMessage(response);
            paramsBuilder.addUserMessageOfBlockParams(toolResults);
        }
        throw new ChatUnavailableException();
    }

    private ToolResultBlockParam executeTool(ToolUseBlock toolUse, List<ChatTool> availableTools, UUID currentUserId) {
        ChatTool tool = availableTools.stream()
                .filter(candidate -> candidate.definition().name().equals(toolUse.name()))
                .findFirst()
                .orElse(null);
        if (tool == null) {
            return ToolResultBlockParam.builder()
                    .toolUseId(toolUse.id())
                    .content("Tool \"" + toolUse.name() + "\" is not available.")
                    .isError(true)
                    .build();
        }
        try {
            return ToolResultBlockParam.builder()
                    .toolUseId(toolUse.id())
                    .content(tool.execute(currentUserId, toolUse._input()))
                    .build();
        } catch (RuntimeException ex) {
            log.warn("Tool {} failed: {}", toolUse.name(), ex.getMessage(), ex);
            return ToolResultBlockParam.builder()
                    .toolUseId(toolUse.id())
                    .content("This action failed: " + ex.getMessage())
                    .isError(true)
                    .build();
        }
    }

    /** Package-private (not private) so ChatServiceTest can verify this trims from the oldest
     * end without needing a real Anthropic client to exercise the rest of chat(). */
    static List<ChatTurn> trimHistory(List<ChatTurn> history) {
        return history.size() > MAX_HISTORY_TURNS
                ? history.subList(history.size() - MAX_HISTORY_TURNS, history.size())
                : history;
    }

    private static String loadSystemPrompt() {
        try (InputStream in = new ClassPathResource("chat-support-system-prompt.md").getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException ex) {
            throw new UncheckedIOException("Missing chat-support-system-prompt.md on the classpath", ex);
        }
    }
}
