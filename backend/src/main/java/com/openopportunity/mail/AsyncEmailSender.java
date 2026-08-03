package com.openopportunity.mail;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.mail.MailException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/**
 * Fire-and-forget wrapper around {@link EmailService} for call sites that already treat a
 * delivery failure as non-fatal (NotificationService, JobAlertDigestService) — a delivery
 * failure is only logged, never thrown. AuthService (password reset) and
 * CommunityInterestService need the opposite (a failure must fail the request), so they call
 * EmailService directly instead of going through here.
 *
 * <p>Runs on emailTaskExecutor (see AsyncConfig) rather than the caller's own thread, so a
 * slow/misconfigured SMTP server (e.g. blank spring.mail.username locally) can't block a live
 * request or serialize a scheduled batch. onSuccess runs on that same background thread once the
 * send completes — callers use it to record delivery (e.g. Notification.markEmailSent) without
 * having to block on the send themselves.
 */
@Service
public class AsyncEmailSender {

    private static final Logger log = LoggerFactory.getLogger(AsyncEmailSender.class);

    private final EmailService emailService;

    public AsyncEmailSender(EmailService emailService) {
        this.emailService = emailService;
    }

    @Async("emailTaskExecutor")
    public void sendBestEffort(
            String to,
            String subject,
            String heading,
            List<String> paragraphs,
            EmailButton button,
            Runnable onSuccess) {
        try {
            emailService.send(to, subject, heading, paragraphs, button);
            onSuccess.run();
        } catch (MailException ex) {
            log.warn("Could not send email to {}: {}", to, ex.getMessage());
        }
    }
}
