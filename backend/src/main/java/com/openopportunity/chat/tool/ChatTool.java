package com.openopportunity.chat.tool;

import com.anthropic.core.JsonValue;
import com.anthropic.models.messages.Tool;
import java.util.UUID;

/** One action the chat assistant can take on the caller's behalf (see ChatService's tool-use
 * loop). Phase B: read-only, always auto-executed, no confirmation step — search_jobs and
 * search_candidates below don't change any state. Phase C's state-changing tools (post a job,
 * apply, post/express-interest-in an idea) are expected to need a confirmation turn before
 * ChatService actually calls execute(), which this interface doesn't model yet.
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
