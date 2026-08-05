package com.openopportunity.chat;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.chat.dto.ChatRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** Full stack — real HTTP dispatch, real Spring Security filter chain — same reasoning as
 * AuthControllerTest. Deliberately never sends a request that would reach the real Anthropic
 * API: app.security.chat-rate-limit.max-requests is pinned to 0 here, so a valid request is
 * guaranteed to be rejected by ChatRateLimiter before ChatService ever calls out. That's also
 * exactly what proves the endpoint is reachable with no auth (a 429 from inside the app, not a
 * 401/403 from Spring Security) and doesn't require a real ANTHROPIC_API_KEY to run in CI. */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "app.security.chat-rate-limit.max-requests=0")
class ChatControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void rejectsABlankMessage() throws Exception {
        mockMvc.perform(post("/api/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChatRequest("", null))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void isReachableWithNoAuthAndRateLimitsRatherThanRejectingForAuth() throws Exception {
        mockMvc.perform(post("/api/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ChatRequest("How do I post a job?", null))))
                .andExpect(status().isTooManyRequests());
    }
}
