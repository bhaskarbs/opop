package com.openopportunity.auth;

import com.openopportunity.auth.dto.CandidateProfileResponse;
import com.openopportunity.auth.dto.PhotoUploadResponse;
import com.openopportunity.auth.dto.ResumeUploadResponse;
import com.openopportunity.auth.dto.UpdateGoalsRequest;
import com.openopportunity.auth.dto.UpdateMobileRequest;
import com.openopportunity.auth.dto.UpdatePersonalDetailsRequest;
import com.openopportunity.auth.dto.UpdatePreferencesRequest;
import com.openopportunity.auth.dto.UpdateSkillsRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/candidate")
public class CandidateProfileController {

    private final CandidateProfileService candidateProfileService;

    public CandidateProfileController(CandidateProfileService candidateProfileService) {
        this.candidateProfileService = candidateProfileService;
    }

    @GetMapping("/profile")
    public ResponseEntity<CandidateProfileResponse> getProfile() {
        return ResponseEntity.ok(candidateProfileService.getProfile(currentUserId()));
    }

    @PatchMapping("/profile/personal")
    public ResponseEntity<CandidateProfileResponse> updatePersonalDetails(
            @Valid @RequestBody UpdatePersonalDetailsRequest request) {
        return ResponseEntity.ok(candidateProfileService.updatePersonalDetails(currentUserId(), request));
    }

    @PatchMapping("/profile/skills")
    public ResponseEntity<CandidateProfileResponse> updateSkills(@Valid @RequestBody UpdateSkillsRequest request) {
        return ResponseEntity.ok(candidateProfileService.updateSkills(currentUserId(), request));
    }

    @PatchMapping("/profile/goals")
    public ResponseEntity<CandidateProfileResponse> updateGoals(@RequestBody UpdateGoalsRequest request) {
        return ResponseEntity.ok(candidateProfileService.updateGoals(currentUserId(), request));
    }

    @PatchMapping("/profile/mobile")
    public ResponseEntity<CandidateProfileResponse> updateMobile(@Valid @RequestBody UpdateMobileRequest request) {
        return ResponseEntity.ok(candidateProfileService.updateMobile(currentUserId(), request));
    }

    @PatchMapping("/profile/preferences")
    public ResponseEntity<CandidateProfileResponse> updatePreferences(
            @Valid @RequestBody UpdatePreferencesRequest request) {
        return ResponseEntity.ok(candidateProfileService.updatePreferences(currentUserId(), request));
    }

    @PostMapping("/resume")
    public ResponseEntity<ResumeUploadResponse> uploadResume(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(candidateProfileService.uploadResume(currentUserId(), file));
    }

    @PostMapping("/photo")
    public ResponseEntity<PhotoUploadResponse> uploadPhoto(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(candidateProfileService.uploadPhoto(currentUserId(), file));
    }

    private UUID currentUserId() {
        return (UUID) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }
}
