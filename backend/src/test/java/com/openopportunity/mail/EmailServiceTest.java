package com.openopportunity.mail;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailAuthenticationException;
import org.springframework.mail.javamail.JavaMailSender;

class EmailServiceTest {

    private final JavaMailSender mailSender = mock(JavaMailSender.class);
    private final EmailService emailService =
            new EmailService(mailSender, "no-reply@openopportunity.com", "smtp-user");

    @Test
    void stripsCarriageReturnsAndNewlinesFromTheSubjectToPreventHeaderInjection() throws Exception {
        MimeMessage realMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(realMessage);

        // A crafted "name" containing CRLF, as a CommunityInterestService caller might pass
        // straight through with no sanitization of its own.
        emailService.send(
                "candidate@example.com",
                "New request from Evil\r\nBcc: attacker@evil.com",
                "Heading",
                List.of("Body"));

        assertThat(realMessage.getSubject()).isEqualTo("New request from EvilBcc: attacker@evil.com");
        assertThat(realMessage.getSubject()).doesNotContain("\r").doesNotContain("\n");
    }

    @Test
    void leavesAnOrdinarySubjectUnchanged() throws Exception {
        MimeMessage realMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(realMessage);

        emailService.send("candidate@example.com", "Reset your password", "Heading", List.of("Body"));

        assertThat(realMessage.getSubject()).isEqualTo("Reset your password");
    }

    @Test
    void failsFastWithoutTouchingJavaMailSenderWhenNoUsernameIsConfigured() {
        EmailService unconfigured = new EmailService(mailSender, "no-reply@openopportunity.com", "");

        assertThatThrownBy(() -> unconfigured.send("candidate@example.com", "Subject", "Heading", List.of("Body")))
                .isInstanceOf(MailAuthenticationException.class);

        verify(mailSender, never()).createMimeMessage();
        verify(mailSender, never()).send(org.mockito.ArgumentMatchers.<MimeMessage>any());
    }
}
