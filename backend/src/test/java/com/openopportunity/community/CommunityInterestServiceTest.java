package com.openopportunity.community;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;

import com.openopportunity.community.dto.CommunityInterestRequest;
import com.openopportunity.community.exception.EmailDeliveryException;
import com.openopportunity.mail.EmailService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;

@ExtendWith(MockitoExtension.class)
class CommunityInterestServiceTest {

    @Mock
    private EmailService emailService;

    @Mock
    private CommunityInterestSubmissionRepository submissionRepository;

    private CommunityInterestService service;

    @BeforeEach
    void setUp() {
        service = new CommunityInterestService(emailService, submissionRepository, "community@openopportunity.com");
    }

    @Test
    @SuppressWarnings("unchecked")
    void notifyInterestSendsAllTheSubmittedContactDetailsToTheDedicatedInbox() {
        service.notifyInterest(
                new CommunityInterestRequest("Priya Nair", "Vertex Robotics", "priya@example.com", "9876543210"));

        ArgumentCaptor<List<String>> captor = ArgumentCaptor.forClass(List.class);
        verify(emailService)
                .send(eq("community@openopportunity.com"), anyString(), anyString(), captor.capture());
        assertThat(captor.getValue())
                .anySatisfy(line -> assertThat(line).contains("Priya Nair"))
                .anySatisfy(line -> assertThat(line).contains("Vertex Robotics"))
                .anySatisfy(line -> assertThat(line).contains("priya@example.com"))
                .anySatisfy(line -> assertThat(line).contains("9876543210"));
    }

    @Test
    void notifyInterestSavesTheSubmissionForTheAdminDashboardCount() {
        service.notifyInterest(
                new CommunityInterestRequest("Priya Nair", "Vertex Robotics", "priya@example.com", "9876543210"));

        ArgumentCaptor<CommunityInterestSubmission> captor =
                ArgumentCaptor.forClass(CommunityInterestSubmission.class);
        verify(submissionRepository).save(captor.capture());
        CommunityInterestSubmission saved = captor.getValue();
        assertThat(saved.getName()).isEqualTo("Priya Nair");
        assertThat(saved.getCompanyName()).isEqualTo("Vertex Robotics");
        assertThat(saved.getEmail()).isEqualTo("priya@example.com");
        assertThat(saved.getPhone()).isEqualTo("9876543210");
    }

    @Test
    void notifyInterestStillSavesTheSubmissionEvenWhenTheEmailFails() {
        doThrow(new MailSendException("smtp down"))
                .when(emailService)
                .send(anyString(), anyString(), anyString(), anyList());

        assertThatThrownBy(() -> service.notifyInterest(
                        new CommunityInterestRequest("Priya Nair", null, "priya@example.com", null)))
                .isInstanceOf(EmailDeliveryException.class);

        verify(submissionRepository).save(any(CommunityInterestSubmission.class));
    }

    @Test
    @SuppressWarnings("unchecked")
    void notifyInterestFillsInNotProvidedForOptionalFields() {
        service.notifyInterest(new CommunityInterestRequest("Arjun Subramaniam", null, "arjun@example.com", null));

        ArgumentCaptor<List<String>> captor = ArgumentCaptor.forClass(List.class);
        verify(emailService).send(anyString(), anyString(), anyString(), captor.capture());
        assertThat(captor.getValue()).contains("Company: Not provided", "Phone: Not provided");
    }

    @Test
    void notifyInterestWrapsAMailFailureInEmailDeliveryException() {
        doThrow(new MailSendException("smtp down"))
                .when(emailService)
                .send(anyString(), anyString(), anyString(), anyList());

        assertThatThrownBy(() -> service.notifyInterest(
                        new CommunityInterestRequest("Priya Nair", null, "priya@example.com", null)))
                .isInstanceOf(EmailDeliveryException.class);
    }
}
