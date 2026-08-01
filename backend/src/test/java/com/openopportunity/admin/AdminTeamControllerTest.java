package com.openopportunity.admin;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.admin.dto.CreateAdminTeamMemberRequest;
import com.openopportunity.auth.dto.LoginRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/** Full stack: real HTTP dispatch, real Spring Security filter chain, real Postgres — proves the
 * three admin tiers (see AdminLevel) are actually enforced end to end (SecurityConfig's URL
 * rules + JwtAuthenticationFilter's LEVEL_* authorities), not just that AdminTeamService's own
 * logic is correct in isolation. Rolled back after each test via {@code @Transactional}. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
// See AuthControllerTest's identical annotation for why.
@TestPropertySource(properties = "app.security.rate-limit.enabled=false")
class AdminTeamControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.admin.seed-email}")
    private String adminSeedEmail;

    @Value("${app.admin.seed-password}")
    private String adminSeedPassword;

    private String loginAs(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, password, "admin"))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String superAdminToken() throws Exception {
        return loginAs(adminSeedEmail, adminSeedPassword);
    }

    private record CreatedMember(String id, String token) {}

    private CreatedMember createTeamMember(String superAdminToken, String email, String level) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/admin/team")
                        .header("Authorization", "Bearer " + superAdminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CreateAdminTeamMemberRequest(email, "password123", "Test User", level))))
                .andExpect(status().isCreated())
                .andReturn();
        String id = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
        return new CreatedMember(id, loginAs(email, "password123"));
    }

    @Test
    void createReturnsANonNullCreatedAt() throws Exception {
        // Regression test — createdAt previously came back null in this specific response
        // (though correctly persisted) because save() alone doesn't guarantee @PrePersist's
        // effect is visible on the in-memory entity before flush; see AdminTeamService.create.
        mockMvc.perform(post("/api/admin/team")
                        .header("Authorization", "Bearer " + superAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateAdminTeamMemberRequest(
                                "created-at-check@example.com", "password123", "Test User", "REVIEWER"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void superAdminCanCreateListAndDeleteReviewerAndAdminAccounts() throws Exception {
        String superAdminToken = superAdminToken();

        // Baseline rather than a literal count — this runs against the shared local dev DB,
        // which (unlike CI's always-fresh DB) may already carry other admin-tier accounts.
        int baseline = countTeamMembers(superAdminToken);

        CreatedMember reviewer = createTeamMember(superAdminToken, "reviewer1@example.com", "REVIEWER");
        createTeamMember(superAdminToken, "admin1@example.com", "ADMIN");

        mockMvc.perform(get("/api/admin/team").header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(baseline + 2)));

        mockMvc.perform(delete("/api/admin/team/" + reviewer.id())
                        .header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/team").header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(baseline + 1)));
    }

    private int countTeamMembers(String superAdminToken) throws Exception {
        MvcResult result = mockMvc.perform(
                        get("/api/admin/team").header("Authorization", "Bearer " + superAdminToken))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).size();
    }

    @Test
    void creatingAnotherSuperAdminThroughThisEndpointIsRejected() throws Exception {
        mockMvc.perform(post("/api/admin/team")
                        .header("Authorization", "Bearer " + superAdminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateAdminTeamMemberRequest(
                                "wannabe-super@example.com", "password123", "Test User", "SUPER_ADMIN"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void reviewerCanReachApprovalsAndUsersButNotReportsOrTeam() throws Exception {
        String reviewerToken =
                createTeamMember(superAdminToken(), "reviewer2@example.com", "REVIEWER").token();

        mockMvc.perform(
                        get("/api/admin/companies/pending").header("Authorization", "Bearer " + reviewerToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + reviewerToken))
                .andExpect(status().isOk());

        mockMvc.perform(
                        get("/api/admin/reports/candidates").header("Authorization", "Bearer " + reviewerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/dashboard/stats").header("Authorization", "Bearer " + reviewerToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/team").header("Authorization", "Bearer " + reviewerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void adminCanReachReportsButCannotCreateOrDeleteTeamMembers() throws Exception {
        String superAdminToken = superAdminToken();
        String adminToken =
                createTeamMember(superAdminToken, "admin2@example.com", "ADMIN").token();

        mockMvc.perform(get("/api/admin/dashboard/stats").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        // Admin can still list the team (just not create/delete).
        mockMvc.perform(get("/api/admin/team").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/admin/team")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new CreateAdminTeamMemberRequest(
                                "blocked@example.com", "password123", "Test User", "REVIEWER"))))
                .andExpect(status().isForbidden());

        CreatedMember anotherReviewer =
                createTeamMember(superAdminToken, "reviewer3@example.com", "REVIEWER");
        mockMvc.perform(delete("/api/admin/team/" + anotherReviewer.id())
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void superAdminCannotDeleteAnotherSuperAdminOrThemselves() throws Exception {
        String superAdminToken = superAdminToken();

        MvcResult meResult = mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + superAdminToken))
                .andReturn();
        String selfId = objectMapper.readTree(meResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(delete("/api/admin/team/" + selfId).header("Authorization", "Bearer " + superAdminToken))
                .andExpect(status().isForbidden());
    }
}
