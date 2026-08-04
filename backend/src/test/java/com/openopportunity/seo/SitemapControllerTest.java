package com.openopportunity.seo;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.auth.dto.LoginRequest;
import com.openopportunity.auth.dto.RegisterRequest;
import com.openopportunity.job.EmploymentType;
import com.openopportunity.job.ExperienceLevel;
import com.openopportunity.job.JobStatus;
import com.openopportunity.job.WorkMode;
import com.openopportunity.job.dto.JobRequest;
import java.util.List;
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

/** Full stack, same reasoning as JobSeoControllerTest. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "app.security.rate-limit.enabled=false")
class SitemapControllerTest {

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

    private String createAndApproveJob(String companyToken) throws Exception {
        JobRequest request = new JobRequest(
                "Sitemap Test Role",
                EmploymentType.FULL_TIME,
                ExperienceLevel.SENIOR,
                WorkMode.REMOTE,
                "Remote",
                null,
                null,
                null,
                "Build things.",
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
        mockMvc.perform(post("/api/jobs/" + jobId + "/approve").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk());
        return jobId;
    }

    @Test
    void listsActiveJobsInBothLanguagesWithNoAuthRequired() throws Exception {
        String companyToken = registerCompanyAndGetToken("sitemap-company@example.com");
        String jobId = createAndApproveJob(companyToken);

        mockMvc.perform(get("/sitemap.xml"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_XML))
                .andExpect(content().string(containsString("<loc>http://localhost:5173/en/jobs/" + jobId + "</loc>")))
                .andExpect(
                        content().string(containsString("<loc>http://localhost:5173/hi/jobs/" + jobId + "</loc>")));
    }

    @Test
    void robotsTxtPointsAtTheSitemap() throws Exception {
        mockMvc.perform(get("/robots.txt"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andExpect(content().string(containsString("Sitemap: http://localhost:5173/sitemap.xml")));
    }
}
