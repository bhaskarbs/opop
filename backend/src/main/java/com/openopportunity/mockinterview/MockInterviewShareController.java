package com.openopportunity.mockinterview;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Fully public — see SecurityConfig's permitAll rule for "/api/mock-interview-shares/**".
 * Nothing here requires a login; the share token itself (an unguessable value, see
 * MockInterviewService#generateShareToken) is what gates access. Range-aware streaming mirrors
 * SharedVideoController exactly, so a plain {@code <video>} tag can scrub/seek without
 * downloading the whole file first. */
@RestController
@RequestMapping("/api/mock-interview-shares")
public class MockInterviewShareController {

    private final MockInterviewShareAccessService shareAccessService;

    public MockInterviewShareController(MockInterviewShareAccessService shareAccessService) {
        this.shareAccessService = shareAccessService;
    }

    @GetMapping("/{token}/video")
    public ResponseEntity<ResourceRegion> video(
            @PathVariable String token, @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader) {
        MockInterviewShareAccessService.LoadedSharedSession loaded = shareAccessService.loadVideo(token);
        Resource resource = loaded.resource();
        long contentLength;
        try {
            contentLength = resource.contentLength();
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to read shared mock interview video length", ex);
        }
        MediaType mediaType = MediaType.parseMediaType(loaded.contentType());

        if (rangeHeader == null) {
            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                    .body(new ResourceRegion(resource, 0, contentLength));
        }
        List<HttpRange> ranges = HttpRange.parseRanges(rangeHeader);
        // Browsers only ever ask for one range for video playback in practice — take the first
        // and ignore the rest rather than building true multipart/byteranges support for a case
        // that doesn't come up.
        ResourceRegion region = ranges.isEmpty()
                ? new ResourceRegion(resource, 0, contentLength)
                : ranges.get(0).toResourceRegion(resource);
        return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT)
                .contentType(mediaType)
                .header(HttpHeaders.ACCEPT_RANGES, "bytes")
                .body(region);
    }
}
