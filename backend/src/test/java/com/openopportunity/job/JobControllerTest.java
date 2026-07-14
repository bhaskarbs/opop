package com.openopportunity.job;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.auth.dto.LoginRequest;
import com.openopportunity.auth.dto.RegisterRequest;
import com.openopportunity.job.dto.JobRequest;
import java.math.BigDecimal;
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
 * the actual SQL search/filter predicates, not mocked repository behavior. Rolled back after
 * each test via {@code @Transactional} so runs stay isolated. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class JobControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.admin.seed-email}")
    private String adminSeedEmail;

    @Value("${app.admin.seed-password}")
    private String adminSeedPassword;

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

    /** The seeded admin account (see AdminSeeder) exists by the time any test runs — it's
     * created once when the Spring context starts, outside any per-test transaction. */
    private String adminToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest(adminSeedEmail, adminSeedPassword, "admin"))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private void approveJob(String adminToken, String jobId) throws Exception {
        mockMvc.perform(post("/api/jobs/" + jobId + "/approve").header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }

    private JobRequest jobRequest(String title, ExperienceLevel level, WorkMode mode, String location,
            BigDecimal minSalary, BigDecimal maxSalary, List<String> skills, JobStatus status) {
        return new JobRequest(
                title,
                EmploymentType.FULL_TIME,
                level,
                mode,
                location,
                minSalary,
                maxSalary,
                null,
                "About the role.",
                List.of("Ship features"),
                List.of("Some years of experience"),
                skills,
                status);
    }

    private MvcResult createJob(String token, JobRequest request) throws Exception {
        return mockMvc.perform(post("/api/jobs")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
    }

    /** Creates a job as PENDING_APPROVAL and immediately has the seeded admin approve it —
     * the shortest path to a real, publicly-visible ACTIVE job now that companies can no
     * longer set that status directly. */
    private String createAndApproveJob(String companyToken, JobRequest pendingRequest) throws Exception {
        String jobId = idOf(createJob(companyToken, pendingRequest));
        approveJob(adminToken(), jobId);
        return jobId;
    }

    private String idOf(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
    }

    @Test
    void createRequiresCompanyRole() throws Exception {
        String candidateToken = registerAndGetToken("candidate-jobs@example.com", "A Candidate", "candidate");
        JobRequest request = jobRequest(
                "Blocked Job", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of("React"), JobStatus.PENDING_APPROVAL);

        mockMvc.perform(post("/api/jobs")
                        .header("Authorization", "Bearer " + candidateToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/jobs")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void createRejectsClientSuppliedActiveOrRejectedStatus() throws Exception {
        String companyToken = registerAndGetToken("status-guard-co@example.com", "Status Guard Co", "company");

        mockMvc.perform(post("/api/jobs")
                        .header("Authorization", "Bearer " + companyToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(jobRequest(
                                "Sneaky Active Job", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                                null, null, List.of(), JobStatus.ACTIVE))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/jobs")
                        .header("Authorization", "Bearer " + companyToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(jobRequest(
                                "Sneaky Rejected Job", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                                null, null, List.of(), JobStatus.REJECTED))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void searchFiltersByKeywordLocationLevelModeAndSalary() throws Exception {
        String companyToken = registerAndGetToken("search-co@example.com", "Search Co", "company");

        createAndApproveJob(companyToken, jobRequest(
                "Senior Frontend Developer", ExperienceLevel.SENIOR, WorkMode.HYBRID, "Bengaluru",
                BigDecimal.valueOf(18), BigDecimal.valueOf(24), List.of("React", "TypeScript"),
                JobStatus.PENDING_APPROVAL));
        createAndApproveJob(companyToken, jobRequest(
                "Junior Data Analyst", ExperienceLevel.ENTRY_LEVEL, WorkMode.ON_SITE, "Mumbai",
                BigDecimal.valueOf(5), BigDecimal.valueOf(8), List.of("SQL", "Excel"), JobStatus.PENDING_APPROVAL));
        createJob(companyToken, jobRequest(
                "Draft Role", ExperienceLevel.SENIOR, WorkMode.HYBRID, "Bengaluru",
                BigDecimal.valueOf(30), BigDecimal.valueOf(40), List.of("React"), JobStatus.DRAFT));

        // draft jobs never show up in public search
        mockMvc.perform(get("/api/jobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title").value(org.hamcrest.Matchers.not(
                        org.hamcrest.Matchers.hasItem("Draft Role"))));

        // keyword matches a skill, not just the title
        mockMvc.perform(get("/api/jobs").param("q", "typescript"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Senior Frontend Developer"));

        // location filter
        mockMvc.perform(get("/api/jobs").param("location", "Mumbai"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Junior Data Analyst"));

        // level + mode filters combine
        mockMvc.perform(get("/api/jobs").param("level", "SENIOR").param("mode", "HYBRID"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Senior Frontend Developer"));

        // salary floor excludes the lower-paying job
        mockMvc.perform(get("/api/jobs").param("minSalaryLakhs", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Senior Frontend Developer"));
    }

    @Test
    void detailReturns404ForDraftPendingOrMissingJobButOkOnceApproved() throws Exception {
        String companyToken = registerAndGetToken("detail-co@example.com", "Detail Co", "company");
        MvcResult draftResult = createJob(companyToken, jobRequest(
                "Draft Role", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.DRAFT));
        String draftId = idOf(draftResult);

        mockMvc.perform(get("/api/jobs/" + draftId)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/jobs/" + java.util.UUID.randomUUID())).andExpect(status().isNotFound());

        MvcResult pendingResult = createJob(companyToken, jobRequest(
                "Not Yet Approved Role", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.PENDING_APPROVAL));
        String pendingId = idOf(pendingResult);
        mockMvc.perform(get("/api/jobs/" + pendingId)).andExpect(status().isNotFound());

        approveJob(adminToken(), pendingId);
        mockMvc.perform(get("/api/jobs/" + pendingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Not Yet Approved Role"));
    }

    @Test
    void onlyAdminCanApproveOrRejectAJob() throws Exception {
        String companyToken = registerAndGetToken("approve-guard-co@example.com", "Approve Guard Co", "company");
        String otherCompanyToken =
                registerAndGetToken("approve-guard-other@example.com", "Approve Guard Other", "company");
        String jobId = idOf(createJob(companyToken, jobRequest(
                "Needs Approval", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.PENDING_APPROVAL)));

        mockMvc.perform(post("/api/jobs/" + jobId + "/approve")
                        .header("Authorization", "Bearer " + otherCompanyToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/jobs/" + jobId + "/approve"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/jobs/" + jobId + "/approve").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void pendingListShowsOnlyPendingApprovalJobs() throws Exception {
        String companyToken = registerAndGetToken("pending-list-co@example.com", "Pending List Co", "company");
        createAndApproveJob(companyToken, jobRequest(
                "Already Active", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.PENDING_APPROVAL));
        createJob(companyToken, jobRequest(
                "Awaiting Review", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.PENDING_APPROVAL));
        createJob(companyToken, jobRequest(
                "Still A Draft", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.DRAFT));

        mockMvc.perform(get("/api/jobs/pending").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("Awaiting Review"));

        mockMvc.perform(get("/api/jobs/pending").header("Authorization", "Bearer " + companyToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void rejectSetsStatusToRejected() throws Exception {
        String companyToken = registerAndGetToken("reject-co@example.com", "Reject Co", "company");
        String jobId = idOf(createJob(companyToken, jobRequest(
                "Rejected Candidate Role", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.PENDING_APPROVAL)));

        mockMvc.perform(post("/api/jobs/" + jobId + "/reject").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        mockMvc.perform(get("/api/jobs/" + jobId)).andExpect(status().isNotFound());
    }

    @Test
    void onlyOwningCompanyCanUpdateOrDeleteAJob() throws Exception {
        String ownerToken = registerAndGetToken("owner-co@example.com", "Owner Co", "company");
        String otherToken = registerAndGetToken("other-co@example.com", "Other Co", "company");

        MvcResult created = createJob(ownerToken, jobRequest(
                "Owned Role", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.PENDING_APPROVAL));
        String jobId = idOf(created);

        JobRequest updateAttempt = jobRequest(
                "Hijacked Title", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.PENDING_APPROVAL);

        mockMvc.perform(put("/api/jobs/" + jobId)
                        .header("Authorization", "Bearer " + otherToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateAttempt)))
                .andExpect(status().isForbidden());

        mockMvc.perform(delete("/api/jobs/" + jobId).header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(put("/api/jobs/" + jobId)
                        .header("Authorization", "Bearer " + ownerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateAttempt)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Hijacked Title"));

        mockMvc.perform(delete("/api/jobs/" + jobId).header("Authorization", "Bearer " + ownerToken))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/jobs/" + jobId)).andExpect(status().isNotFound());
    }

    @Test
    void mineReturnsOnlyTheCallersOwnPostingsIncludingDrafts() throws Exception {
        String companyAToken = registerAndGetToken("mine-a@example.com", "Company A", "company");
        String companyBToken = registerAndGetToken("mine-b@example.com", "Company B", "company");

        createJob(companyAToken, jobRequest(
                "A Pending", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.PENDING_APPROVAL));
        createJob(companyAToken, jobRequest(
                "A Draft", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.DRAFT));
        createJob(companyBToken, jobRequest(
                "B Pending", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of(), JobStatus.PENDING_APPROVAL));

        mockMvc.perform(get("/api/jobs/mine").header("Authorization", "Bearer " + companyAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[*].title").value(org.hamcrest.Matchers.containsInAnyOrder(
                        "A Pending", "A Draft")));

        mockMvc.perform(get("/api/jobs/mine")).andExpect(status().isUnauthorized());
    }

    @Test
    void createDefaultsApplicantCountToZeroAndStampsCompanyName() throws Exception {
        String companyToken = registerAndGetToken("stamp-co@example.com", "Stamp Co", "company");
        MvcResult result = createJob(companyToken, jobRequest(
                "Stamped Role", ExperienceLevel.MID_LEVEL, WorkMode.REMOTE, "Remote",
                null, null, List.of("React"), JobStatus.PENDING_APPROVAL));

        var json = objectMapper.readTree(result.getResponse().getContentAsString());
        assertThat(json.get("companyName").asText()).isEqualTo("Stamp Co");
        assertThat(json.get("applicantCount").asInt()).isZero();
    }
}
