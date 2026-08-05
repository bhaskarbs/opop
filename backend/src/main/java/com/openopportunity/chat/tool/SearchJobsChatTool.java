package com.openopportunity.chat.tool;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobService;
import com.openopportunity.job.WorkMode;
import com.openopportunity.job.dto.JobSummary;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Public — search_jobs is offered to every caller, signed in or not, same as GET /api/jobs
 * itself (see SecurityConfig). Wraps JobService.search directly; the only thing this adds is
 * translating the model's JSON input into that method's real parameters and shrinking the
 * result down to what's worth spending response tokens on. */
@Component
public class SearchJobsChatTool implements ChatTool {

    // A chat reply summarizing 5 jobs is already a lot of text — JobService.search's own
    // ranking (featured/promoted first, see its Javadoc) means the first page is also the most
    // relevant one to show regardless.
    private static final int MAX_RESULTS = 5;

    private final JobService jobService;
    private final String frontendBaseUrl;

    public SearchJobsChatTool(JobService jobService, @Value("${app.frontend.base-url}") String frontendBaseUrl) {
        this.jobService = jobService;
        this.frontendBaseUrl = frontendBaseUrl;
    }

    record Input(
            List<String> keywords,
            List<String> locations,
            List<String> experienceLevels,
            List<String> workModes,
            BigDecimal minSalaryLakhs) {}

    @Override
    public Tool definition() {
        return Tool.builder()
                .name("search_jobs")
                .description(
                        "Search OpenOpportunity's public job listings. Use this whenever the user asks to find, "
                                + "see, or search for jobs — e.g. \"find me remote React jobs in Bangalore\" or "
                                + "\"what backend jobs pay at least 15 lakhs\". All parameters are optional; omit "
                                + "any the user didn't specify.")
                .inputSchema(ToolSchemas.schema(Map.of(
                        "keywords",
                        ToolSchemas.stringArrayProperty(
                                "Free-text keywords to match against job title, company name, or skills, e.g. [\"React\", \"backend\"]."),
                        "locations",
                        ToolSchemas.stringArrayProperty("City/location substrings to filter by, e.g. [\"Bangalore\"]."),
                        "experienceLevels",
                        ToolSchemas.enumArrayProperty(
                                "Experience levels to filter by.",
                                List.of("ENTRY_LEVEL", "MID_LEVEL", "SENIOR", "LEADERSHIP")),
                        "workModes",
                        ToolSchemas.enumArrayProperty(
                                "Work modes to filter by.", List.of("REMOTE", "HYBRID", "ON_SITE")),
                        "minSalaryLakhs",
                        ToolSchemas.numberProperty("Minimum salary in lakhs per year (1 lakh = 100,000 INR)."))))
                .build();
    }

    @Override
    public boolean isAvailableTo(UUID currentUserId, String currentUserRole) {
        return true;
    }

    @Override
    public String execute(UUID currentUserId, JsonValue input) {
        Input parsed = input.convert(Input.class);
        List<ExperienceLevel> levels = parseEnumList(parsed.experienceLevels(), ExperienceLevel::valueOf);
        List<WorkMode> modes = parseEnumList(parsed.workModes(), WorkMode::valueOf);

        var result = jobService.search(
                parsed.keywords(), parsed.locations(), levels, modes, parsed.minSalaryLakhs(), "relevant", 0, MAX_RESULTS);

        if (result.totalCount() == 0) {
            return "No jobs matched that search.";
        }
        StringBuilder summary = new StringBuilder();
        summary.append(result.totalCount()).append(" job(s) matched. Showing the top ").append(result.jobs().size()).append(":\n");
        for (JobSummary job : result.jobs()) {
            summary.append("- \"")
                    .append(job.title())
                    .append("\" at ")
                    .append(job.companyName())
                    .append(" — ")
                    .append(job.location())
                    .append(", ")
                    .append(job.workMode())
                    .append(", ")
                    .append(job.experienceLevel());
            if (job.salaryMinLakhs() != null || job.salaryMaxLakhs() != null) {
                summary.append(", ").append(salaryRange(job)).append(" LPA");
            }
            summary.append(" — ").append(frontendBaseUrl).append("/en/jobs/").append(job.id()).append('\n');
        }
        return summary.toString();
    }

    private static String salaryRange(JobSummary job) {
        if (job.salaryMinLakhs() != null && job.salaryMaxLakhs() != null) {
            return job.salaryMinLakhs() + "-" + job.salaryMaxLakhs();
        }
        return job.salaryMinLakhs() != null ? job.salaryMinLakhs().toString() : job.salaryMaxLakhs().toString();
    }

    private interface EnumParser<T extends Enum<T>> {
        T parse(String value);
    }

    /** Silently drops any value the model sent that doesn't match the enum — the schema already
     * constrains it to the allowed values, so this only ever matters if the model hallucinates
     * something outside that set, and failing the whole search over one bad value would be
     * worse than just ignoring it. */
    private static <T extends Enum<T>> List<T> parseEnumList(List<String> values, EnumParser<T> parser) {
        if (values == null) {
            return List.of();
        }
        return values.stream()
                .map(value -> {
                    try {
                        return parser.parse(value);
                    } catch (IllegalArgumentException ex) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }
}
