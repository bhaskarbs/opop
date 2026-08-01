package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class AuthOriginCheckFilterTest {

    private static final String[] ALLOWED_ORIGINS = {"http://localhost:5173"};

    private static MockHttpServletRequest postTo(String uri) {
        return new MockHttpServletRequest("POST", uri);
    }

    @Test
    void allowsARequestFromTheConfiguredOrigin() throws Exception {
        AuthOriginCheckFilter filter = new AuthOriginCheckFilter(ALLOWED_ORIGINS);
        MockHttpServletRequest request = postTo("/api/auth/refresh");
        request.addHeader("Origin", "http://localhost:5173");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void fallsBackToRefererWhenOriginIsMissing() throws Exception {
        AuthOriginCheckFilter filter = new AuthOriginCheckFilter(ALLOWED_ORIGINS);
        MockHttpServletRequest request = postTo("/api/auth/logout");
        request.addHeader("Referer", "http://localhost:5173/candidate/dashboard");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(chain.getRequest()).isNotNull();
    }

    @Test
    void rejectsARequestFromAnUnlistedOrigin() throws Exception {
        AuthOriginCheckFilter filter = new AuthOriginCheckFilter(ALLOWED_ORIGINS);
        MockHttpServletRequest request = postTo("/api/auth/refresh");
        request.addHeader("Origin", "https://attacker.example");
        MockHttpServletResponse response = new MockHttpServletResponse();
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(request, response, chain);

        assertThat(chain.getRequest()).isNull();
        assertThat(response.getStatus()).isEqualTo(403);
    }

    @Test
    void rejectsARequestWithNeitherOriginNorReferer() throws Exception {
        AuthOriginCheckFilter filter = new AuthOriginCheckFilter(ALLOWED_ORIGINS);
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(postTo("/api/auth/refresh"), new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNull();
    }

    @Test
    void doesNotApplyToPathsOutsideTheProtectedSet() throws Exception {
        AuthOriginCheckFilter filter = new AuthOriginCheckFilter(ALLOWED_ORIGINS);
        MockFilterChain chain = new MockFilterChain();

        filter.doFilter(postTo("/api/auth/login"), new MockHttpServletResponse(), chain);

        assertThat(chain.getRequest()).isNotNull();
    }
}
