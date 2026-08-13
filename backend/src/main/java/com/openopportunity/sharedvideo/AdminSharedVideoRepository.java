package com.openopportunity.sharedvideo;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminSharedVideoRepository extends JpaRepository<AdminSharedVideo, UUID> {

    // Visible to every admin regardless of who uploaded it — same "shared internal tool" model
    // as AdminMockInterviewQuestion management, not scoped per-uploader.
    List<AdminSharedVideo> findAllByOrderByCreatedAtDesc();
}
