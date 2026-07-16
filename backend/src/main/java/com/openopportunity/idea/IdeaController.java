package com.openopportunity.idea;

import com.openopportunity.idea.dto.IdeaDetail;
import com.openopportunity.idea.dto.IdeaRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ideas")
public class IdeaController {

    private final IdeaService ideaService;

    public IdeaController(IdeaService ideaService) {
        this.ideaService = ideaService;
    }

    @PostMapping
    public ResponseEntity<IdeaDetail> create(@Valid @RequestBody IdeaRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ideaService.create(currentUserId(), request));
    }

    @GetMapping("/{id}")
    public IdeaDetail get(@PathVariable UUID id) {
        return ideaService.getMine(id, currentUserId());
    }

    @PutMapping("/{id}")
    public IdeaDetail update(@PathVariable UUID id, @Valid @RequestBody IdeaRequest request) {
        return ideaService.update(id, currentUserId(), request);
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
