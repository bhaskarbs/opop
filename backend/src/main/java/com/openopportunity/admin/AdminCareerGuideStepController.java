package com.openopportunity.admin;

import com.openopportunity.careerguide.dto.CareerGuideStepRequest;
import com.openopportunity.careerguide.dto.CareerGuideStepSummary;
import com.openopportunity.careerguide.dto.ReorderCareerGuideStepsRequest;
import com.openopportunity.careerguide.dto.SendCareerGuideTestEmailRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/career-guide-steps")
public class AdminCareerGuideStepController {

    private final AdminCareerGuideStepService adminCareerGuideStepService;

    public AdminCareerGuideStepController(AdminCareerGuideStepService adminCareerGuideStepService) {
        this.adminCareerGuideStepService = adminCareerGuideStepService;
    }

    @GetMapping
    public List<CareerGuideStepSummary> list() {
        return adminCareerGuideStepService.list();
    }

    @PostMapping
    public ResponseEntity<CareerGuideStepSummary> create(@Valid @RequestBody CareerGuideStepRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminCareerGuideStepService.create(request));
    }

    @PutMapping("/{id}")
    public CareerGuideStepSummary update(@PathVariable UUID id, @Valid @RequestBody CareerGuideStepRequest request) {
        return adminCareerGuideStepService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        adminCareerGuideStepService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/reorder")
    public List<CareerGuideStepSummary> reorder(@Valid @RequestBody ReorderCareerGuideStepsRequest request) {
        return adminCareerGuideStepService.reorder(request);
    }

    @PostMapping("/send-test")
    public ResponseEntity<Void> sendTest(@Valid @RequestBody SendCareerGuideTestEmailRequest request) {
        adminCareerGuideStepService.sendTestEmail(request.email());
        return ResponseEntity.noContent().build();
    }
}
