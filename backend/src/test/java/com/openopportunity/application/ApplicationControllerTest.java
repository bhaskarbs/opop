package com.openopportunity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.auth.dto.LoginRequest;
import com.openopportunity.auth.dto.RegisterRequest;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.WorkMode;
import com.openopportunity.job.dto.JobRequest;
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

/** Full stack: real HTTP dispatch, real Spring Security filter chain, real Postgres — including
 * the applicant-count side effect on the jobs table. Rolled back after each test via
 * {@code @Transactional} so runs stay isolated. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ApplicationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.admin.seed-email}")
    private String adminSeedEmail;

    @Value("${app.admin.seed-password}")
    private String adminSeedPassword;

    /** The seeded admin account (see AdminSeeder) exists by the time any test runs — it's
     * created once when the Spring context starts, outside any per-test transaction. */
    private String adminToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest(adminSeedEmail, adminSeedPassword))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String registerAndGetToken(String email, String fullName, String role) throws Exception {
        // Company profile fields are required for role=company, mobile/skills for
        // role=candidate, and both are ignored for whichever role doesn't apply — so it's
        // simplest to always supply all of them here.
        RegisterRequest request = new RegisterRequest(
                email,
                "password123",
                fullName,
                role,
                "Private Limited",
                "U74999KA2021PTC145632",
                "29ABCDE1234F1Z5",
                "ABCDE1234F",
                "Technology",
                "123 Test Street, Bengaluru",
                "Test Signatory",
                "9876543210",
                List.of("React", "TypeScript"),
                null);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    /** Creates a job as PENDING_APPROVAL and immediately has the seeded admin approve it —
     * companies can no longer set ACTIVE directly (see JobService#requireClientSettableStatus). */
    private String createActiveJob(String companyToken) throws Exception {
        JobRequest request = new JobRequest(
                "Senior Frontend Developer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.HYBRID,
                "Bengaluru",
                null,
                null,
                null,
                "About the role.",
                List.of("Ship features"),
                List.of("Some experience"),
                List.of("React"),
                com.openopportunity.job.JobStatus.PENDING_APPROVAL);
        MvcResult result = mockMvc.perform(post("/api/jobs")
                        .header("Authorization", "Bearer " + companyToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        String jobId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(post("/api/jobs/" + jobId + "/approve").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk());
        return jobId;
    }

    private String applyToJob(String candidateToken, String jobId) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + candidateToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jobId\":\"" + jobId + "\"}"))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }

    private int applicantCountOf(String jobId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/jobs/" + jobId)).andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("applicantCount").asInt();
    }

    @Test
    void candidateCanApplyAndWithdraw() throws Exception {
        String companyToken = registerAndGetToken("apply-co@example.com", "Apply Co", "company");
        String candidateToken = registerAndGetToken("apply-cand@example.com", "Apply Candidate", "candidate");
        String jobId = createActiveJob(companyToken);

        assertThat(applicantCountOf(jobId)).isZero();

        String applicationId = applyToJob(candidateToken, jobId);
        assertThat(applicantCountOf(jobId)).isEqualTo(1);

        mockMvc.perform(get("/api/applications/mine").header("Authorization", "Bearer " + candidateToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("APPLIED"))
                .andExpect(jsonPath("$[0].jobTitle").value("Senior Frontend Developer"));

        mockMvc.perform(post("/api/applications/" + applicationId + "/withdraw")
                        .header("Authorization", "Bearer " + candidateToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WITHDRAWN"));

        assertThat(applicantCountOf(jobId)).isZero();
    }

    @Test
    void applyingTwiceToTheSameJobIsRejected() throws Exception {
        String companyToken = registerAndGetToken("dup-co@example.com", "Dup Co", "company");
        String candidateToken = registerAndGetToken("dup-cand@example.com", "Dup Candidate", "candidate");
        String jobId = createActiveJob(companyToken);

        applyToJob(candidateToken, jobId);

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + candidateToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jobId\":\"" + jobId + "\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void applyRequiresCandidateRole() throws Exception {
        String companyToken = registerAndGetToken("role-co@example.com", "Role Co", "company");
        String jobId = createActiveJob(companyToken);

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + companyToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jobId\":\"" + jobId + "\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/applications")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jobId\":\"" + jobId + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void onlyTheApplicantCanWithdrawTheirOwnApplication() throws Exception {
        String companyToken = registerAndGetToken("owner-app-co@example.com", "Owner App Co", "company");
        String candidateToken =
                registerAndGetToken("owner-app-cand@example.com", "Owner App Candidate", "candidate");
        String otherCandidateToken =
                registerAndGetToken("other-app-cand@example.com", "Other App Candidate", "candidate");
        String jobId = createActiveJob(companyToken);
        String applicationId = applyToJob(candidateToken, jobId);

        mockMvc.perform(post("/api/applications/" + applicationId + "/withdraw")
                        .header("Authorization", "Bearer " + otherCandidateToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void onlyTheOwningCompanyCanUpdateStatusOrViewApplicantsForAJob() throws Exception {
        String ownerCompanyToken = registerAndGetToken("status-owner@example.com", "Status Owner Co", "company");
        String otherCompanyToken = registerAndGetToken("status-other@example.com", "Status Other Co", "company");
        String candidateToken = registerAndGetToken("status-cand@example.com", "Status Candidate", "candidate");
        String jobId = createActiveJob(ownerCompanyToken);
        String applicationId = applyToJob(candidateToken, jobId);

        mockMvc.perform(patch("/api/applications/" + applicationId + "/status")
                        .header("Authorization", "Bearer " + otherCompanyToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"UNDER_REVIEW\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/api/applications/job/" + jobId).header("Authorization", "Bearer " + otherCompanyToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(patch("/api/applications/" + applicationId + "/status")
                        .header("Authorization", "Bearer " + ownerCompanyToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"UNDER_REVIEW\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNDER_REVIEW"));

        mockMvc.perform(get("/api/applications/job/" + jobId).header("Authorization", "Bearer " + ownerCompanyToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].status").value("UNDER_REVIEW"));
    }

    @Test
    void cannotApplyToADraftJob() throws Exception {
        String companyToken = registerAndGetToken("draft-co@example.com", "Draft Co", "company");
        String candidateToken = registerAndGetToken("draft-cand@example.com", "Draft Candidate", "candidate");

        JobRequest draftRequest = new JobRequest(
                "Draft Role",
                EmploymentType.FULL_TIME,
                ExperienceLevel.MID_LEVEL,
                WorkMode.REMOTE,
                "Remote",
                null,
                null,
                null,
                "desc",
                List.of(),
                List.of(),
                List.of(),
                com.openopportunity.job.JobStatus.DRAFT);
        MvcResult result = mockMvc.perform(post("/api/jobs")
                        .header("Authorization", "Bearer " + companyToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(draftRequest)))
                .andExpect(status().isCreated())
                .andReturn();
        String draftJobId = objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(post("/api/applications")
                        .header("Authorization", "Bearer " + candidateToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jobId\":\"" + draftJobId + "\"}"))
                .andExpect(status().isNotFound());
    }
}
