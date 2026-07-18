package com.openopportunity.community;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import com.openopportunity.community.dto.CommunityInterestRequest;
import com.openopportunity.community.exception.EmailDeliveryException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
class CommunityInterestServiceTest {

    @Mock
    private JavaMailSender mailSender;

    private CommunityInterestService service;

    @BeforeEach
    void setUp() {
        service = new CommunityInterestService(
                mailSender, "no-reply@openopportunity.com", "community@openopportunity.com");
    }

    @Test
    void notifyInterestSendsAllTheSubmittedContactDetailsToTheDedicatedInbox() {
        service.notifyInterest(
                new CommunityInterestRequest("Priya Nair", "Vertex Robotics", "priya@example.com", "9876543210"));

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage sent = captor.getValue();
        assertThat(sent.getTo()).containsExactly("community@openopportunity.com");
        assertThat(sent.getFrom()).isEqualTo("no-reply@openopportunity.com");
        assertThat(sent.getText())
                .contains("Priya Nair")
                .contains("Vertex Robotics")
                .contains("priya@example.com")
                .contains("9876543210");
    }

    @Test
    void notifyInterestFillsInNotProvidedForOptionalFields() {
        service.notifyInterest(new CommunityInterestRequest("Arjun Subramaniam", null, "arjun@example.com", null));

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        assertThat(captor.getValue().getText()).contains("Company: Not provided").contains("Phone: Not provided");
    }

    @Test
    void notifyInterestWrapsAMailFailureInEmailDeliveryException() {
        doThrow(new MailSendException("smtp down")).when(mailSender).send(any(SimpleMailMessage.class));

        assertThatThrownBy(() -> service.notifyInterest(
                        new CommunityInterestRequest("Priya Nair", null, "priya@example.com", null)))
                .isInstanceOf(EmailDeliveryException.class);
    }
}
