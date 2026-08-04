package com.openopportunity.seo;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** See SitemapService for what this renders, and SeoSecurityConfig/infra/job-seo.tf for why this
 * exact path is publicly reachable and routed here from the frontend's own domain. */
@RestController
public class SitemapController {

    private final SitemapService sitemapService;

    public SitemapController(SitemapService sitemapService) {
        this.sitemapService = sitemapService;
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public String sitemap() {
        return sitemapService.renderSitemap();
    }
}
