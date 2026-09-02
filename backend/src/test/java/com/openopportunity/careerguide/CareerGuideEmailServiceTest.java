package com.openopportunity.careerguide;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.careerguide.exception.CareerGuideEmailSendException;
import com.openopportunity.careerguide.exception.NoCareerGuideStepsConfiguredException;
import com.openopportunity.mail.CareerGuideStepCta;
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
class CareerGuideEmailServiceTest {

    @Mock
    private CareerGuideStepRepository stepRepository;

    @Mock
    private EmailService emailService;

    private CareerGuideEmailService careerGuideEmailService;

    @BeforeEach
    void setUp() {
        careerGuideEmailService = new CareerGuideEmailService(stepRepository, emailService);
    }

    @Test
    void sendsStepsInOrderAsCareerGuideStepCtas() {
        when(stepRepository.findAllByOrderByStepOrderAsc())
                .thenReturn(List.of(
                        new CareerGuideStep(1, "Step one desc", "https://video.example/1"),
                        new CareerGuideStep(2, "Step two desc", "https://video.example/2")));

        careerGuideEmailService.send("candidate@example.com");

        ArgumentCaptor<List<CareerGuideStepCta>> captor = ArgumentCaptor.forClass(List.class);
        verify(emailService).sendCareerGuide(anyString(), anyString(), captor.capture());
        List<CareerGuideStepCta> ctas = captor.getValue();
        assertThat(ctas).hasSize(2);
        assertThat(ctas.get(0).stepNumber()).isEqualTo(1);
        assertThat(ctas.get(0).description()).isEqualTo("Step one desc");
        assertThat(ctas.get(0).url()).isEqualTo("https://video.example/1");
        assertThat(ctas.get(1).stepNumber()).isEqualTo(2);
    }

    @Test
    void refusesToSendWhenNoStepsAreConfigured() {
        when(stepRepository.findAllByOrderByStepOrderAsc()).thenReturn(List.of());

        assertThatThrownBy(() -> careerGuideEmailService.send("candidate@example.com"))
                .isInstanceOf(NoCareerGuideStepsConfiguredException.class);

        verify(emailService, never()).sendCareerGuide(anyString(), anyString(), anyList());
    }

    @Test
    void wrapsAMailExceptionAsACareerGuideEmailSendException() {
        when(stepRepository.findAllByOrderByStepOrderAsc())
                .thenReturn(List.of(new CareerGuideStep(1, "Step one desc", "https://video.example/1")));
        doThrow(new MailSendException("smtp down"))
                .when(emailService)
                .sendCareerGuide(anyString(), anyString(), anyList());

        assertThatThrownBy(() -> careerGuideEmailService.send("candidate@example.com"))
                .isInstanceOf(CareerGuideEmailSendException.class);
    }
}
