package com.openopportunity.chat;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/** A hand-curated set of very common support questions (see chat-faq-cache.json) answered
 * without ever calling the LLM — each real Anthropic API call costs money, and a large share of
 * chat traffic on a support widget is the same handful of "how do I..." questions asked over and
 * over, so serving those from a static answer is close to free and instant, not just cheaper.
 *
 * <p>Deliberately conservative about when it fires, since a wrong cache hit is worse than an
 * unnecessary LLM call:
 * <ul>
 *   <li>Only matches the first message of a conversation (no prior history) — a cached generic
 *       answer mid-conversation could ignore context the person already established with the
 *       model, e.g. a job they were just discussing.
 *   <li>Trigger phrases are whole "how do I ..."/"what is ..." style questions, not bare
 *       keywords, so an action request like "apply me to job 123" or "post a job for me: ..."
 *       (which needs a real tool call, not a canned answer) doesn't accidentally match a trigger
 *       like "how do i apply for a job".
 * </ul>
 * When extending chat-faq-cache.json, keep both of those properties — favor missing a cache hit
 * (falls through to the real LLM call, still correct) over a false one (returns a possibly wrong
 * or context-blind answer). */
@Component
public class ChatFaqCache {

    private final List<ChatFaqEntry> entries;

    public ChatFaqCache(ObjectMapper objectMapper) {
        this.entries = loadEntries(objectMapper);
    }

    /** Empty when there's no confident match — the caller should fall through to the real LLM
     * call in that case, not treat an empty result as an error. hasHistory gates out anything
     * but a conversation's very first message (see class Javadoc). */
    public Optional<String> lookup(String message, boolean hasHistory) {
        if (hasHistory) {
            return Optional.empty();
        }
        String normalized = normalize(message);
        return entries.stream()
                .filter(entry -> entry.triggers().stream().anyMatch(normalized::contains))
                .map(ChatFaqEntry::answer)
                .findFirst();
    }

    private static String normalize(String text) {
        return text.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 ]", " ").replaceAll("\\s+", " ").trim();
    }

    private static List<ChatFaqEntry> loadEntries(ObjectMapper objectMapper) {
        try (InputStream in = new ClassPathResource("chat-faq-cache.json").getInputStream()) {
            return objectMapper.readValue(in, new TypeReference<List<ChatFaqEntry>>() {});
        } catch (IOException ex) {
            throw new UncheckedIOException("Missing chat-faq-cache.json on the classpath", ex);
        }
    }
}
