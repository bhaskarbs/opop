package com.openopportunity.chat.tool;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import com.openopportunity.application.ApplicationService;
import com.openopportunity.application.dto.ApplicationSummary;
import com.openopportunity.job.JobService;
import com.openopportunity.job.dto.JobDetail;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Candidate-only, state-changing — same confirm-before-execute protocol as PostJobChatTool (see
 * its Javadoc). jobId is expected to come from a prior search_jobs result (its summary lines
 * include each job's id via its detail link) rather than the model guessing one. */
@Component
public class ApplyToJobChatTool implements ChatTool {

    private final ApplicationService applicationService;
    private final JobService jobService;

    public ApplyToJobChatTool(ApplicationService applicationService, JobService jobService) {
        this.applicationService = applicationService;
        this.jobService = jobService;
    }

    record Input(String jobId, Boolean confirmed) {}

    @Override
    public Tool definition() {
        return Tool.builder()
                .name("apply_to_job")
                .description(
                        "Apply to a job on behalf of the logged-in candidate. jobId must be a real job id "
                                + "(usually found via a prior search_jobs call). First call with confirmed=false "
                                + "to get a preview of which job this would apply to, relay that to the user, and "
                                + "only call again with confirmed=true after the user's next message clearly "
                                + "confirms applying to that specific job.")
                .inputSchema(ToolSchemas.schema(
                        Map.of(
                                "jobId", ToolSchemas.stringProperty("The id of the job to apply to."),
                                "confirmed",
                                ToolSchemas.booleanProperty(
                                        "Must be true to actually submit the application; false (or omitted) "
                                                + "only returns a preview and applies to nothing.")),
                        List.of("jobId", "confirmed")))
                .build();
    }

    @Override
    public boolean isAvailableTo(UUID currentUserId, String currentUserRole) {
        return currentUserId != null && "CANDIDATE".equals(currentUserRole);
    }

    @Override
    public String execute(UUID currentUserId, JsonValue input) {
        Input parsed = input.convert(Input.class);
        UUID jobId = parseJobId(parsed.jobId());
        JobDetail job = jobService.get(jobId, currentUserId);

        if (!Boolean.TRUE.equals(parsed.confirmed())) {
            return "Ready to apply to \"" + job.title() + "\" at " + job.companyName() + " ("
                    + String.join(", ", job.locations())
                    + "). This hasn't been submitted yet. Ask the user to confirm, then call apply_to_job again "
                    + "with confirmed=true to actually apply.";
        }

        ApplicationSummary application = applicationService.apply(currentUserId, jobId);
        return "Applied! Your application to \"" + application.jobTitle() + "\" at " + application.companyName()
                + " has been submitted — track its status from My Applications.";
    }

    private static UUID parseJobId(String jobId) {
        try {
            return UUID.fromString(jobId);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new IllegalArgumentException("\"" + jobId + "\" is not a valid job id.");
        }
    }
}
