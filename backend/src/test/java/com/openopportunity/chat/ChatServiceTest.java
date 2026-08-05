package com.openopportunity.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.openopportunity.chat.dto.ChatTurn;
import com.openopportunity.chat.exception.ChatRateLimitedException;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

/** Only what's testable without a real Anthropic client — same constraint
 * MockInterviewQuestionServiceTest works under (the client is constructed internally from the
 * environment, not injected, so a unit test can't control or mock it). */
class ChatServiceTest {

    private final ChatRateLimiter rateLimiter = mock(ChatRateLimiter.class);
    private final ChatService service = new ChatService(rateLimiter, List.of());

    @Test
    void refusesToChatWhenTheClientIsRateLimited() {
        when(rateLimiter.tryAcquire("10.0.0.1")).thenReturn(false);

        assertThatThrownBy(() ->
                        service.chat("10.0.0.1", null, null, "How do I post a job?", List.of()))
                .isInstanceOf(ChatRateLimitedException.class);
    }

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
