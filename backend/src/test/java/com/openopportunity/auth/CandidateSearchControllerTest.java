package com.openopportunity.auth;

import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.openopportunity.auth.dto.RegisterRequest;
import com.openopportunity.auth.dto.UpdatePersonalDetailsRequest;
import com.openopportunity.job.ExperienceLevel;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

/** Full stack: real HTTP dispatch, real Postgres — including the actual SQL predicates built by
 * CandidateProfileSpecifications (the array_to_string skills match and the correlated EXISTS
 * subquery against User for the full-name match), not mocked repository behavior. Mockito can't
 * catch a broken Postgres function call or subquery correlation; only a real DB round-trip can.
 * Rolled back after each test via {@code @Transactional} so runs stay isolated.
 *
 * <p>Every distinguishing value (name/title/skill/location) embeds a random per-test tag rather
 * than a plausible-sounding real one — the shared local dev DB this runs against can carry
 * leftover candidates from unrelated manual testing (e.g. real "Priya Sharma"-style names), and
 * a search term that could coincidentally match one of those would make this flaky for reasons
 * that have nothing to do with whether CandidateProfileSpecifications itself is correct. */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@TestPropertySource(properties = "app.security.rate-limit.enabled=false")
class CandidateSearchControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String registerCompanyAndGetToken(String email) throws Exception {
        RegisterRequest request = new RegisterRequest(
                email,
                "password123",
                "Search Co",
                "company",
                "Private Limited",
                "U74999KA2021PTC145632",
                "29ABCDE1234F1Z5",
                "ABCDE1234F",
                "Technology",
                "123 Test Street, Bengaluru",
                "Test Signatory",
                "9876543210");
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }

    /** Registers a candidate and fills in title/location — neither is collected at
     * registration (see UpdatePersonalDetailsRequest), so this needs a follow-up PATCH. */
    private void registerCandidate(
            String email, String fullName, List<String> skills, String title, String location) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegisterRequest(email, "password123", fullName, "candidate", "9876500000", skills))))
                .andExpect(status().isCreated())
                .andReturn();
        String token = objectMapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();

        mockMvc.perform(patch("/api/candidate/profile/personal")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdatePersonalDetailsRequest(
                                fullName,
                                location,
                                title,
                                "9876500000",
                                ExperienceLevel.SENIOR,
                                "Technology",
                                null,
                                null,
                                null,
                                null,
                                List.of()))))
                .andExpect(status().isOk());
    }

    private static String uniqueTag() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    @Test
    void searchMatchesByFullNameTitleAndSkillsAtTheDatabaseLevel() throws Exception {
        String tag = uniqueTag();
        String companyToken = registerCompanyAndGetToken("db-search-co-" + tag + "@example.com");
        String candidateAName = "Zoradyne" + tag + " Kestrelworth";
        registerCandidate(
                "candidate-a-" + tag + "@example.com",
                candidateAName,
                List.of("Reactquilibrium" + tag, "Node.js"),
                "Senior Backendfluxion" + tag + " Engineer",
                "Bengaluru, India");
        registerCandidate(
                "candidate-b-" + tag + "@example.com",
                "Vantrembeau" + tag + " Oscarion",
                List.of("Java", "Spring"),
                "DevOps Engineer",
                "Mumbai, India");

        // Matches by full name only.
        mockMvc.perform(get("/api/company/candidates")
                        .header("Authorization", "Bearer " + companyToken)
                        .param("q", "Zoradyne" + tag))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].fullName").value(candidateAName));

        // Matches by title only.
        mockMvc.perform(get("/api/company/candidates")
                        .header("Authorization", "Bearer " + companyToken)
                        .param("q", "Backendfluxion" + tag))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].fullName").value(candidateAName));

        // Matches by skill only — exercises the array_to_string(skills, ',') predicate.
        mockMvc.perform(get("/api/company/candidates")
                        .header("Authorization", "Bearer " + companyToken)
                        .param("q", "Reactquilibrium" + tag))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].fullName").value(candidateAName));

        // No match for either candidate.
        mockMvc.perform(get("/api/company/candidates")
                        .header("Authorization", "Bearer " + companyToken)
                        .param("q", "nomatch" + tag))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$", hasSize(0)));
    }

    @Test
    void searchMatchesByLocationAtTheDatabaseLevel() throws Exception {
        String tag = uniqueTag();
        String companyToken = registerCompanyAndGetToken("db-search-loc-co-" + tag + "@example.com");
        String candidateAName = "Thornevale" + tag + " Achterbrook";
        registerCandidate(
                "candidate-c-" + tag + "@example.com",
                candidateAName,
                List.of("Python"),
                "Data Scientist",
                "Bengaluru" + tag + ", India");
        registerCandidate(
                "candidate-d-" + tag + "@example.com",
                "Winsloe" + tag + " Fairhaugh",
                List.of("Go"),
                "SRE",
                "Mumbai, India");

        mockMvc.perform(get("/api/company/candidates")
                        .header("Authorization", "Bearer " + companyToken)
                        .param("location", "Bengaluru" + tag))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].fullName").value(candidateAName));
    }
}
