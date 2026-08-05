package com.openopportunity.chat.tool;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import com.openopportunity.auth.CandidateSearchService;
import com.openopportunity.auth.dto.CandidateSearchSummary;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Company-only — see isAvailableTo, which means the model is never even offered this tool for
 * an anonymous visitor or a candidate account, rather than relying on it to correctly refuse an
 * ineligible request after the fact (same reasoning GET /api/candidates/search itself is
 * restricted to ROLE_COMPANY in SecurityConfig). Contact details are deliberately never
 * surfaced here even when already revealed for the requesting company — see
 * CandidateSearchSummary's own Javadoc for why this search view never carries an email, and
 * revealing a phone number through a chat transcript isn't something a search result listing
 * should do implicitly either. */
@Component
public class SearchCandidatesChatTool implements ChatTool {

    private static final int MAX_RESULTS = 5;

    private final CandidateSearchService candidateSearchService;

    public SearchCandidatesChatTool(CandidateSearchService candidateSearchService) {
        this.candidateSearchService = candidateSearchService;
    }

    record Input(String query, List<String> locations) {}

    @Override
    public Tool definition() {
        return Tool.builder()
                .name("search_candidates")
                .description(
                        "Search OpenOpportunity's candidate database. Only usable by a logged-in company "
                                + "account. Use this when the user asks to find or see candidates, e.g. \"find me "
                                + "React developers in Mumbai\".")
                .inputSchema(ToolSchemas.schema(Map.of(
                        "query",
                        ToolSchemas.stringProperty(
                                "Free-text keywords to match against candidate title/skills, e.g. \"React developer\"."),
                        "locations",
                        ToolSchemas.stringArrayProperty("City/location substrings to filter by, e.g. [\"Mumbai\"].")
                )))
                .build();
    }

    @Override
    public boolean isAvailableTo(UUID currentUserId, String currentUserRole) {
        return currentUserId != null && "COMPANY".equals(currentUserRole);
    }

    @Override
    public String execute(UUID currentUserId, JsonValue input) {
        Input parsed = input.convert(Input.class);
        List<CandidateSearchSummary> results = candidateSearchService.search(
                currentUserId, parsed.query(), parsed.locations() == null ? List.of() : parsed.locations(), "relevant");

        if (results.isEmpty()) {
            return "No candidates matched that search.";
        }
        List<CandidateSearchSummary> page = results.size() > MAX_RESULTS ? results.subList(0, MAX_RESULTS) : results;
        StringBuilder summary = new StringBuilder();
        summary.append(results.size())
                .append(" candidate(s) matched. Showing the top ")
                .append(page.size())
                .append(" (contact details are only visible in the app, not here):\n");
        for (CandidateSearchSummary candidate : page) {
            summary.append("- ")
                    .append(candidate.fullName())
                    .append(", ")
                    .append(candidate.title())
                    .append(" — ")
                    .append(candidate.location())
                    .append(", skills: ")
                    .append(String.join(", ", candidate.skills()))
                    .append('\n');
        }
        return summary.toString();
    }
}
