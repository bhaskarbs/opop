package com.openopportunity.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.chat.dto.ChatTurn;
import com.openopportunity.chat.exception.ChatRateLimitedException;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

/** Only what's testable without a real Anthropic client — same constraint
 * MockInterviewQuestionServiceTest works under (the client is constructed internally from the
 * environment, not injected, so a unit test can't control or mock it). ChatFaqCache is a real
 * instance (not mocked) so its cache-hit tests double as a check that the actual
 * chat-faq-cache.json content matches what these tests expect. */
class ChatServiceTest {

    private final ChatRateLimiter rateLimiter = mock(ChatRateLimiter.class);
    private final ChatFaqCache faqCache = new ChatFaqCache(new ObjectMapper());
    private final ChatService service = new ChatService(rateLimiter, faqCache, List.of());

    @Test
    void refusesToChatWhenTheClientIsRateLimited() {
        when(rateLimiter.tryAcquire("10.0.0.1")).thenReturn(false);

        assertThatThrownBy(() -> service.chat("10.0.0.1", null, null, "How do I post a job?", List.of()))
                .isInstanceOf(ChatRateLimitedException.class);
    }

    @Test
    void answersAWellKnownFaqWithoutEverNeedingTheLlmClient() {
        when(rateLimiter.tryAcquire("10.0.0.1")).thenReturn(true);

        // No ANTHROPIC_API_KEY in the test environment, so `client` inside ChatService is null —
        // if this reached the real LLM call path it would throw ChatUnavailableException
        // instead of returning an answer, so a real answer here proves the FAQ cache short-
        // circuited before ever touching the client.
        String reply = service.chat("10.0.0.1", null, null, "How do I post a job?", List.of());

        assertThat(reply).contains("company profile");
    }

    // "FAQ cache doesn't fire mid-conversation" is covered network-free at the ChatFaqCache
    // level (see ChatFaqCacheTest.neverMatchesMidConversationEvenWithAKnownTrigger) rather than
    // here — asserting it through ChatService would mean asserting on what happens after falling
    // through to the real LLM call, which depends on whether this environment happens to have a
    // real ANTHROPIC_API_KEY set (it does, on this machine), making that a flaky, real-network,
    // real-money test rather than a unit test.

    @Test
    void trimHistoryKeepsTheMostRecentTurnsWhenOverTheLimit() {
        List<ChatTurn> history = IntStream.range(0, 25)
                .mapToObj(i -> new ChatTurn(i % 2 == 0 ? "user" : "assistant", "turn " + i))
                .toList();

        List<ChatTurn> trimmed = ChatService.trimHistory(history);

        assertThat(trimmed).hasSize(20);
        assertThat(trimmed.get(0).content()).isEqualTo("turn 5");
        assertThat(trimmed.get(19).content()).isEqualTo("turn 24");
    }

    @Test
    void trimHistoryLeavesAShorterHistoryUntouched() {
        List<ChatTurn> history = List.of(new ChatTurn("user", "hi"));

        List<ChatTurn> trimmed = ChatService.trimHistory(history);

        assertThat(trimmed).isEqualTo(history);
    }
}
