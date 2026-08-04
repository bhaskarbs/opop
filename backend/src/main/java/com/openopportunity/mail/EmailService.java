package com.openopportunity.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.MailPreparationException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

/** The one place in the app that talks to JavaMailSender directly — every outgoing email
 * (password reset, notification digests, community interest requests, ...) goes through here so
 * they all share the same branded HTML layout (see EmailTemplate) instead of each call site
 * hand-rolling its own plain-text SimpleMailMessage. */
@Service
public class EmailService {

    private final JavaMailSender mailSender;
    private final String fromAddress;
    // Blank locally (see spring.mail.username in application.properties) — checked so an
    // unconfigured deployment fails a send immediately instead of waiting out a real TCP
    // connect + AUTH round trip to MAIL_HOST just to get the same auth failure back a second or
    // two later. That real round-trip time is exactly what saturated AsyncConfig's bounded
    // emailTaskExecutor under a busy test suite before this existed.
    private final boolean configured;

    public EmailService(
            JavaMailSender mailSender,
            @Value("${app.mail.from}") String fromAddress,
            @Value("${spring.mail.username:}") String mailUsername) {
        this.mailSender = mailSender;
        this.fromAddress = fromAddress;
        this.configured = !mailUsername.isBlank();
    }

    public void send(String to, String subject, String heading, List<String> paragraphs) {
        send(to, subject, heading, paragraphs, null);
    }

    /** Throws MailException on any failure — a template build failure is wrapped as
     * MailPreparationException, an unconfigured SMTP host throws MailAuthenticationException
     * synthetically (see `configured`), and an actual send failure surfaces as whatever
     * JavaMailSender throws (typically MailSendException). All three are MailException, so
     * existing catch (MailException e) call sites don't need to change. */
    public void send(String to, String subject, String heading, List<String> paragraphs, EmailButton button) {
        if (!configured) {
            throw new MailAuthenticationException(
                    "No SMTP credentials configured (spring.mail.username is blank)");
        }
        MimeMessage mimeMessage = mailSender.createMimeMessage();
        try {
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(to);
            helper.setSubject(sanitizeSubject(subject));
            helper.setText(EmailTemplate.render(heading, paragraphs, button), true);
        } catch (MessagingException e) {
            throw new MailPreparationException(e);
        }
        mailSender.send(mimeMessage);
    }

    // Some callers build subject from user-supplied text (e.g. CommunityInterestService, which
    // includes the submitter's own name) with no server-side restriction on its characters — a
    // CR or LF in there could otherwise inject extra headers into the outgoing message. Stripped
    // here rather than at each call site, since this is the one place every send goes through.
    private static String sanitizeSubject(String subject) {
        return subject.replaceAll("[\r\n]", "");
    }
}
