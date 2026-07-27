package com.openopportunity.auth;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyCertificateRepository extends JpaRepository<CompanyCertificate, UUID> {

    List<CompanyCertificate> findByCompanyIdOrderByUploadedAtDesc(UUID companyId);

    long countByCompanyId(UUID companyId);

    Optional<CompanyCertificate> findByIdAndCompanyId(UUID id, UUID companyId);

    void deleteByIdAndCompanyId(UUID id, UUID companyId);
}
