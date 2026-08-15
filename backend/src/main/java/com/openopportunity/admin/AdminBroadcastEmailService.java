package com.openopportunity.admin;

import com.openopportunity.admin.dto.BroadcastEmailResult;
import com.openopportunity.admin.dto.SendBroadcastEmailRequest;
import com.openopportunity.admin.exception.InvalidBroadcastEmailException;
import com.openopportunity.mail.AsyncEmailSender;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/** Admin-triggered mass email — same shared branded template every other outgoing email in the
 * app uses (see EmailService/EmailTemplate), not a separate plain-text path. Recipients are
 * fire-and-forget (AsyncEmailSender) for the same reason NotificationService/
 * JobAlertDigestService already use it: one bad address in a list of hundreds shouldn't fail the
 * rest, and a slow/misconfigured SMTP relay shouldn't hold the admin's request open. */
@Service
public class AdminBroadcastEmailService {

    // Practical, not RFC-5322-exhaustive — matches what this app's real form inputs need to
    // reject (typos, stray whitespace, missing @/domain), same level of strictness as Jakarta's
    // own @Email constraint used elsewhere (see CreateVideoShareRequest), which doesn't cascade
    // into List<String> elements without extra generics wiring this doesn't need.
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");

    private final AsyncEmailSender asyncEmailSender;

    public AdminBroadcastEmailService(AsyncEmailSender asyncEmailSender) {
        this.asyncEmailSender = asyncEmailSender;
    }

    public BroadcastEmailResult send(SendBroadcastEmailRequest request) {
        Set<String> recipients = normalizeRecipients(request.recipients());
        List<String> paragraphs = splitIntoParagraphs(request.message());

        for (String recipient : recipients) {
            asyncEmailSender.sendBestEffort(recipient, request.subject(), request.subject(), paragraphs, null, () -> {});
        }

        return new BroadcastEmailResult(recipients.size());
    }

    // LinkedHashSet: dedupes (a pasted list re-including the same address twice shouldn't send
    // twice) while keeping the order the admin entered them in, for anything that ever needs to
    // report back per-recipient status.
    private Set<String> normalizeRecipients(List<String> rawRecipients) {
        Set<String> recipients = new LinkedHashSet<>();
        for (String raw : rawRecipients) {
            String trimmed = raw.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            if (!EMAIL_PATTERN.matcher(trimmed).matches()) {
                throw new InvalidBroadcastEmailException("Not a valid email address: " + trimmed);
            }
            recipients.add(trimmed);
        }
        if (recipients.isEmpty()) {
            throw new InvalidBroadcastEmailException("At least one recipient is required");
        }
        return recipients;
    }

    // Blank-line-separated blocks become separate <p> tags in the shared template (see
    // EmailTemplate.render) — the natural way a plain textarea's content maps onto paragraphs
    // without asking the admin to write HTML.
    private List<String> splitIntoParagraphs(String message) {
        return Arrays.stream(message.trim().split("\\n\\s*\\n"))
                .map(String::trim)
                .filter(paragraph -> !paragraph.isEmpty())
                .toList();
    }
}
