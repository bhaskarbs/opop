package com.openopportunity.seo;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SitemapServiceTest {

    @Mock
    private JobRepository jobRepository;

    private SitemapService sitemapService;

    @BeforeEach
    void setUp() {
        sitemapService = new SitemapService(jobRepository, "http://localhost:5173", true);
    }

    private static Job activeJob() {
        Job job = new Job(
                UUID.randomUUID(),
                "Acme",
                "Engineer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.ON_SITE,
                List.of("Bengaluru"),
                null,
                null,
                null,
                "desc",
                List.of(),
                List.of(),
                List.of(),
                JobStatus.ACTIVE);
        ReflectionTestUtils.setField(job, "updatedAt", Instant.parse("2026-02-01T00:00:00Z"));
        return job;
    }

    @Test
    void listsEveryActiveJobOnceForEachSupportedLanguageWithHreflangAlternates() {
        Job job = activeJob();
        when(jobRepository.findByStatus(JobStatus.ACTIVE)).thenReturn(List.of(job));

        String xml = sitemapService.renderSitemap();

        assertThat(xml).contains("<loc>http://localhost:5173/en/jobs/" + job.getId() + "</loc>");
        assertThat(xml).contains("<loc>http://localhost:5173/hi/jobs/" + job.getId() + "</loc>");
        assertThat(xml).contains("<lastmod>2026-02-01</lastmod>");
        assertThat(xml)
                .contains(
                        "<xhtml:link rel=\"alternate\" hreflang=\"hi\" href=\"http://localhost:5173/hi/jobs/"
                                + job.getId() + "\"/>");
        assertThat(xml.split("<url>", -1)).hasSize(3); // 1 (before first <url>) + one per language
    }

    @Test
    void omitsJobsThatAreNotActive() {
        when(jobRepository.findByStatus(JobStatus.ACTIVE)).thenReturn(List.of());

        String xml = sitemapService.renderSitemap();

        assertThat(xml).doesNotContain("<url>");
        assertThat(xml).contains("<urlset");
    }

    // Belt-and-suspenders alongside RobotsController's site-wide Disallow — see
    // app.seo.crawling-enabled's doc comment in application.properties.
    @Test
    void rendersAnEmptySitemapWhenCrawlingIsDisabledEvenWithActiveJobs() {
        SitemapService disabled = new SitemapService(jobRepository, "http://localhost:5173", false);
        // Not stubbing jobRepository.findByStatus at all — asserting the disabled path never
        // even queries for active jobs, not just that it drops them from the output afterward.

        String xml = disabled.renderSitemap();

        assertThat(xml).doesNotContain("<url>");
        assertThat(xml).contains("<urlset");
    }
}
