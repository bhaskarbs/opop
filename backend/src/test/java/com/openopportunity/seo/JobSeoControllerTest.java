package com.openopportunity.seo;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.auth.dto.LoginRequest;
import com.openopportunity.auth.dto.RegisterRequest;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import com.openopportunity.job.dto.JobRequest;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
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

/** Full stack — real HTTP dispatch through both SecurityFilterChains (see SeoSecurityConfig) and
 * real Postgres, same reasoning as JobControllerTest. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "app.security.rate-limit.enabled=false")
class JobSeoControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Value("${app.admin.seed-email}")
    private String adminSeedEmail;

    @Value("${app.admin.seed-password}")
    private String adminSeedPassword;

    private String registerCompanyAndGetToken(String email) throws Exception {
        RegisterRequest request = new RegisterRequest(
                email,
                "password123",
                "A Company",
                "company",
                "Private Limited",
                "U74999KA2021PTC145632",
                "29ABCDE1234F1Z5",
                "ABCDE1234F",
                "Technology",
                "123 Test Street, Bengaluru",
                "Test Signatory",
                "9876543210",
                null,
                "9876543210",
                List.of("React", "TypeScript"),
                null);
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        var body = objectMapper.readTree(result.getResponse().getContentAsString());
        String companyUserId = body.get("user").get("id").asText();
        mockMvc.perform(post("/api/admin/companies/" + companyUserId + "/verify")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk());
        return body.get("accessToken").asText();
    }

    private String adminToken() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new LoginRequest(adminSeedEmail, adminSeedPassword, "admin"))))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private String createAndApproveJob(String companyToken) throws Exception {
        JobRequest request = new JobRequest(
                "Senior Backend Engineer",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.REMOTE,
                List.of("Remote"),
                BigDecimal.valueOf(10),
                BigDecimal.valueOf(15),
                null,
                null,
                null,
                "Build and ship backend services.",
                List.of("Ship features"),
                List.of("5+ years experience"),
                List.of("Java", "Spring"),
                JobStatus.PENDING_APPROVAL);
        MvcResult createResult = mockMvc.perform(post("/api/jobs")
                        .header("Authorization", "Bearer " + companyToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        String jobId =
                objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();
        mockMvc.perform(post("/api/jobs/" + jobId + "/approve").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk());
        return jobId;
    }

    @Test
    void servesServerRenderedHtmlForAnActiveJobWithNoAuthRequired() throws Exception {
        String companyToken = registerCompanyAndGetToken("seo-company@example.com");
        String jobId = createAndApproveJob(companyToken);

        mockMvc.perform(get("/en/jobs/" + jobId))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_HTML))
                .andExpect(header().string("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Senior Backend Engineer")))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("\"@type\":\"JobPosting\"")));
    }

    @Test
    void returnsNotFoundForAnUnknownJobId() throws Exception {
        mockMvc.perform(get("/en/jobs/" + UUID.randomUUID())).andExpect(status().isNotFound());
    }

    @Test
    void returnsNotFoundForAJobThatIsNotYetApproved() throws Exception {
        String companyToken = registerCompanyAndGetToken("seo-company-pending@example.com");
        JobRequest request = new JobRequest(
                "Pending Role",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.REMOTE,
                List.of("Remote"),
                null,
                null,
                null,
                null,
                null,
                "TBD",
                List.of(),
                List.of(),
                List.of(),
                JobStatus.PENDING_APPROVAL);
        MvcResult createResult = mockMvc.perform(post("/api/jobs")
                        .header("Authorization", "Bearer " + companyToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        String jobId =
                objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asText();

        mockMvc.perform(get("/en/jobs/" + jobId)).andExpect(status().isNotFound());
    }
}
