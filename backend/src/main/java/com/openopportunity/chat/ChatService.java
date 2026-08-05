package com.openopportunity.chat;

import com.anthropic.client.AnthropicClient;
import com.anthropic.client.okhttp.AnthropicOkHttpClient;
import com.anthropic.models.messages.Message;
import com.anthropic.models.messages.MessageCreateParams;
import com.anthropic.models.messages.Model;
import com.openopportunity.chat.dto.ChatTurn;
import com.openopportunity.chat.exception.ChatRateLimitedException;
import com.openopportunity.chat.exception.ChatUnavailableException;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

/** Phase A of the AI chat/voice support assistant — plain conversational Q&A about how
 * OpenOpportunity works (see chat-support-system-prompt.md), no tool-calling/actions yet (that's
 * a later phase: search jobs/candidates, then state-changing actions like posting a job or
 * applying, each gated by the caller's actual role the same way the real endpoints already are).
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

    private final AnthropicClient client;
    private final ChatRateLimiter rateLimiter;
    private final String systemPrompt;

    public ChatService(ChatRateLimiter rateLimiter) {
        this.rateLimiter = rateLimiter;
        this.systemPrompt = loadSystemPrompt();
        AnthropicClient created;
        try {
            created = AnthropicOkHttpClient.fromEnv();
        } catch (RuntimeException ex) {
            created = null;
        }
        this.client = created;
    }

    public String chat(String clientIp, String message, List<ChatTurn> history) {
        if (!rateLimiter.tryAcquire(clientIp)) {
            throw new ChatRateLimitedException();
        }
        if (client == null) {
            throw new ChatUnavailableException();
        }

        List<ChatTurn> recentHistory = trimHistory(history);

        MessageCreateParams.Builder paramsBuilder = MessageCreateParams.builder()
                .model(Model.CLAUDE_HAIKU_4_5)
                .maxTokens(1024L)
                .system(systemPrompt);
        for (ChatTurn turn : recentHistory) {
            if ("assistant".equals(turn.role())) {
                paramsBuilder.addAssistantMessage(turn.content());
            } else {
                paramsBuilder.addUserMessage(turn.content());
            }
        }
        paramsBuilder.addUserMessage(message);

        try {
            Message result = client.messages().create(paramsBuilder.build());
            return result.content().stream()
                    .flatMap(block -> block.text().stream())
                    .findFirst()
                    .orElseThrow(ChatUnavailableException::new)
                    .text();
        } catch (ChatUnavailableException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.warn("Chat completion failed: {}", ex.getMessage(), ex);
            throw new ChatUnavailableException();
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
