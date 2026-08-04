package com.openopportunity.search;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import java.util.List;
import java.util.UUID;
import java.util.stream.StreamSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.elasticsearch.core.ElasticsearchOperations;
import org.springframework.data.elasticsearch.core.query.Query;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("unchecked")
class JobIndexingServiceTest {

    @Mock
    private ElasticsearchOperations elasticsearchOperations;

    @Mock
    private JobRepository jobRepository;

    private JobIndexingService jobIndexingService;

    private static Job activeJob() {
        return new Job(
                UUID.randomUUID(),
                "Acme",
                "Engineer",
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

    @BeforeEach
    void setUp() {
        jobIndexingService = new JobIndexingService(elasticsearchOperations, jobRepository);
    }

    @Test
    void indexSavesTheDocumentDerivedFromTheJob() {
        Job job = activeJob();

        jobIndexingService.index(job);

        verify(elasticsearchOperations)
                .save(argThat((JobDocument doc) ->
                        doc.getId().equals(job.getId().toString()) && doc.getTitle().equals(job.getTitle())));
    }

    @Test
    void deleteRemovesTheDocumentByJobId() {
        UUID jobId = UUID.randomUUID();

        jobIndexingService.delete(jobId);

        verify(elasticsearchOperations).delete(jobId.toString(), JobDocument.class);
    }

    @Test
    void reindexAllSavesEveryJobFromPostgres() {
        Job first = activeJob();
        Job second = activeJob();
        when(jobRepository.findAll()).thenReturn(List.of(first, second));

        jobIndexingService.reindexAll();

        verify(elasticsearchOperations)
                .save(argThat((Iterable<JobDocument> docs) ->
                        StreamSupport.stream(docs.spliterator(), false).count() == 2));
    }

    @Test
    void reindexAllDoesNothingWhenThereAreNoJobs() {
        when(jobRepository.findAll()).thenReturn(List.of());

        jobIndexingService.reindexAll();

        verify(elasticsearchOperations, never()).save((Iterable<JobDocument>) any(Iterable.class));
    }

    @Test
    void countDelegatesToElasticsearchOperations() {
        when(elasticsearchOperations.count(any(Query.class), eq(JobDocument.class))).thenReturn(42L);

        assertThat(jobIndexingService.count()).isEqualTo(42L);
    }
}
