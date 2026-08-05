package com.openopportunity.chat.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/** history is capped independently of ChatService's own truncation (see MAX_HISTORY_TURNS
 * there) — this bound exists so a single oversized request body can't itself be the abuse
 * vector, before ChatService ever gets a chance to trim it down. */
public record ChatRequest(
        @NotBlank @Size(max = 2000) String message, @Valid @Size(max = 40) List<ChatTurn> history) {

    public ChatRequest {
        if (history == null) {
            history = List.of();
        }
    }
}
