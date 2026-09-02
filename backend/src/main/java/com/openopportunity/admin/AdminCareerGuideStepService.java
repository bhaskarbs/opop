package com.openopportunity.admin;

import com.openopportunity.careerguide.CareerGuideEmailService;
import com.openopportunity.careerguide.CareerGuideStep;
import com.openopportunity.careerguide.CareerGuideStepRepository;
import com.openopportunity.careerguide.dto.CareerGuideStepRequest;
import com.openopportunity.careerguide.dto.CareerGuideStepSummary;
import com.openopportunity.careerguide.dto.ReorderCareerGuideStepsRequest;
import com.openopportunity.careerguide.exception.CareerGuideStepNotFoundException;
import com.openopportunity.careerguide.exception.InvalidCareerGuideStepReorderException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** "Content management" scope (small local dataset), same as AdminMockInterviewQuestionService —
 * the whole list is always loaded/rewritten in memory rather than built as SQL. "Increase steps"
 * is create(), "decrease steps" is delete() (which renumbers the remainder to stay contiguous
 * 1..N); there's no separate resize operation. */
@Service
public class AdminCareerGuideStepService {

    private final CareerGuideStepRepository stepRepository;
    private final CareerGuideEmailService careerGuideEmailService;

    public AdminCareerGuideStepService(
            CareerGuideStepRepository stepRepository, CareerGuideEmailService careerGuideEmailService) {
        this.stepRepository = stepRepository;
        this.careerGuideEmailService = careerGuideEmailService;
    }

    @Transactional(readOnly = true)
    public List<CareerGuideStepSummary> list() {
        return stepRepository.findAllByOrderByStepOrderAsc().stream().map(this::toSummary).toList();
    }

    @Transactional
    public CareerGuideStepSummary create(CareerGuideStepRequest request) {
        int nextOrder = stepRepository.findAllByOrderByStepOrderAsc().stream()
                .mapToInt(CareerGuideStep::getStepOrder)
                .max()
                .orElse(0)
                + 1;
        CareerGuideStep step = new CareerGuideStep(nextOrder, request.description(), request.videoUrl());
        return toSummary(stepRepository.save(step));
    }

    @Transactional
    public CareerGuideStepSummary update(UUID id, CareerGuideStepRequest request) {
        CareerGuideStep step =
                stepRepository.findById(id).orElseThrow(() -> new CareerGuideStepNotFoundException(id));
        step.update(request.description(), request.videoUrl());
        return toSummary(stepRepository.save(step));
    }

    /** Renumbers every remaining step to a contiguous 1..N sequence afterward, so the email's
     * "Step 1/2/3" labels never show a gap (e.g. deleting Step 2 out of 1/2/3 leaves 1/3, not a
     * relabeled 1/2). */
    @Transactional
    public void delete(UUID id) {
        if (!stepRepository.existsById(id)) {
            throw new CareerGuideStepNotFoundException(id);
        }
        stepRepository.deleteById(id);
        renumber(stepRepository.findAllByOrderByStepOrderAsc());
    }

    /** orderedStepIds must list every existing step's id exactly once; anything else (an unknown
     * id, a missing id, a duplicate) is rejected rather than silently dropping/duplicating a
     * step. */
    @Transactional
    public List<CareerGuideStepSummary> reorder(ReorderCareerGuideStepsRequest request) {
        List<CareerGuideStep> steps = stepRepository.findAllById(request.orderedStepIds());
        Map<UUID, CareerGuideStep> byId = steps.stream().collect(Collectors.toMap(CareerGuideStep::getId, s -> s));
        if (byId.size() != request.orderedStepIds().size() || byId.size() != stepRepository.count()) {
            throw new InvalidCareerGuideStepReorderException();
        }
        List<CareerGuideStep> ordered =
                request.orderedStepIds().stream().map(byId::get).toList();
        renumber(ordered);
        return ordered.stream().map(this::toSummary).toList();
    }

    public void sendTestEmail(String to) {
        careerGuideEmailService.send(to);
    }

    private void renumber(List<CareerGuideStep> stepsInOrder) {
        for (int i = 0; i < stepsInOrder.size(); i++) {
            stepsInOrder.get(i).reorder(i + 1);
        }
        stepRepository.saveAll(stepsInOrder);
    }

    private CareerGuideStepSummary toSummary(CareerGuideStep step) {
        return new CareerGuideStepSummary(
                step.getId(),
                step.getStepOrder(),
                step.getDescription(),
                step.getVideoUrl(),
                step.getCreatedAt(),
                step.getUpdatedAt());
    }
}
