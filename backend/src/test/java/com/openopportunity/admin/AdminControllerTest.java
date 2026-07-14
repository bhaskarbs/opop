package com.openopportunity.admin;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.auth.dto.LoginRequest;
import com.openopportunity.auth.dto.RegisterRequest;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/** Full stack: real HTTP dispatch, real Spring Security filter chain, real Postgres, and the
 * seeded admin account (see AdminSeeder). Rolled back after each test via {@code @Transactional}
 * so runs stay isolated. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.admin.seed-email}")
    private String adminSeedEmail;

    @Value("${app.admin.seed-password}")
    private String adminSeedPassword;

    private String adminToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest(adminSeedEmail, adminSeedPassword, "admin"))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String registerCompany(String email, String companyName) throws Exception {
        RegisterRequest request = new RegisterRequest(
                email,
                "password123",
                companyName,
                "company",
                "Private Limited",
                "U74999KA2021PTC145632",
                "29ABCDE1234F1Z5",
                "ABCDE1234F",
                "Technology",
                "123 Test Street, Bengaluru",
                "Test Signatory");
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String registerCandidate(String email, String fullName) throws Exception {
        RegisterRequest request = new RegisterRequest(
                email, "password123", fullName, "candidate", "9876543210", List.of("React", "TypeScript"));
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("user").get("id").asText();
    }

    private String userIdFromToken(String token) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }

    @Test
    void companyRegistrationAppearsInPendingListAndCanBeVerified() throws Exception {
        registerCompany("pending-review@example.com", "Pending Review Co");
        String admin = adminToken();

        mockMvc.perform(get("/api/admin/companies/pending").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.companyName == 'Pending Review Co')]").exists())
                .andExpect(jsonPath("$[?(@.companyName == 'Pending Review Co')].verificationStatus")
                        .value(org.hamcrest.Matchers.contains("PENDING")));

        String companyToken = registerCompany("verify-me@example.com", "Verify Me Co");
        String companyUserId = userIdFromToken(companyToken);

        mockMvc.perform(post("/api/admin/companies/" + companyUserId + "/verify")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("VERIFIED"));

        mockMvc.perform(get("/api/admin/companies/pending").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.companyName == 'Verify Me Co')]").doesNotExist());
    }

    @Test
    void rejectSetsCompanyVerificationToRejected() throws Exception {
        String companyToken = registerCompany("reject-me@example.com", "Reject Me Co");
        String companyUserId = userIdFromToken(companyToken);
        String admin = adminToken();

        mockMvc.perform(post("/api/admin/companies/" + companyUserId + "/reject")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.verificationStatus").value("REJECTED"));
    }

    @Test
    void nonAdminCannotAccessAdminEndpoints() throws Exception {
        String companyToken = registerCompany("blocked-co@example.com", "Blocked Co");

        mockMvc.perform(get("/api/admin/companies/pending").header("Authorization", "Bearer " + companyToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/users").header("Authorization", "Bearer " + companyToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/admin/users")).andExpect(status().isUnauthorized());
    }

    @Test
    void suspendingAUserBlocksTheirLoginUntilReactivated() throws Exception {
        registerCandidate("suspend-me@example.com", "Suspend Me");
        String admin = adminToken();

        MvcResult usersResult = mockMvc.perform(get("/api/admin/users")
                        .param("q", "suspend-me")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andReturn();
        String userId =
                objectMapper.readTree(usersResult.getResponse().getContentAsString()).get(0).get("id").asText();

        mockMvc.perform(post("/api/admin/users/" + userId + "/suspend").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountStatus").value("SUSPENDED"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("suspend-me@example.com", "password123", "candidate"))))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/admin/users/" + userId + "/reactivate")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountStatus").value("ACTIVE"));

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest("suspend-me@example.com", "password123", "candidate"))))
                .andExpect(status().isOk());
    }

    @Test
    void userListFiltersByRoleAndExcludesAdmins() throws Exception {
        registerCandidate("list-cand@example.com", "List Candidate");
        registerCompany("list-co@example.com", "List Co");
        String admin = adminToken();

        mockMvc.perform(get("/api/admin/users")
                        .param("role", "CANDIDATE")
                        .param("q", "list-cand")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].role").value("CANDIDATE"));

        mockMvc.perform(get("/api/admin/users")
                        .param("q", adminSeedEmail)
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));
    }
}
