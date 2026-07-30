package com.openopportunity.jobalert;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.WorkMode;
import com.openopportunity.jobalert.dto.JobAlertRequest;
import com.openopportunity.jobalert.dto.JobAlertSummary;
import com.openopportunity.jobalert.exception.JobAlertLimitReachedException;
import com.openopportunity.jobalert.exception.JobAlertNotFoundException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class JobAlertServiceTest {

    @Mock
    private JobAlertRepository jobAlertRepository;

    private JobAlertService jobAlertService;

    @BeforeEach
    void setUp() {
        jobAlertService = new JobAlertService(jobAlertRepository);
    }

    @Test
    void createSavesAnAlertWithTheGivenCriteria() {
        UUID candidateId = UUID.randomUUID();
        JobAlertRequest request =
                new JobAlertRequest(List.of("React"), List.of("Bengaluru"), ExperienceLevel.SENIOR, WorkMode.HYBRID);

        JobAlertSummary summary = jobAlertService.create(candidateId, request);

        ArgumentCaptor<JobAlert> captor = ArgumentCaptor.forClass(JobAlert.class);
        verify(jobAlertRepository).save(captor.capture());
        assertThat(captor.getValue().getCandidateId()).isEqualTo(candidateId);
        assertThat(captor.getValue().getKeywords()).containsExactly("React");
        assertThat(summary.locations()).containsExactly("Bengaluru");
        assertThat(summary.experienceLevel()).isEqualTo(ExperienceLevel.SENIOR);
        assertThat(summary.workMode()).isEqualTo(WorkMode.HYBRID);
    }

    @Test
    void createAllowsAnAlertWithNoFiltersAtAll() {
        UUID candidateId = UUID.randomUUID();
        JobAlertRequest request = new JobAlertRequest(null, null, null, null);

        JobAlertSummary summary = jobAlertService.create(candidateId, request);

        assertThat(summary.keywords()).isEmpty();
        assertThat(summary.locations()).isEmpty();
    }

    @Test
    void createRejectsAnEleventhAlert() {
        UUID candidateId = UUID.randomUUID();
        when(jobAlertRepository.countByCandidateId(candidateId)).thenReturn(10L);

        assertThatThrownBy(() -> jobAlertService.create(candidateId, new JobAlertRequest(null, null, null, null)))
                .isInstanceOf(JobAlertLimitReachedException.class);

        verify(jobAlertRepository, never()).save(any());
    }

    @Test
    void deleteRejectsAnAlertThatIsNotFoundOrNotOwned() {
        UUID id = UUID.randomUUID();
        UUID candidateId = UUID.randomUUID();
        when(jobAlertRepository.findByIdAndCandidateId(id, candidateId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> jobAlertService.delete(id, candidateId))
                .isInstanceOf(JobAlertNotFoundException.class);
    }

    @Test
    void deleteRemovesAnOwnedAlert() {
        UUID candidateId = UUID.randomUUID();
        JobAlert alert = new JobAlert(candidateId, List.of("React"), List.of(), null, null);
        when(jobAlertRepository.findByIdAndCandidateId(alert.getId(), candidateId)).thenReturn(Optional.of(alert));

        jobAlertService.delete(alert.getId(), candidateId);

        verify(jobAlertRepository).delete(alert);
    }
}
