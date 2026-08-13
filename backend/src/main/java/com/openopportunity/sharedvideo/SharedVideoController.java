package com.openopportunity.sharedvideo;

import com.openopportunity.sharedvideo.dto.RecordWatchProgressRequest;
import com.openopportunity.sharedvideo.dto.SharedVideoMetadata;
import jakarta.validation.Valid;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Fully public — see SecurityConfig's permitAll rule for "/api/shared-videos/**". Nothing here
 * requires a login; the share token itself (an unguessable 256-bit value, see
 * AdminVideoService#generateToken) is what gates access. */
@RestController
@RequestMapping("/api/shared-videos")
public class SharedVideoController {

    private final SharedVideoAccessService sharedVideoAccessService;

    public SharedVideoController(SharedVideoAccessService sharedVideoAccessService) {
        this.sharedVideoAccessService = sharedVideoAccessService;
    }

    @GetMapping("/{token}")
    public ResponseEntity<SharedVideoMetadata> metadata(@PathVariable String token) {
        return ResponseEntity.ok(sharedVideoAccessService.getMetadata(token));
    }

    /** Range-aware (unlike every other file-serving endpoint in this app, e.g.
     * MockInterviewController) — a shared video is meant to be scrubbed/seeked by an external
     * recipient over a plain {@code <video>} tag, which needs 206 Partial Content responses to
     * do that without downloading the whole file first. */
    @GetMapping("/{token}/video")
    public ResponseEntity<ResourceRegion> video(
            @PathVariable String token, @RequestHeader(value = HttpHeaders.RANGE, required = false) String rangeHeader) {
        SharedVideoAccessService.LoadedSharedVideo loaded = sharedVideoAccessService.loadVideoResource(token);
        Resource resource = loaded.resource();
        long contentLength;
        try {
            contentLength = resource.contentLength();
        } catch (IOException ex) {
            throw new UncheckedIOException("Failed to read shared video length", ex);
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

    @PostMapping("/{token}/progress")
    public ResponseEntity<Void> progress(
            @PathVariable String token, @Valid @RequestBody RecordWatchProgressRequest request) {
        sharedVideoAccessService.recordProgress(token, request.watchedSeconds());
        return ResponseEntity.noContent().build();
    }
}
