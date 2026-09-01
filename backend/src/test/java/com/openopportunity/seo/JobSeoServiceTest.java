package com.openopportunity.seo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class JobSeoServiceTest {

    @Mock
    private JobRepository jobRepository;

    private JobSeoService jobSeoService;

    @BeforeEach
    void setUp() {
        jobSeoService = new JobSeoService(jobRepository, new ObjectMapper(), "http://localhost:5173", true);
    }

    private static Job job(
            String title,
            String companyName,
            String aboutRole,
            WorkMode workMode,
            BigDecimal minLakhs,
            BigDecimal maxLakhs,
            JobStatus status) {
        Job job = new Job(
                UUID.randomUUID(),
                companyName,
                title,
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                workMode,
                List.of("Bengaluru"),
                minLakhs,
                maxLakhs,
                null,
                aboutRole,
                List.of("Ship features"),
                List.of("5+ years experience"),
                List.of("Java", "React"),
                status);
        ReflectionTestUtils.setField(job, "createdAt", Instant.parse("2026-01-15T00:00:00Z"));
        return job;
    }

    @Test
    void rendersActiveJobWithEscapedFieldsAndJsonLd() {
        UUID jobId = UUID.randomUUID();
        Job job = job(
                "Senior Engineer",
                "<Acme> & Co",
                "Build things.",
                WorkMode.ON_SITE,
                BigDecimal.valueOf(10),
                BigDecimal.valueOf(15),
                JobStatus.ACTIVE);
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));

        String html = jobSeoService.renderJobPage(jobId, "en").orElseThrow();

        assertThat(html).contains("<h1>Senior Engineer</h1>");
        // "<Acme> & Co" must come out HTML-escaped, never as raw markup.
        assertThat(html).contains("&lt;Acme&gt; &amp; Co");
        assertThat(html).doesNotContain("<Acme>");
        assertThat(html)
                .contains("<link rel=\"canonical\" href=\"http://localhost:5173/en/jobs/" + job.getId() + "\">");
        assertThat(html).contains("\"@type\":\"JobPosting\"");
        assertThat(html).contains("\"employmentType\":\"FULL_TIME\"");
        assertThat(html).contains("\"minValue\":1000000");
        assertThat(html).contains("\"maxValue\":1500000");
        assertThat(html).contains("\"addressLocality\":\"Bengaluru\"");
    }

    @Test
    void emitsOnePlacePerLocationForAMultiLocationJob() {
        UUID jobId = UUID.randomUUID();
        Job job = new Job(
                UUID.randomUUID(),
                "Acme",
                "Senior Engineer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.ON_SITE,
                List.of("Bengaluru", "Mumbai"),
                null,
                null,
                null,
                "Build things.",
                List.of("Ship features"),
                List.of("5+ years experience"),
                List.of("Java", "React"),
                JobStatus.ACTIVE);
        ReflectionTestUtils.setField(job, "createdAt", Instant.parse("2026-01-15T00:00:00Z"));
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));

        String html = jobSeoService.renderJobPage(jobId, "en").orElseThrow();

        // A single-location job emits jobLocation as one Place object (see the test above); a
        // multi-location job must emit an array of them instead, per schema.org/Google's own
        // guidance for a job posted to more than one place.
        assertThat(html).contains("\"jobLocation\":[");
        assertThat(html).contains("\"addressLocality\":\"Bengaluru\"");
        assertThat(html).contains("\"addressLocality\":\"Mumbai\"");
    }

    @Test
    void marksRemoteJobsAsTelecommuteInsteadOfAPhysicalLocation() {
        UUID jobId = UUID.randomUUID();
        Job job = job(
                "Remote Engineer", "Acme", "Build things.", WorkMode.REMOTE, null, null, JobStatus.ACTIVE);
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));

        String html = jobSeoService.renderJobPage(jobId, "en").orElseThrow();

        assertThat(html).contains("\"jobLocationType\":\"TELECOMMUTE\"");
        assertThat(html).contains("\"applicantLocationRequirement\"");
        assertThat(html).doesNotContain("\"jobLocation\"");
    }

    @Test
    void aJsonLdValueContainingAScriptCloseTagCannotBreakOutOfTheScriptBlock() {
        UUID jobId = UUID.randomUUID();
        Job job = job(
                "Engineer",
                "Acme",
                "Nice role</script><script>alert(1)</script>",
                WorkMode.ON_SITE,
                null,
                null,
                JobStatus.ACTIVE);
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));

        String html = jobSeoService.renderJobPage(jobId, "en").orElseThrow();

        assertThat(html).doesNotContain("</script><script>alert(1)</script>");
    }

    @Test
    void returnsEmptyForAJobThatIsNotActive() {
        UUID jobId = UUID.randomUUID();
        Job job = job("Draft Role", "Acme", "TBD", WorkMode.ON_SITE, null, null, JobStatus.PENDING_APPROVAL);
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));

        assertThat(jobSeoService.renderJobPage(jobId, "en")).isEmpty();
    }

    @Test
    void returnsEmptyForAnUnknownJobId() {
        UUID jobId = UUID.randomUUID();
        when(jobRepository.findById(jobId)).thenReturn(Optional.empty());

        assertThat(jobSeoService.renderJobPage(jobId, "en")).isEmpty();
    }

    // Belt-and-suspenders alongside RobotsController's site-wide Disallow — see
    // app.seo.crawling-enabled's doc comment in application.properties.
    @Test
    void addsANoindexMetaTagWhenCrawlingIsDisabled() {
        JobSeoService disabled = new JobSeoService(jobRepository, new ObjectMapper(), "http://localhost:5173", false);
        UUID jobId = UUID.randomUUID();
        Job job = job("Engineer", "Acme", "Build things.", WorkMode.ON_SITE, null, null, JobStatus.ACTIVE);
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));

        String html = disabled.renderJobPage(jobId, "en").orElseThrow();

        assertThat(html).contains("<meta name=\"robots\" content=\"noindex, nofollow\">");
    }

    @Test
    void omitsTheNoindexMetaTagWhenCrawlingIsEnabled() {
        UUID jobId = UUID.randomUUID();
        Job job = job("Engineer", "Acme", "Build things.", WorkMode.ON_SITE, null, null, JobStatus.ACTIVE);
        when(jobRepository.findById(jobId)).thenReturn(Optional.of(job));

        String html = jobSeoService.renderJobPage(jobId, "en").orElseThrow();

        assertThat(html).doesNotContain("name=\"robots\"");
    }
}
