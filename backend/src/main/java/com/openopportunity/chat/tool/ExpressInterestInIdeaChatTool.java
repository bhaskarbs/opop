package com.openopportunity.chat.tool;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import com.openopportunity.idea.IdeaInterestRole;
import com.openopportunity.idea.IdeaService;
import com.openopportunity.idea.dto.IdeaDetail;
import com.openopportunity.idea.dto.IdeaInterestRequest;
import com.openopportunity.idea.dto.IdeaInterestSummary;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Any logged-in candidate or company account, state-changing — same confirm-before-execute
 * protocol as PostJobChatTool (see its Javadoc). ideaId is expected to come from browsing ideas
 * in the app (there's no idea-search chat tool yet) or from the user directly naming/pasting one
 * they already found. */
@Component
public class ExpressInterestInIdeaChatTool implements ChatTool {

    private final IdeaService ideaService;

    public ExpressInterestInIdeaChatTool(IdeaService ideaService) {
        this.ideaService = ideaService;
    }

    record Input(String ideaId, String role, String ticketSize, String message, Boolean confirmed) {}

    @Override
    public Tool definition() {
        return Tool.builder()
                .name("express_interest_in_idea")
                .description(
                        "Express interest in a community idea on behalf of the logged-in user, as an investor "
                                + "or participant. ideaId must be a real idea id the user already knows (from "
                                + "browsing the app). First call with confirmed=false to get a preview, relay it "
                                + "to the user, and only call again with confirmed=true after the user's next "
                                + "message clearly confirms.")
                .inputSchema(ToolSchemas.schema(
                        Map.of(
                                "ideaId", ToolSchemas.stringProperty("The id of the idea to express interest in."),
                                "role",
                                ToolSchemas.enumProperty(
                                        "The role the user is interested in taking.",
                                        List.of("INVESTOR", "PARTICIPANT")),
                                "ticketSize",
                                ToolSchemas.stringProperty("Investment ticket size, if role is INVESTOR (optional)."),
                                "message", ToolSchemas.stringProperty("An optional message to the idea's submitter."),
                                "confirmed",
                                ToolSchemas.booleanProperty(
                                        "Must be true to actually submit the interest; false (or omitted) only "
                                                + "returns a preview and submits nothing.")),
                        List.of("ideaId", "role", "confirmed")))
                .build();
    }

    @Override
    public boolean isAvailableTo(UUID currentUserId, String currentUserRole) {
        return currentUserId != null && ("CANDIDATE".equals(currentUserRole) || "COMPANY".equals(currentUserRole));
    }

    @Override
    public String execute(UUID currentUserId, JsonValue input) {
        Input parsed = input.convert(Input.class);
        UUID ideaId = parseIdeaId(parsed.ideaId());
        IdeaInterestRole role = parseRole(parsed.role());
        IdeaDetail idea = ideaService.get(ideaId, currentUserId);

        if (!Boolean.TRUE.equals(parsed.confirmed())) {
            return "Ready to express interest in \"" + idea.title() + "\" as a " + role + ". This hasn't been "
                    + "submitted yet. Ask the user to confirm, then call express_interest_in_idea again with "
                    + "confirmed=true to actually submit it.";
        }

        IdeaInterestSummary interest =
                ideaService.submitInterest(ideaId, currentUserId, new IdeaInterestRequest(role, parsed.ticketSize(), parsed.message()));
        return "Submitted! Your interest in \"" + idea.title() + "\" as a " + interest.role()
                + " has been sent to the submitter.";
    }

    private static UUID parseIdeaId(String ideaId) {
        try {
            return UUID.fromString(ideaId);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new IllegalArgumentException("\"" + ideaId + "\" is not a valid idea id.");
        }
    }

    private static IdeaInterestRole parseRole(String role) {
        try {
            return IdeaInterestRole.valueOf(role);
        } catch (IllegalArgumentException | NullPointerException ex) {
            throw new IllegalArgumentException("Invalid role: " + role);
        }
    }
}
