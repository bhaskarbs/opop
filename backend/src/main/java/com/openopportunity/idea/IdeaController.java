package com.openopportunity.idea;

import com.openopportunity.idea.dto.IdeaDetail;
import com.openopportunity.idea.dto.IdeaInterestRequest;
import com.openopportunity.idea.dto.IdeaInterestSummary;
import com.openopportunity.idea.dto.IdeaRequest;
import com.openopportunity.idea.dto.IdeaSummary;
import com.openopportunity.idea.dto.MyIdeaInterestSummary;
import com.openopportunity.idea.dto.RejectIdeaRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ideas")
public class IdeaController {

    private final IdeaService ideaService;

    public IdeaController(IdeaService ideaService) {
        this.ideaService = ideaService;
    }

    @GetMapping
    public List<IdeaSummary> browse(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) IdeaStage stage) {
        return ideaService.browse(q, category, stage);
    }

    @GetMapping("/pending")
    public List<IdeaDetail> pending(@RequestParam(required = false) String q) {
        return ideaService.getPending(q);
    }

    @GetMapping("/mine")
    public List<IdeaSummary> mine() {
        return ideaService.getMine(currentUserId());
    }

    @PostMapping("/{id}/approve")
    public IdeaDetail approve(@PathVariable UUID id) {
        return ideaService.approve(id);
    }

    @PostMapping("/{id}/reject")
    public IdeaDetail reject(@PathVariable UUID id, @Valid @RequestBody RejectIdeaRequest request) {
        return ideaService.reject(id, request.reason());
    }

    @PostMapping("/{id}/feature")
    public IdeaDetail feature(@PathVariable UUID id) {
        return ideaService.feature(id);
    }

    @PostMapping("/{id}/unfeature")
    public IdeaDetail unfeature(@PathVariable UUID id) {
        return ideaService.unfeature(id);
    }

    @GetMapping("/{id}")
    public IdeaDetail get(@PathVariable UUID id) {
        return ideaService.get(id, currentUserIdOrNull());
    }

    /** Admin read of any idea's full detail, regardless of status or submitter — see
     * IdeaService#adminGet. Backs AdminIdeasPage's edit form, which otherwise couldn't load a
     * non-approved idea it doesn't own via the plain get() endpoint above. */
    @GetMapping("/{id}/admin")
    public IdeaDetail adminGet(@PathVariable UUID id) {
        return ideaService.adminGet(id);
    }

    @PostMapping
    public ResponseEntity<IdeaDetail> create(@Valid @RequestBody IdeaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ideaService.create(currentUserId(), request));
    }

    /** Admin posting an idea on behalf of a submitter (AdminIdeasPage) — see
     * IdeaService#adminCreate for how this differs from create() above (submitterId is chosen
     * by the admin, not the caller; posts straight to APPROVED). */
    @PostMapping("/admin")
    public ResponseEntity<IdeaDetail> adminCreate(
            @RequestParam UUID submitterId, @Valid @RequestBody IdeaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ideaService.adminCreate(submitterId, request));
    }

    @PutMapping("/{id}")
    public IdeaDetail update(@PathVariable UUID id, @Valid @RequestBody IdeaRequest request) {
        return ideaService.update(id, currentUserId(), request);
    }

    /** Admin edit of any idea's content, regardless of which submitter owns it — see
     * IdeaService#adminUpdate. Distinct from update(id) above, which is submitter-scoped. */
    @PutMapping("/{id}/admin")
    public IdeaDetail adminUpdate(@PathVariable UUID id, @Valid @RequestBody IdeaRequest request) {
        return ideaService.adminUpdate(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        ideaService.delete(id, currentUserId());
        return ResponseEntity.noContent().build();
    }

    /** Admin hard delete — distinct from delete(id) above, which is submitter-scoped; this one
     * requires no ownership (see IdeaService#adminDelete). */
    @DeleteMapping("/{id}/admin")
    public ResponseEntity<Void> adminDelete(@PathVariable UUID id) {
        ideaService.adminDelete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/interests")
    public ResponseEntity<IdeaInterestSummary> submitInterest(
            @PathVariable UUID id, @Valid @RequestBody IdeaInterestRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ideaService.submitInterest(id, currentUserId(), request));
    }

    @GetMapping("/{id}/interests")
    public List<IdeaInterestSummary> interests(@PathVariable UUID id) {
        return ideaService.getInterests(id, currentUserId());
    }

    @GetMapping("/interests/mine")
    public List<MyIdeaInterestSummary> myInterests() {
        return ideaService.getMyInterests(currentUserId());
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    /** GET /{id} is public (permitAll, see SecurityConfig) — an anonymous request still gets an
     * Authentication object from Spring Security, but its principal is the string "anonymousUser"
     * rather than a UUID, so this can't reuse currentUserId()'s unchecked cast. */
    private UUID currentUserIdOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication == null ? null : authentication.getPrincipal();
        return principal instanceof UUID userId ? userId : null;
    }
}
