package com.openopportunity.mockinterview.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import java.util.UUID;

/** Admin listing of a recorded session (AdminMockInterviewsPage) — same shape as
 * MockInterviewSessionSummary (candidate-facing, no candidate identity in it at all), plus who
 * recorded it, since an admin browsing every session needs that where a candidate looking at
 * their own list doesn't. */
public record AdminMockInterviewSessionSummary(
        UUID candidateId, String candidateName, String candidateEmail, @JsonUnwrapped MockInterviewSessionSummary summary) {}
