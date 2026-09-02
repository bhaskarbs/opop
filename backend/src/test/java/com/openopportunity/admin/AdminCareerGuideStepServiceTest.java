package com.openopportunity.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.careerguide.CareerGuideEmailService;
import com.openopportunity.careerguide.CareerGuideStep;
import com.openopportunity.careerguide.CareerGuideStepRepository;
import com.openopportunity.careerguide.dto.CareerGuideStepRequest;
import com.openopportunity.careerguide.dto.CareerGuideStepSummary;
import com.openopportunity.careerguide.dto.ReorderCareerGuideStepsRequest;
import com.openopportunity.careerguide.exception.CareerGuideStepNotFoundException;
import com.openopportunity.careerguide.exception.InvalidCareerGuideStepReorderException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AdminCareerGuideStepServiceTest {

    @Mock
    private CareerGuideStepRepository stepRepository;

    @Mock
    private CareerGuideEmailService careerGuideEmailService;

    private AdminCareerGuideStepService adminCareerGuideStepService;

    @BeforeEach
    void setUp() {
        adminCareerGuideStepService = new AdminCareerGuideStepService(stepRepository, careerGuideEmailService);
    }

    @Test
    void createAppendsAtTheEndOfTheExistingSteps() {
        when(stepRepository.findAllByOrderByStepOrderAsc())
                .thenReturn(List.of(
                        new CareerGuideStep(1, "Step one", "https://video.example/1"),
                        new CareerGuideStep(2, "Step two", "https://video.example/2")));
        when(stepRepository.save(any(CareerGuideStep.class))).thenAnswer(inv -> inv.getArgument(0));

        CareerGuideStepSummary created =
                adminCareerGuideStepService.create(new CareerGuideStepRequest("Step three", "https://video.example/3"));

        assertThat(created.stepOrder()).isEqualTo(3);
        assertThat(created.description()).isEqualTo("Step three");
    }

    @Test
    void createStartsAtOneWhenNoStepsExistYet() {
        when(stepRepository.findAllByOrderByStepOrderAsc()).thenReturn(List.of());
        when(stepRepository.save(any(CareerGuideStep.class))).thenAnswer(inv -> inv.getArgument(0));

        CareerGuideStepSummary created =
                adminCareerGuideStepService.create(new CareerGuideStepRequest("Step one", "https://video.example/1"));

        assertThat(created.stepOrder()).isEqualTo(1);
    }

    /** "Decrease steps" — deleting the middle of 1/2/3 must leave a contiguous 1/2, not 1/3, so
     * the email's Step labels never show a gap. */
    @Test
    void deleteRenumbersTheRemainingStepsToStayContiguous() {
        CareerGuideStep step1 = new CareerGuideStep(1, "Step one", "https://video.example/1");
        CareerGuideStep step2 = new CareerGuideStep(2, "Step two", "https://video.example/2");
        CareerGuideStep step3 = new CareerGuideStep(3, "Step three", "https://video.example/3");
        when(stepRepository.existsById(step2.getId())).thenReturn(true);
        when(stepRepository.findAllByOrderByStepOrderAsc()).thenReturn(List.of(step1, step3));

        adminCareerGuideStepService.delete(step2.getId());

        assertThat(step1.getStepOrder()).isEqualTo(1);
        assertThat(step3.getStepOrder()).isEqualTo(2);
        verify(stepRepository).deleteById(step2.getId());
        verify(stepRepository).saveAll(List.of(step1, step3));
    }

    @Test
    void deleteRejectsAnUnknownId() {
        UUID id = UUID.randomUUID();
        when(stepRepository.existsById(id)).thenReturn(false);

        assertThatThrownBy(() -> adminCareerGuideStepService.delete(id))
                .isInstanceOf(CareerGuideStepNotFoundException.class);
    }

    @Test
    void reorderRenumbersStepsToMatchTheRequestedOrder() {
        CareerGuideStep step1 = new CareerGuideStep(1, "Step one", "https://video.example/1");
        CareerGuideStep step2 = new CareerGuideStep(2, "Step two", "https://video.example/2");
        when(stepRepository.findAllById(List.of(step2.getId(), step1.getId())))
                .thenReturn(List.of(step1, step2));
        when(stepRepository.count()).thenReturn(2L);

        List<CareerGuideStepSummary> reordered = adminCareerGuideStepService.reorder(
                new ReorderCareerGuideStepsRequest(List.of(step2.getId(), step1.getId())));

        assertThat(step2.getStepOrder()).isEqualTo(1);
        assertThat(step1.getStepOrder()).isEqualTo(2);
        assertThat(reordered.get(0).id()).isEqualTo(step2.getId());
        assertThat(reordered.get(1).id()).isEqualTo(step1.getId());
    }

    @Test
    void reorderRejectsAnIdListThatDoesNotCoverEveryExistingStep() {
        CareerGuideStep step1 = new CareerGuideStep(1, "Step one", "https://video.example/1");
        when(stepRepository.findAllById(List.of(step1.getId()))).thenReturn(List.of(step1));
        when(stepRepository.count()).thenReturn(2L);

        assertThatThrownBy(() -> adminCareerGuideStepService.reorder(
                        new ReorderCareerGuideStepsRequest(List.of(step1.getId()))))
                .isInstanceOf(InvalidCareerGuideStepReorderException.class);
    }

    @Test
    void sendTestEmailDelegatesToCareerGuideEmailService() {
        adminCareerGuideStepService.sendTestEmail("someone@example.com");

        verify(careerGuideEmailService).send(eq("someone@example.com"));
    }
}
