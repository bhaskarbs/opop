package com.openopportunity.seo;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.Job;
import com.openopportunity.job.JobRepository;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import java.math.BigDecimal;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;

/**
 * Renders a job as a plain, crawlable HTML page (title/meta tags, canonical/hreflang links, and
 * a schema.org JobPosting JSON-LD block — the structured data Google's "Jobs" rich-result
 * surface actually keys off, which a React SPA's client-rendered content never gives a crawler
 * that doesn't execute JS) — see JobSeoController for the route this backs and
 * com.openopportunity.config.SeoSecurityConfig for why that route needs its own, narrower CSP.
 *
 * <p>Only ever reads from JobRepository — this intentionally duplicates none of JobService's
 * write/authorization logic, since this page has no interactive or authenticated behavior at
 * all. Only ACTIVE jobs render; anything else (draft, pending, rejected, closed) 404s rather
 * than getting indexed as a live listing.
 *
 * <p>Every job/company-submitted field (title, company name, location, description text, skills,
 * ...) is company-authored, not OpenOpportunity-authored — each one is HTML-escaped before being
 * placed in the page body, and the JSON-LD block additionally has "&lt;" replaced with its
 * unicode escape after serialization so a value containing a literal "&lt;/script&gt;" can't
 * break out of the script block (the standard mitigation for embedding JSON inside HTML; see
 * e.g. Rails' json_escape or Next.js's docs on dangerouslySetInnerHTML for JSON-LD).
 */
@Service
public class JobSeoService {

    private final JobRepository jobRepository;
    private final ObjectMapper objectMapper;
    private final String frontendBaseUrl;

