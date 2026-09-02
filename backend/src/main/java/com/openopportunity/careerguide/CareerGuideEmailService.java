package com.openopportunity.careerguide;

import com.openopportunity.careerguide.exception.CareerGuideEmailSendException;
import com.openopportunity.careerguide.exception.NoCareerGuideStepsConfiguredException;
import com.openopportunity.mail.CareerGuideStepCta;
import com.openopportunity.mail.EmailService;
import java.util.List;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Sends the "career guide" email (see EmailTemplate.renderCareerGuide) built from whatever steps
 * are currently configured — used today only by AdminCareerGuideStepService's "send test email"
 * action, but kept separate from that admin CRUD service so a future bulk/candidate-facing send
 * path can reuse it without depending on admin-only code. */
@Service
public class CareerGuideEmailService {

    private static final String SUBJECT = "A few minutes that could change your job search";

    private final CareerGuideStepRepository stepRepository;
    private final EmailService emailService;

    public CareerGuideEmailService(CareerGuideStepRepository stepRepository, EmailService emailService) {
        this.stepRepository = stepRepository;
        this.emailService = emailService;
    }

    /** Synchronous, not routed through AsyncEmailSender's best-effort queue — the one caller
     * today (an admin clicking "send test email") needs to know immediately whether it actually
     * went out, not have a delivery failure silently logged. */
    @Transactional(readOnly = true)
    public void send(String to) {
        List<CareerGuideStepCta> steps = stepRepository.findAllByOrderByStepOrderAsc().stream()
                .map(step -> new CareerGuideStepCta(step.getStepOrder(), step.getDescription(), step.getVideoUrl()))
                .toList();
        if (steps.isEmpty()) {
            throw new NoCareerGuideStepsConfiguredException();
        }
        try {
            emailService.sendCareerGuide(to, SUBJECT, steps);
        } catch (MailException e) {
            throw new CareerGuideEmailSendException(e);
        }
    }
}
