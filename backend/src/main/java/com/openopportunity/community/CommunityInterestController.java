package com.openopportunity.community;

import com.openopportunity.community.dto.CommunityInterestRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/community")
public class CommunityInterestController {

    private final CommunityInterestService communityInterestService;

    public CommunityInterestController(CommunityInterestService communityInterestService) {
        this.communityInterestService = communityInterestService;
    }

    @PostMapping("/interest")
    public ResponseEntity<Void> notifyInterest(@Valid @RequestBody CommunityInterestRequest request) {
        communityInterestService.notifyInterest(request);
        return ResponseEntity.noContent().build();
    }
}
