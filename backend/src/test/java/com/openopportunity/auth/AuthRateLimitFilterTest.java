package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthRateLimitFilterTest {

    private static MockHttpServletRequest requestTo(String uri, String remoteAddr) {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", uri);
        request.setRemoteAddr(remoteAddr);
        return request;
    }

    @Test
    void allowsRequestsUpToTheLimitThenBlocks() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(true, 2, 5, new ObjectMapper().findAndRegisterModules());

        for (int i = 0; i < 2; i++) {
            MockHttpServletResponse response = new MockHttpServletResponse();
            MockFilterChain chain = new MockFilterChain();
            filter.doFilter(requestTo("/api/auth/login", "10.0.0.1"), response, chain);
            assertThat(chain.getRequest()).isNotNull();
            assertThat(response.getStatus()).isEqualTo(200);
        }

        MockHttpServletResponse blockedResponse = new MockHttpServletResponse();
        MockFilterChain blockedChain = new MockFilterChain();
        filter.doFilter(requestTo("/api/auth/login", "10.0.0.1"), blockedResponse, blockedChain);

        assertThat(blockedChain.getRequest()).isNull();
        assertThat(blockedResponse.getStatus()).isEqualTo(429);
        assertThat(blockedResponse.getHeader("Retry-After")).isEqualTo("300");
        assertThat(blockedResponse.getContentType()).isEqualTo("application/json");
        assertThat(blockedResponse.getContentAsString()).contains("Too many attempts");
    }

    @Test
    void tracksEachClientIndependently() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(true, 1, 5, new ObjectMapper().findAndRegisterModules());

        MockFilterChain firstClientChain = new MockFilterChain();
        filter.doFilter(
                requestTo("/api/auth/login", "10.0.0.1"), new MockHttpServletResponse(), firstClientChain);
        assertThat(firstClientChain.getRequest()).isNotNull();

        MockFilterChain secondClientChain = new MockFilterChain();
        filter.doFilter(
                requestTo("/api/auth/login", "10.0.0.2"), new MockHttpServletResponse(), secondClientChain);
        assertThat(secondClientChain.getRequest()).isNotNull();
    }

    @Test
    void onlyAppliesToTheListedAuthPaths() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(true, 1, 5, new ObjectMapper().findAndRegisterModules());
        filter.doFilter(
                requestTo("/api/auth/login", "10.0.0.1"), new MockHttpServletResponse(), new MockFilterChain());

        MockFilterChain unrelatedChain = new MockFilterChain();
        filter.doFilter(
                requestTo("/api/jobs", "10.0.0.1"), new MockHttpServletResponse(), unrelatedChain);

        assertThat(unrelatedChain.getRequest()).isNotNull();
    }

    @Test
    void doesNothingWhenDisabled() throws Exception {
        AuthRateLimitFilter filter = new AuthRateLimitFilter(false, 1, 5, new ObjectMapper().findAndRegisterModules());
        filter.doFilter(
                requestTo("/api/auth/login", "10.0.0.1"), new MockHttpServletResponse(), new MockFilterChain());

        MockFilterChain secondChain = new MockFilterChain();
        filter.doFilter(
                requestTo("/api/auth/login", "10.0.0.1"), new MockHttpServletResponse(), secondChain);

        assertThat(secondChain.getRequest()).isNotNull();
    }
}
