package com.openopportunity.chat.tool;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import java.util.UUID;

/** One action the chat assistant can take on the caller's behalf (see ChatService's tool-use
 * loop). Phase B's search_jobs/search_candidates are read-only and always auto-execute. Phase
 * C's state-changing tools (post_job, apply_to_job, post_idea, express_interest_in_idea) share a
 * confirm-before-execute convention instead: each takes a {@code confirmed} input field, returns
 * a plain-text preview with no side effect when it's not true, and only performs the real action
 * when the model calls it again with confirmed=true — see PostJobChatTool's Javadoc for the full
 * protocol. This interface doesn't need to know about that distinction; it's entirely encoded in
 * each tool's own execute() and its Tool definition's description/schema.
 *
 * <p>Every implementation is a Spring bean, auto-collected by ChatService — adding a new tool
 * later is just adding a new {@code @Component} here, no changes to ChatService itself. */
public interface ChatTool {

    /** The Anthropic tool definition (name, description, JSON input schema) offered to the
     * model — see ToolSchemas for building the input schema concisely. */
    Tool definition();

    /** Whether this tool should even be offered to the model for this caller — e.g.
     * search_candidates only offers itself to a logged-in company, rather than relying on the
     * model to correctly refuse an ineligible request after the fact. currentUserRole is one of
     * "CANDIDATE"/"COMPANY"/"ADMIN", or null for an anonymous caller. */
    boolean isAvailableTo(UUID currentUserId, String currentUserRole);

    /** Executes with the model-supplied input (validated/converted from the tool call's raw
     * JSON) and returns the result as a compact string for the model to read back — never raw
     * DTOs; each implementation decides what's actually useful for the model to see. */
    String execute(UUID currentUserId, JsonValue input);
}