    public JobSeoService(
            JobRepository jobRepository,
            ObjectMapper objectMapper,
            @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.jobRepository = jobRepository;
        this.objectMapper = objectMapper;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    public Optional<String> renderJobPage(UUID jobId, String lang) {
        return jobRepository
                .findById(jobId)
                .filter(job -> job.getStatus() == JobStatus.ACTIVE)
                .map(job -> render(job, lang));
    }

    private String render(Job job, String lang) {
        String canonicalUrl = frontendBaseUrl + "/" + lang + "/jobs/" + job.getId();
        String pageTitle = HtmlUtils.htmlEscape(job.getTitle() + " at " + job.getCompanyName());
        String metaDescription = HtmlUtils.htmlEscape(excerpt(job.getAboutRole(), 160));
        String jsonLd = buildJsonLd(job, canonicalUrl);

        StringBuilder html = new StringBuilder();
        html.append("<!doctype html>\n");
        html.append("<html lang=\"").append(lang).append("\">\n<head>\n");
        html.append("<meta charset=\"utf-8\">\n");
        html.append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n");
        html.append("<title>").append(pageTitle).append(" | OpenOpportunity</title>\n");
        html.append("<meta name=\"description\" content=\"").append(metaDescription).append("\">\n");
        html.append("<link rel=\"canonical\" href=\"").append(canonicalUrl).append("\">\n");
        for (String altLang : List.of("en", "hi")) {
            html.append("<link rel=\"alternate\" hreflang=\"")
                    .append(altLang)
                    .append("\" href=\"")
                    .append(frontendBaseUrl)
                    .append("/")
                    .append(altLang)
                    .append("/jobs/")
                    .append(job.getId())
                    .append("\">\n");
        }
        html.append("<meta property=\"og:type\" content=\"website\">\n");
        html.append("<meta property=\"og:title\" content=\"").append(pageTitle).append("\">\n");
        html.append("<meta property=\"og:description\" content=\"").append(metaDescription).append("\">\n");
        html.append("<meta property=\"og:url\" content=\"").append(canonicalUrl).append("\">\n");
        html.append("<script type=\"application/ld+json\">").append(jsonLd).append("</script>\n");
        html.append("</head>\n<body>\n");

        html.append("<h1>").append(HtmlUtils.htmlEscape(job.getTitle())).append("</h1>\n");
        html.append("<p>")
                .append(HtmlUtils.htmlEscape(job.getCompanyName()))
                .append(" &mdash; ")
                .append(HtmlUtils.htmlEscape(job.getLocation()))
                .append("</p>\n");
        html.append("<p>")
                .append(HtmlUtils.htmlEscape(humanize(job.getEmploymentType().name())))
                .append(" &middot; ")
                .append(HtmlUtils.htmlEscape(humanize(job.getWorkMode().name())))
                .append(" &middot; ")
                .append(HtmlUtils.htmlEscape(humanize(job.getExperienceLevel().name())))
                .append("</p>\n");
        if (job.getSalaryMinLakhs() != null || job.getSalaryMaxLakhs() != null) {
            html.append("<p>").append(HtmlUtils.htmlEscape(salaryRange(job))).append(" LPA</p>\n");
        }

        html.append("<h2>About the role</h2>\n<p>")
                .append(HtmlUtils.htmlEscape(job.getAboutRole()))
                .append("</p>\n");
        appendList(html, "Responsibilities", job.getResponsibilities());
        appendList(html, "Requirements", job.getRequirements());
        if (!job.getSkills().isEmpty()) {
            html.append("<h2>Skills</h2>\n<p>")
                    .append(HtmlUtils.htmlEscape(String.join(", ", job.getSkills())))
                    .append("</p>\n");
        }

        html.append("<p><a href=\"")
                .append(frontendBaseUrl)
                .append("/")
                .append(lang)
                .append("/jobs\">Browse more jobs on OpenOpportunity</a></p>\n");
        html.append("</body>\n</html>\n");
        return html.toString();
    }

    private void appendList(StringBuilder html, String heading, List<String> items) {
        if (items.isEmpty()) {
            return;
        }
        html.append("<h2>").append(heading).append("</h2>\n<ul>\n");
        for (String item : items) {
            html.append("<li>").append(HtmlUtils.htmlEscape(item)).append("</li>\n");
        }
        html.append("</ul>\n");
    }

    private String buildJsonLd(Job job, String canonicalUrl) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("@context", "https://schema.org/");
        data.put("@type", "JobPosting");
        data.put("title", job.getTitle());
        data.put("description", job.getAboutRole());
        data.put("datePosted", job.getCreatedAt().atZone(ZoneOffset.UTC).toLocalDate().toString());
        data.put("url", canonicalUrl);
        if (job.getApplicationDeadline() != null) {
            data.put("validThrough", job.getApplicationDeadline().toString());
        }
        data.put("employmentType", schemaEmploymentType(job.getEmploymentType()));

        Map<String, Object> hiringOrganization = new LinkedHashMap<>();
        hiringOrganization.put("@type", "Organization");
        hiringOrganization.put("name", job.getCompanyName());
        data.put("hiringOrganization", hiringOrganization);

        if (job.getWorkMode() == WorkMode.REMOTE) {
            data.put("jobLocationType", "TELECOMMUTE");
            // Google requires applicantLocationRequirement whenever jobLocationType is set —
            // this app is India-only (see the LPA/lakhs salary convention throughout), so this
            // is always "IN" rather than something derived per-job.
            Map<String, Object> country = new LinkedHashMap<>();
            country.put("@type", "Country");
            country.put("name", "IN");
            data.put("applicantLocationRequirement", country);
        } else {
            Map<String, Object> address = new LinkedHashMap<>();
            address.put("@type", "PostalAddress");
            address.put("addressLocality", job.getLocation());
            address.put("addressCountry", "IN");
            Map<String, Object> place = new LinkedHashMap<>();
            place.put("@type", "Place");
            place.put("address", address);
            data.put("jobLocation", place);
        }

        if (job.getSalaryMinLakhs() != null || job.getSalaryMaxLakhs() != null) {
            BigDecimal perLakh = BigDecimal.valueOf(100_000);
            Map<String, Object> value = new LinkedHashMap<>();
            value.put("@type", "QuantitativeValue");
            if (job.getSalaryMinLakhs() != null) {
                value.put("minValue", job.getSalaryMinLakhs().multiply(perLakh));
            }
            if (job.getSalaryMaxLakhs() != null) {
                value.put("maxValue", job.getSalaryMaxLakhs().multiply(perLakh));
            }
            value.put("unitText", "YEAR");
            Map<String, Object> baseSalary = new LinkedHashMap<>();
            baseSalary.put("@type", "MonetaryAmount");
            baseSalary.put("currency", "INR");
            baseSalary.put("value", value);
            data.put("baseSalary", baseSalary);
        }

        try {
            // Replacing "<" with its unicode escape (after valid JSON is already produced) is
            // what actually prevents a "</script>" breakout — Jackson's own escaping only
            // guarantees valid JSON string content, which still permits a literal "</script>"
            // substring.
            return objectMapper.writeValueAsString(data).replace("<", "\\u003c");
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize JobPosting JSON-LD", e);
        }
    }

    private static String schemaEmploymentType(EmploymentType type) {
        return switch (type) {
            case FULL_TIME -> "FULL_TIME";
            case PART_TIME -> "PART_TIME";
            case CONTRACT -> "CONTRACTOR";
            case INTERNSHIP -> "INTERN";
        };
    }

    private static String humanize(String enumName) {
        return Arrays.stream(enumName.split("_"))
                .map(w -> w.charAt(0) + w.substring(1).toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(" "));
    }

    private static String salaryRange(Job job) {
        if (job.getSalaryMinLakhs() != null && job.getSalaryMaxLakhs() != null) {
            return job.getSalaryMinLakhs() + " - " + job.getSalaryMaxLakhs();
        }
        BigDecimal only = job.getSalaryMinLakhs() != null ? job.getSalaryMinLakhs() : job.getSalaryMaxLakhs();
        return only.toString();
    }

    private static String excerpt(String text, int maxLength) {
        String singleLine = text.replaceAll("\\s+", " ").trim();
        return singleLine.length() <= maxLength ? singleLine : singleLine.substring(0, maxLength - 1) + "…";
    }
}
