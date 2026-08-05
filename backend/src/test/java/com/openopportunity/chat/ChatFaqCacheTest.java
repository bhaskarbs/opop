package com.openopportunity.chat;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class ChatFaqCacheTest {

    private final ChatFaqCache cache = new ChatFaqCache(new ObjectMapper());

    @Test
    void matchesAKnownTriggerCaseInsensitivelyAndIgnoringSurroundingWords() {
        Optional<String> answer = cache.lookup("Hey, how do I post a job on your site?", false);

        assertThat(answer).isPresent();
        assertThat(answer.get()).contains("company profile");
    }

    @Test
    void returnsEmptyForAnUnrecognizedQuestion() {
        Optional<String> answer = cache.lookup("What's the weather like today?", false);

        assertThat(answer).isEmpty();
    }

    @Test
    void neverMatchesMidConversationEvenWithAKnownTrigger() {
        Optional<String> answer = cache.lookup("How do I post a job?", true);

        assertThat(answer).isEmpty();
    }

    @Test
    void doesNotMatchAnActionRequestThatNeedsARealToolCall() {
        // "apply me to job 123" doesn't contain the apply-job entry's "how do i apply..."
        // trigger phrases — this must fall through to the real apply_to_job tool, not a canned
        // answer, since only the tool actually knows about job 123.
        assertThat(cache.lookup("apply me to job 123", false)).isEmpty();
        assertThat(cache.lookup("post a job for me: Senior Backend Engineer, remote", false))
                .isEmpty();
        assertThat(cache.lookup("find candidates in Bangalore", false)).isEmpty();
    }

    @Test
    void matchesThePricingQuestion() {
        Optional<String> answer = cache.lookup("How much does it cost?", false);

        assertThat(answer).isPresent();
        assertThat(answer.get()).contains("Growth");
    }
}
