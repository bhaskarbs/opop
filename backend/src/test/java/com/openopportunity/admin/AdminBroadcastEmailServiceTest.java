package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import com.openopportunity.admin.dto.BroadcastEmailResult;
import com.openopportunity.admin.dto.SendBroadcastEmailRequest;
import com.openopportunity.admin.exception.InvalidBroadcastEmailException;
import com.openopportunity.mail.AsyncEmailSender;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminBroadcastEmailServiceTest {

    @Mock
    private AsyncEmailSender asyncEmailSender;

    private AdminBroadcastEmailService service() {
        return new AdminBroadcastEmailService(asyncEmailSender);
    }

    @Test
    void sendQueuesOneEmailPerDistinctRecipient() {
        SendBroadcastEmailRequest request = new SendBroadcastEmailRequest(
                "Big announcement",
                List.of("rohan@example.com", "asha@example.com"),
                "Hello everyone,\n\nWe have news.");

        BroadcastEmailResult result = service().send(request);

        assertThat(result.recipientCount()).isEqualTo(2);
        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("rohan@example.com"),
                        eq("Big announcement"),
                        eq("Big announcement"),
                        eq(List.of("Hello everyone,", "We have news.")),
                        isNull(),
                        any());
        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("asha@example.com"),
                        eq("Big announcement"),
                        eq("Big announcement"),
                        eq(List.of("Hello everyone,", "We have news.")),
                        isNull(),
                        any());
    }

    @Test
    void sendDedupesRepeatedRecipientsCaseSensitiveExactMatch() {
        SendBroadcastEmailRequest request = new SendBroadcastEmailRequest(
                "Subject", List.of("rohan@example.com", "rohan@example.com"), "Body text");

        BroadcastEmailResult result = service().send(request);

        assertThat(result.recipientCount()).isEqualTo(1);
        verify(asyncEmailSender, times(1))
                .sendBestEffort(eq("rohan@example.com"), any(), any(), any(), any(), any());
    }

    @Test
    void sendTrimsWhitespaceAroundRecipients() {
        SendBroadcastEmailRequest request =
                new SendBroadcastEmailRequest("Subject", List.of("  rohan@example.com  "), "Body text");

        service().send(request);

        verify(asyncEmailSender).sendBestEffort(eq("rohan@example.com"), any(), any(), any(), any(), any());
    }

    @Test
    void sendRejectsAnInvalidEmailAddress() {
        SendBroadcastEmailRequest request =
                new SendBroadcastEmailRequest("Subject", List.of("not-an-email"), "Body text");

        assertThatThrownBy(() -> service().send(request)).isInstanceOf(InvalidBroadcastEmailException.class);
    }

    @Test
    void sendRejectsAListThatIsOnlyBlankStrings() {
        SendBroadcastEmailRequest request = new SendBroadcastEmailRequest("Subject", List.of("   ", ""), "Body text");

        assertThatThrownBy(() -> service().send(request)).isInstanceOf(InvalidBroadcastEmailException.class);
        verify(asyncEmailSender, never()).sendBestEffort(any(), any(), any(), any(), any(), any());
    }

    @Test
    void sendKeepsASingleParagraphWhenMessageHasNoBlankLines() {
        SendBroadcastEmailRequest request =
                new SendBroadcastEmailRequest("Subject", List.of("rohan@example.com"), "One line\nstill one paragraph");

        service().send(request);

        verify(asyncEmailSender)
                .sendBestEffort(
                        any(), any(), any(), eq(List.of("One line\nstill one paragraph")), any(), any());
    }
}
