package com.openopportunity.sharedvideo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminVideoShareRepository extends JpaRepository<AdminVideoShare, UUID> {

    List<AdminVideoShare> findByVideoIdOrderByCreatedAtDesc(UUID videoId);

    Optional<AdminVideoShare> findByShareToken(String shareToken);

    long countByVideoId(UUID videoId);
}
