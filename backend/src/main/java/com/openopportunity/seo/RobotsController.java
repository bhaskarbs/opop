package com.openopportunity.seo;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** Nothing on the frontend's public domain needs disallowing — every authenticated area
 * (candidate/company/admin dashboards) is a client-side-routed SPA page with no content until
 * after login, not a crawlable server-rendered URL, so there's no separate section to carve out
 * here the way a traditional server-rendered app would. The one thing worth stating explicitly
 * is where the sitemap lives (see SitemapController) — the crawler discovery mechanism this
 * whole com.openopportunity.seo package exists to feed. Backend-rendered (rather than a static
 * frontend/public/robots.txt) so the Sitemap: line can be a real absolute URL built from
 * app.frontend.base-url instead of a hardcoded, environment-specific guess.
 *
 * <p>app.seo.crawling-enabled is the site-wide kill switch (see JobSeoService for the
 * complementary per-page noindex it drives) — false disallows every path for every user-agent,
 * so a compliant crawler stops requesting anything at all rather than relying on each page to
 * separately opt out. */
@RestController
public class RobotsController {

    private final String frontendBaseUrl;
    private final boolean crawlingEnabled;

    public RobotsController(
            @Value("${app.frontend.base-url}") String frontendBaseUrl,
            @Value("${app.seo.crawling-enabled}") boolean crawlingEnabled) {
        this.frontendBaseUrl = frontendBaseUrl;
        this.crawlingEnabled = crawlingEnabled;
    }

    @GetMapping(value = "/robots.txt", produces = MediaType.TEXT_PLAIN_VALUE)
    public String robots() {
        if (!crawlingEnabled) {
            return "User-agent: *\nDisallow: /\n";
        }
        return "User-agent: *\nAllow: /\n\nSitemap: " + frontendBaseUrl + "/sitemap.xml\n";
    }
}
