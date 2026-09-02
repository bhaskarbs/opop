package com.openopportunity.careerguide;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CareerGuideStepRepository extends JpaRepository<CareerGuideStep, UUID> {

    List<CareerGuideStep> findAllByOrderByStepOrderAsc();
}
