package com.openopportunity.seo;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RobotsControllerTest {

    @Test
    void allowsEverythingAndAdvertisesTheSitemapWhenCrawlingIsEnabled() {
        RobotsController controller = new RobotsController("http://localhost:5173", true);

        String robotsTxt = controller.robots();

        assertThat(robotsTxt).contains("Allow: /");
        assertThat(robotsTxt).contains("Sitemap: http://localhost:5173/sitemap.xml");
        assertThat(robotsTxt).doesNotContain("Disallow");
    }

    // The site-wide kill switch — see app.seo.crawling-enabled's doc comment in
    // application.properties, and JobSeoService/SitemapService for the rest of it.
    @Test
    void disallowsEverythingAndOmitsTheSitemapWhenCrawlingIsDisabled() {
        RobotsController controller = new RobotsController("http://localhost:5173", false);

        String robotsTxt = controller.robots();

        assertThat(robotsTxt).contains("Disallow: /");
        assertThat(robotsTxt).doesNotContain("Sitemap:");
    }
}
