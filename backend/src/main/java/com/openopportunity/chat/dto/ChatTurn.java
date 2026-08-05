package com.openopportunity.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** One prior turn of the conversation, as the frontend already has it — Phase A keeps no
 * server-side chat history (see ChatService), so the client sends the running conversation back
 * on every request. role is constrained to exactly what the Claude API itself accepts as a
 * message role. */
public record ChatTurn(@NotBlank @Pattern(regexp = "user|assistant") String role, @NotBlank String content) {}
