package com.openopportunity.community;

import com.openopportunity.community.dto.CommunityInterestRequest;
import com.openopportunity.community.exception.EmailDeliveryException;
import com.openopportunity.mail.EmailService;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.stereotype.Service;

@Service
public class CommunityInterestService {

    private final EmailService emailService;
    private final CommunityInterestSubmissionRepository submissionRepository;
    private final String contactEmail;

    public CommunityInterestService(
            EmailService emailService,
            CommunityInterestSubmissionRepository submissionRepository,
            @Value("${app.community.contact-email}") String contactEmail) {
        this.emailService = emailService;
        this.submissionRepository = submissionRepository;
        this.contactEmail = contactEmail;
    }

    /** The Community page's "know more" button is public (see SecurityConfig) — an anonymous
     * visitor submits their own contact details via the form rather than this looking up an
     * account, so it works the same whether or not they're signed in. Saved first, in its own
     * implicit transaction (see SimpleJpaRepository) — deliberately NOT wrapped in a
     * transaction spanning this whole method, so the record (counted as "Community sign-ups"
     * on the admin dashboard) survives even if the notification email below fails to send. */
    public void notifyInterest(CommunityInterestRequest request) {
        submissionRepository.save(new CommunityInterestSubmission(
                request.name(), request.companyName(), request.email(), request.phone()));

        try {
            emailService.send(
                    contactEmail,
                    "New \"know more about community income\" request from " + request.name(),
                    "New community interest request",
                    List.of(
                            "Someone asked to know more about community & community income.",
                            "Name: " + request.name(),
                            "Company: " + valueOrNotProvided(request.companyName()),
                            "Email: " + request.email(),
                            "Phone: " + valueOrNotProvided(request.phone())));
        } catch (MailException e) {
            throw new EmailDeliveryException(e);
        }
    }

    private String valueOrNotProvided(String value) {
        return value == null || value.isBlank() ? "Not provided" : value;
    }
}
