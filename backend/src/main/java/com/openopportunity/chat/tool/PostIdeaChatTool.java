package com.openopportunity.chat.tool;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import com.openopportunity.idea.IdeaService;
import com.openopportunity.idea.IdeaStage;
import com.openopportunity.idea.dto.IdeaDetail;
import com.openopportunity.idea.dto.IdeaRequest;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Any logged-in candidate or company account, state-changing — same confirm-before-execute
 * protocol as PostJobChatTool (see its Javadoc). */
@Component
public class PostIdeaChatTool implements ChatTool {

    private final IdeaService ideaService;

    public PostIdeaChatTool(IdeaService ideaService) {
        this.ideaService = ideaService;
    }

    record Input(
            String title,
            String category,
            String stage,
            String problem,
            String solution,
            String targetMarket,
            String funding,
            String equity,
            Integer teamSize,
            String timeline,
            String videoLink,
            String contactEmail,
            Boolean confirmed) {}

    @Override
    public Tool definition() {
        return Tool.builder()
                .name("post_idea")
                .description(
                        "Submit a new business/startup idea for admin approval, on behalf of the logged-in "
                                + "user. First collect every required field from the user in conversation (never "
                                + "invent values), then call this tool with confirmed=false to get a preview back "
                                + "— relay that preview to the user and wait for them to explicitly confirm in "
                                + "their next message before calling this tool again with confirmed=true. Never "
                                + "set confirmed=true unless the user's most recent message clearly confirms this "
                                + "specific idea.")
                .inputSchema(ToolSchemas.schema(
                        Map.ofEntries(
                                Map.entry("title", ToolSchemas.stringProperty("Idea title.")),
                                Map.entry(
                                        "category",
                                        ToolSchemas.stringProperty(
                                                "Idea category, e.g. \"Fintech\", \"Healthcare\".")),
                                Map.entry(
                                        "stage",
                                        ToolSchemas.enumProperty(
                                                "How far along the idea is.",
                                                List.of("CONCEPT", "PROTOTYPE", "LIVE"))),
                                Map.entry(
                                        "problem", ToolSchemas.stringProperty("The problem this idea solves.")),
                                Map.entry(
                                        "solution", ToolSchemas.stringProperty("How the idea solves that problem.")),
                                Map.entry(
                                        "targetMarket", ToolSchemas.stringProperty("Who this idea is aimed at.")),
                                Map.entry(
                                        "funding",
                                        ToolSchemas.stringProperty("Funding sought or raised so far (optional).")),
                                Map.entry(
                                        "equity", ToolSchemas.stringProperty("Equity being offered (optional).")),
                                Map.entry(
                                        "teamSize", ToolSchemas.numberProperty("Current team size (optional).")),
                                Map.entry(
                                        "timeline", ToolSchemas.stringProperty("Expected timeline (optional).")),
                                Map.entry(
                                        "videoLink",
                                        ToolSchemas.stringProperty("A pitch video URL (optional).")),
                                Map.entry(
                                        "contactEmail",
                                        ToolSchemas.stringProperty(
                                                "Contact email for people interested in this idea.")),
                                Map.entry(
                                        "confirmed",
                                        ToolSchemas.booleanProperty(
                                                "Must be true to actually submit the idea; false (or omitted) only "
                                                        + "returns a preview and submits nothing."))),
                        List.of(
                                "title",
                                "category",
                                "stage",
                                "problem",
                                "solution",
                                "targetMarket",
                                "contactEmail",
                                "confirmed")))
                .build();
    }

    @Override
    public boolean isAvailableTo(UUID currentUserId, String currentUserRole) {
        return currentUserId != null && ("CANDIDATE".equals(currentUserRole) || "COMPANY".equals(currentUserRole));
    }

    @Override
    public String execute(UUID currentUserId, JsonValue input) {
        Input parsed = input.convert(Input.class);
        IdeaRequest request = new IdeaRequest(
                parsed.title(),
                parsed.category(),
                parseStage(parsed.stage()),
                parsed.problem(),
                parsed.solution(),
                parsed.targetMarket(),
                parsed.funding(),
                parsed.equity(),
                parsed.teamSize(),
                parsed.timeline(),
                parsed.videoLink(),
                parsed.contactEmail());

        if (!Boolean.TRUE.equals(parsed.confirmed())) {
            return preview(request);
        }

        IdeaDetail created = ideaService.create(currentUserId, request);
        return "Submitted! \"" + created.title() + "\" is now pending admin approval and will be visible in the "
                + "community once approved.";
    }

    private static String preview(IdeaRequest request) {
        StringBuilder preview = new StringBuilder("Ready to submit this idea for admin approval:\n");
        preview.append("- Title: ").append(request.title()).append('\n');
        preview.append("- Category: ").append(request.category()).append('\n');
        preview.append("- Stage: ").append(request.stage()).append('\n');
        preview.append("- Problem: ").append(request.problem()).append('\n');
        preview.append("- Solution: ").append(request.solution()).append('\n');
        preview.append("- Target market: ").append(request.targetMarket()).append('\n');
        preview.append("- Contact email: ").append(request.contactEmail()).append('\n');
        preview.append(
                "\nThis hasn't been submitted yet. Ask the user to confirm, then call post_idea again with "
                        + "confirmed=true to actually submit it.");
        return preview.toString();
    }

    private static IdeaStage parseStage(String stage) {
        try {
            return IdeaStage.valueOf(stage);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new IllegalArgumentException("Invalid stage: " + stage);
        }
    }
}
