package com.openopportunity.chat.tool;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobService;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import com.openopportunity.job.dto.JobDetail;
import com.openopportunity.job.dto.JobRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Company-only, state-changing — unlike the Phase B search tools, this can't just auto-execute
 * on the first call: the model must call it once with confirmed=false (or omitted) to get a
 * preview back, relay that to the user in the chat, and only call it again with confirmed=true
 * after the user's next message clearly confirms. See chat-support-system-prompt.md for the
 * instructions that make the model follow this protocol — this class only enforces the "no
 * confirmed=true means no side effect" half of it; it can't verify the model actually waited for
 * a real user confirmation in between the two calls. Posting always submits for admin approval
 * (JobStatus.PENDING_APPROVAL) — a chat-driven draft save isn't worth the added complexity. */
@Component
public class PostJobChatTool implements ChatTool {

    private final JobService jobService;

    public PostJobChatTool(JobService jobService) {
        this.jobService = jobService;
    }

    record Input(
            String title,
            String employmentType,
            String experienceLevel,
            String workMode,
            String location,
            BigDecimal salaryMinLakhs,
            BigDecimal salaryMaxLakhs,
            String applicationDeadline,
            String aboutRole,
            List<String> responsibilities,
            List<String> requirements,
            List<String> skills,
            Boolean confirmed) {}

    @Override
    public Tool definition() {
        return Tool.builder()
                .name("post_job")
                .description(
                        "Submit a new job posting for admin approval, on behalf of the logged-in company. "
                                + "First collect every required field from the user in conversation (never invent "
                                + "values), then call this tool with confirmed=false to get a preview back — relay "
                                + "that preview to the user and wait for them to explicitly confirm in their next "
                                + "message before calling this tool again with confirmed=true. Never set "
                                + "confirmed=true unless the user's most recent message clearly confirms this "
                                + "specific job posting.")
                .inputSchema(ToolSchemas.schema(
                        Map.ofEntries(
                                Map.entry(
                                        "title",
                                        ToolSchemas.stringProperty("Job title, e.g. \"Senior Backend Engineer\".")),
                                Map.entry(
                                        "employmentType",
                                        ToolSchemas.enumProperty(
                                                "Employment type.",
                                                List.of("FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"))),
                                Map.entry(
                                        "experienceLevel",
                                        ToolSchemas.enumProperty(
                                                "Experience level required.",
                                                List.of("ENTRY_LEVEL", "MID_LEVEL", "SENIOR", "LEADERSHIP"))),
                                Map.entry(
                                        "workMode",
                                        ToolSchemas.enumProperty(
                                                "Work mode.", List.of("REMOTE", "HYBRID", "ON_SITE"))),
                                Map.entry(
                                        "location", ToolSchemas.stringProperty("Job location, e.g. \"Bangalore\".")),
                                Map.entry(
                                        "salaryMinLakhs",
                                        ToolSchemas.numberProperty("Minimum salary in lakhs per year (optional).")),
                                Map.entry(
                                        "salaryMaxLakhs",
                                        ToolSchemas.numberProperty("Maximum salary in lakhs per year (optional).")),
                                Map.entry(
                                        "applicationDeadline",
                                        ToolSchemas.stringProperty(
                                                "Application deadline as an ISO date, e.g. \"2026-09-01\" (optional).")),
                                Map.entry(
                                        "aboutRole",
                                        ToolSchemas.stringProperty("A paragraph describing the role.")),
                                Map.entry(
                                        "responsibilities",
                                        ToolSchemas.stringArrayProperty("List of responsibilities (optional).")),
                                Map.entry(
                                        "requirements",
                                        ToolSchemas.stringArrayProperty("List of requirements (optional).")),
                                Map.entry(
                                        "skills",
                                        ToolSchemas.stringArrayProperty("List of required skills (optional).")),
                                Map.entry(
                                        "confirmed",
                                        ToolSchemas.booleanProperty(
                                                "Must be true to actually submit the posting; false (or omitted) "
                                                        + "only returns a preview and submits nothing."))),
                        List.of(
                                "title",
                                "employmentType",
                                "experienceLevel",
                                "workMode",
                                "location",
                                "aboutRole",
                                "confirmed")))
                .build();
    }

    @Override
    public boolean isAvailableTo(UUID currentUserId, String currentUserRole) {
        return currentUserId != null && "COMPANY".equals(currentUserRole);
    }

    @Override
    public String execute(UUID currentUserId, JsonValue input) {
        Input parsed = input.convert(Input.class);
        JobRequest request = new JobRequest(
                parsed.title(),
                parseEnum(parsed.employmentType(), EmploymentType::valueOf, "employment type"),
                parseEnum(parsed.experienceLevel(), ExperienceLevel::valueOf, "experience level"),
                parseEnum(parsed.workMode(), WorkMode::valueOf, "work mode"),
                parsed.location(),
                parsed.salaryMinLakhs(),
                parsed.salaryMaxLakhs(),
                parseDate(parsed.applicationDeadline()),
                parsed.aboutRole(),
                parsed.responsibilities(),
                parsed.requirements(),
                parsed.skills(),
                JobStatus.PENDING_APPROVAL);

        if (!Boolean.TRUE.equals(parsed.confirmed())) {
            return preview(request);
        }

        JobDetail created = jobService.create(currentUserId, request);
        return "Submitted! \"" + created.title() + "\" is now pending admin approval and will become visible "
                + "on the Careers page once approved.";
    }

    private static String preview(JobRequest request) {
        StringBuilder preview = new StringBuilder("Ready to submit this job for admin approval:\n");
        preview.append("- Title: ").append(request.title()).append('\n');
        preview.append("- Type: ").append(request.employmentType()).append('\n');
        preview.append("- Experience level: ").append(request.experienceLevel()).append('\n');
        preview.append("- Work mode: ").append(request.workMode()).append('\n');
        preview.append("- Location: ").append(request.location()).append('\n');
        if (request.salaryMinLakhs() != null || request.salaryMaxLakhs() != null) {
            preview.append("- Salary: ")
                    .append(request.salaryMinLakhs() != null ? request.salaryMinLakhs() : "?")
                    .append('-')
                    .append(request.salaryMaxLakhs() != null ? request.salaryMaxLakhs() : "?")
                    .append(" LPA\n");
        }
        if (request.applicationDeadline() != null) {
            preview.append("- Application deadline: ").append(request.applicationDeadline()).append('\n');
        }
        preview.append("- About the role: ").append(request.aboutRole()).append('\n');
        preview.append(
                "\nThis hasn't been submitted yet. Ask the user to confirm, then call post_job again with "
                        + "confirmed=true to actually submit it.");
        return preview.toString();
    }

    private static LocalDate parseDate(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return LocalDate.parse(value);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    private interface EnumParser<T extends Enum<T>> {
        T parse(String value);
    }

    private static <T extends Enum<T>> T parseEnum(String value, EnumParser<T> parser, String fieldName) {
        try {
            return parser.parse(value);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new IllegalArgumentException("Invalid " + fieldName + ": " + value);
        }
    }
}
