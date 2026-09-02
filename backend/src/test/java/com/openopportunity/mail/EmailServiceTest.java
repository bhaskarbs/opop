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
    private final EmailService emailService = new EmailService(
            mailSender, "customersupport@openopportunity.in", "OpenOpportunity", "smtp-user");

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
    void setsADisplayNameOnTheFromHeaderSoRecipientsSeeItRatherThanTheRawAddress() throws Exception {
        MimeMessage realMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(realMessage);

        emailService.send("candidate@example.com", "Subject", "Heading", List.of("Body"));

        assertThat(realMessage.getFrom()[0].toString())
                .isEqualTo("OpenOpportunity <customersupport@openopportunity.in>");
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
        EmailService unconfigured = new EmailService(
                mailSender, "customersupport@openopportunity.in", "OpenOpportunity", "");

        assertThatThrownBy(() -> unconfigured.send("candidate@example.com", "Subject", "Heading", List.of("Body")))
                .isInstanceOf(MailAuthenticationException.class);

        verify(mailSender, never()).createMimeMessage();
        verify(mailSender, never()).send(org.mockito.ArgumentMatchers.<MimeMessage>any());
    }

    @Test
    void rendersEveryStepAsAButtonLinkingToItsOwnVideoUrl() throws Exception {
        MimeMessage realMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(realMessage);

        emailService.sendCareerGuide(
                "candidate@example.com",
                "Subject",
                List.of(
                        new CareerGuideStepCta(1, "Understand how the world of work is changing.", "https://video.example/1"),
                        new CareerGuideStepCta(2, "Learn the skills employers value today.", "https://video.example/2")));

        String html = (String) realMessage.getContent();
        assertThat(html).contains("Step 1").contains("Step 2");
        assertThat(html).contains("href=\"https://video.example/1\"").contains("href=\"https://video.example/2\"");
        assertThat(html).contains("Understand how the world of work is changing.");
        assertThat(html).contains("Learn the skills employers value today.");
    }

    @Test
    void escapesStepDescriptionAndUrlInTheCareerGuideEmail() throws Exception {
        MimeMessage realMessage = new MimeMessage((Session) null);
        when(mailSender.createMimeMessage()).thenReturn(realMessage);

        emailService.sendCareerGuide(
                "candidate@example.com",
                "Subject",
                List.of(new CareerGuideStepCta(1, "<script>alert(1)</script>", "https://video.example/1?a=1&b=2")));

        String html = (String) realMessage.getContent();
        assertThat(html).doesNotContain("<script>");
        assertThat(html).contains("&lt;script&gt;");
        assertThat(html).contains("https://video.example/1?a=1&amp;b=2");
    }

    @Test
    void sendCareerGuideFailsFastWithoutTouchingJavaMailSenderWhenNoUsernameIsConfigured() {
        EmailService unconfigured = new EmailService(
                mailSender, "customersupport@openopportunity.in", "OpenOpportunity", "");

        assertThatThrownBy(() -> unconfigured.sendCareerGuide(
                        "candidate@example.com",
                        "Subject",
                        List.of(new CareerGuideStepCta(1, "Description", "https://video.example/1"))))
                .isInstanceOf(MailAuthenticationException.class);

        verify(mailSender, never()).createMimeMessage();
        verify(mailSender, never()).send(org.mockito.ArgumentMatchers.<MimeMessage>any());
    }
}
