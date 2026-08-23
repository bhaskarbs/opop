package com.openopportunity.seo;

import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Generates {@code /sitemap.xml} for every currently-ACTIVE job, so crawlers can discover job
 * URLs directly rather than relying on the SPA's client-rendered listing pages (which, same as
 * the job pages themselves — see JobSeoService — a non-JS crawler never sees). Always built live
 * from JobRepository on each request, same "no regeneration step, never stale" reasoning as the
 * job pages.
 *
 * <p>One {@code <url>} entry per job per supported language (matching
 * SUPPORTED_LANGUAGES in frontend/src/i18n/index.ts), each cross-linked to its other-language
 * counterpart via {@code xhtml:link rel="alternate"} — Google's documented pattern for
 * multilingual sitemaps.
 *
 * <p>A single sitemap file is capped at 50,000 URLs by the sitemap protocol itself — comfortably
 * enough headroom for this app's current scale (twice the ACTIVE job count), but a real
 * multi-file sitemap index would be needed well before that ceiling.
 *
 * <p>Renders an empty (but still valid) {@code <urlset>} while app.seo.crawling-enabled is
 * false, rather than listing every job URL for a crawler that ignores robots.txt's Disallow —
 * see RobotsController/JobSeoService for the rest of that same kill switch.
 */
@Service
public class SitemapService {

    private static final DateTimeFormatter LASTMOD_FORMAT =
            DateTimeFormatter.ofPattern("yyyy-MM-dd").withZone(ZoneOffset.UTC);
    private static final List<String> SUPPORTED_LANGUAGES = List.of("en", "hi");

    private final JobRepository jobRepository;
    private final String frontendBaseUrl;
    private final boolean crawlingEnabled;

    public SitemapService(
            JobRepository jobRepository,
            @Value("${app.frontend.base-url}") String frontendBaseUrl,
            @Value("${app.seo.crawling-enabled}") boolean crawlingEnabled) {
        this.jobRepository = jobRepository;
        this.frontendBaseUrl = frontendBaseUrl;
        this.crawlingEnabled = crawlingEnabled;
    }

    public String renderSitemap() {
        List<Job> activeJobs = crawlingEnabled ? jobRepository.findByStatus(JobStatus.ACTIVE) : List.of();

        StringBuilder xml = new StringBuilder();
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" ")
                .append("xmlns:xhtml=\"http://www.w3.org/1999/xhtml\">\n");

        for (Job job : activeJobs) {
            String lastmod = LASTMOD_FORMAT.format(job.getUpdatedAt());
            for (String lang : SUPPORTED_LANGUAGES) {
                xml.append("<url>\n");
                xml.append("<loc>").append(jobUrl(lang, job)).append("</loc>\n");
                xml.append("<lastmod>").append(lastmod).append("</lastmod>\n");
                for (String altLang : SUPPORTED_LANGUAGES) {
                    xml.append("<xhtml:link rel=\"alternate\" hreflang=\"")
                            .append(altLang)
                            .append("\" href=\"")
                            .append(jobUrl(altLang, job))
                            .append("\"/>\n");
                }
                xml.append("</url>\n");
            }
        }

        xml.append("</urlset>\n");
        return xml.toString();
    }

    private String jobUrl(String lang, Job job) {
        return frontendBaseUrl + "/" + lang + "/jobs/" + job.getId();
    }
}
