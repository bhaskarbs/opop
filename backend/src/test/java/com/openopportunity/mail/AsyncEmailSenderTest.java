package com.openopportunity.mail;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;

class AsyncEmailSenderTest {

    private final EmailService emailService = mock(EmailService.class);
    private final AsyncEmailSender asyncEmailSender = new AsyncEmailSender(emailService);

    @Test
    void runsOnSuccessAfterTheSendSucceeds() {
        Runnable onSuccess = mock(Runnable.class);

        asyncEmailSender.sendBestEffort(
                "candidate@example.com", "Subject", "Heading", List.of("Body"), null, onSuccess);

        verify(emailService).send("candidate@example.com", "Subject", "Heading", List.of("Body"), null);
        verify(onSuccess).run();
    }

    @Test
    void swallowsAMailExceptionAndSkipsOnSuccess() {
        Runnable onSuccess = mock(Runnable.class);
        doThrow(new MailSendException("smtp down"))
                .when(emailService)
                .send(anyString(), anyString(), anyString(), anyList(), any());

        asyncEmailSender.sendBestEffort(
                "candidate@example.com", "Subject", "Heading", List.of("Body"), null, onSuccess);

        verify(onSuccess, never()).run();
    }
}
