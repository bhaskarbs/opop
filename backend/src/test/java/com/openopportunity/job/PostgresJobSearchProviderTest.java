package com.openopportunity.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class PostgresJobSearchProviderTest {

    @Mock
    private JobRepository jobRepository;

    private PostgresJobSearchProvider provider;

    @BeforeEach
    void setUp() {
        provider = new PostgresJobSearchProvider(jobRepository);
    }

    private static Job activeJob(String title) {
        return new Job(
                UUID.randomUUID(),
                "Acme",
                title,
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.ON_SITE,
                "Bengaluru",
                null,
                null,
                null,
                "desc",
                List.of(),
                List.of(),
                List.of(),
                JobStatus.ACTIVE);
    }

    @Test
    void returnsMatchingJobIdsInTheOrderJobRepositoryReturnsThem() {
        Job first = activeJob("Engineer");
        Job second = activeJob("Manager");
        when(jobRepository.findAll(any(Specification.class), any(Sort.class)))
                .thenReturn(List.of(first, second));

        List<UUID> ids = provider.searchIds(null, null, null, null, null, "relevant");

        assertThat(ids).containsExactly(first.getId(), second.getId());
    }

    @Test
    void sortsBySalaryOnlyWhenExplicitlyRequested() {
        when(jobRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        provider.searchIds(null, null, null, null, null, "salary");

        ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
        verify(jobRepository).findAll(any(Specification.class), sortCaptor.capture());
        assertThat(sortCaptor.getValue().getOrderFor("salaryMaxLakhs")).isNotNull();
    }

    @Test
    void fallsBackToRecencyForRelevantAndNewest() {
        when(jobRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        provider.searchIds(null, null, null, null, null, "relevant");

        ArgumentCaptor<Sort> sortCaptor = ArgumentCaptor.forClass(Sort.class);
        verify(jobRepository).findAll(any(Specification.class), sortCaptor.capture());
        assertThat(sortCaptor.getValue().getOrderFor("createdAt")).isNotNull();
    }

    @Test
    void passesTheMinSalaryThroughToTheSpecification() {
        when(jobRepository.findAll(any(Specification.class), any(Sort.class))).thenReturn(List.of());

        provider.searchIds(null, null, null, null, BigDecimal.TEN, "relevant");

        verify(jobRepository).findAll(any(Specification.class), any(Sort.class));
    }
}
