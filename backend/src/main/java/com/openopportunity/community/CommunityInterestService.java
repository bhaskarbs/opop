package com.openopportunity.community;

import com.openopportunity.community.dto.CommunityInterestRequest;
import com.openopportunity.community.exception.EmailDeliveryException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class CommunityInterestService {

    private final JavaMailSender mailSender;
    private final CommunityInterestSubmissionRepository submissionRepository;
    private final String fromAddress;
    private final String contactEmail;

    public CommunityInterestService(
            JavaMailSender mailSender,
            CommunityInterestSubmissionRepository submissionRepository,
            @Value("${app.mail.from}") String fromAddress,
            @Value("${app.community.contact-email}") String contactEmail) {
        this.mailSender = mailSender;
        this.submissionRepository = submissionRepository;
        this.fromAddress = fromAddress;
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

        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromAddress);
        message.setTo(contactEmail);
        message.setSubject("New \"know more about community income\" request from " + request.name());
        message.setText(
                "Someone asked to know more about community & community income.\n\n"
                        + "Name: " + request.name() + "\n"
                        + "Company: " + valueOrNotProvided(request.companyName()) + "\n"
                        + "Email: " + request.email() + "\n"
                        + "Phone: " + valueOrNotProvided(request.phone()));
        try {
            mailSender.send(message);
        } catch (MailException e) {
            throw new EmailDeliveryException(e);
        }
    }

    private String valueOrNotProvided(String value) {
        return value == null || value.isBlank() ? "Not provided" : value;
    }
}
