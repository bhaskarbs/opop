package com.openopportunity.web;

import com.openopportunity.admin.exception.AdminUserNotFoundException;
import com.openopportunity.admin.exception.CannotDeleteSuperAdminException;
import com.openopportunity.admin.exception.CompanyProfileIncompleteException;
import com.openopportunity.admin.exception.CompanyProfileNotFoundException;
import com.openopportunity.admin.exception.DuplicateAdminEmailException;
import com.openopportunity.admin.exception.InvalidAdminLevelException;
import com.openopportunity.admin.exception.InvalidBroadcastEmailException;
import com.openopportunity.application.exception.ApplicationAccessDeniedException;
import com.openopportunity.application.exception.ApplicationNotFoundException;
import com.openopportunity.application.exception.DuplicateApplicationException;
import com.openopportunity.auth.exception.CandidateAccomplishmentLimitReachedException;
import com.openopportunity.auth.exception.CandidateAccomplishmentNotFoundException;
import com.openopportunity.auth.exception.CandidateCertificationLogoNotFoundException;
import com.openopportunity.auth.exception.CandidateProfileNotFoundException;
import com.openopportunity.auth.exception.CandidateResumeNotFoundException;
import com.openopportunity.auth.exception.CompanyCertificateLimitReachedException;
import com.openopportunity.auth.exception.CompanyCertificateNotFoundException;
import com.openopportunity.auth.exception.CompanyLogoNotFoundException;
import com.openopportunity.auth.exception.CompanyNotEligibleToContactCandidatesException;
import com.openopportunity.auth.exception.EmailAlreadyRegisteredException;
import com.openopportunity.auth.exception.IncompleteCandidateProfileException;
import com.openopportunity.auth.exception.IncompleteCompanyProfileException;
import com.openopportunity.auth.exception.InvalidCredentialsException;
import com.openopportunity.auth.exception.InvalidGoogleTokenException;
import com.openopportunity.auth.exception.InvalidOrExpiredResetTokenException;
import com.openopportunity.auth.exception.InvalidCandidateCertificationLogoException;
import com.openopportunity.auth.exception.InvalidCompanyCertificateException;
import com.openopportunity.auth.exception.InvalidCompanyLogoException;
import com.openopportunity.auth.exception.InvalidRefreshTokenException;
import com.openopportunity.auth.exception.InvalidProfilePhotoException;
import com.openopportunity.auth.exception.InvalidRegistrationRoleException;
import com.openopportunity.auth.exception.InvalidResumeFileException;
import com.openopportunity.auth.exception.PasswordResetEmailException;
import com.openopportunity.auth.exception.ProfilePhotoNotFoundException;
import com.openopportunity.auth.exception.ResumeRenderingFailedException;
import com.openopportunity.auth.exception.SuspendedAccountException;
import com.openopportunity.billing.exception.BillingTransactionNotFoundException;
import com.openopportunity.billing.exception.CandidateNotFoundException;
import com.openopportunity.billing.exception.CompanyNotFoundException;
import com.openopportunity.billing.exception.CompanyPaidPlanRequiresCheckoutException;
import com.openopportunity.billing.exception.CompanyPlanNotAdminAssignableException;
import com.openopportunity.billing.exception.PaidPlanRequiresCheckoutException;
import com.openopportunity.billing.exception.PaymentGatewayUnavailableException;
import com.openopportunity.billing.exception.PaymentVerificationFailedException;
import com.openopportunity.billing.exception.PlanNotAdminAssignableException;
import com.openopportunity.billing.exception.SamePlanException;
import com.openopportunity.chat.exception.ChatRateLimitedException;
import com.openopportunity.chat.exception.ChatUnavailableException;
import com.openopportunity.community.exception.EmailDeliveryException;
import com.openopportunity.idea.exception.DuplicateIdeaInterestException;
import com.openopportunity.idea.exception.IdeaAccessDeniedException;
import com.openopportunity.idea.exception.IdeaLimitReachedException;
import com.openopportunity.idea.exception.IdeaNotFoundException;
import com.openopportunity.job.exception.CompanyNotEligibleToPostJobsException;
import com.openopportunity.job.exception.InvalidJobStatusTransitionException;
import com.openopportunity.job.exception.JobAccessDeniedException;
import com.openopportunity.job.exception.JobNotFoundException;
import com.openopportunity.job.exception.JobPostingLimitReachedException;
import com.openopportunity.jobalert.exception.JobAlertLimitReachedException;
import com.openopportunity.jobalert.exception.JobAlertNotFoundException;
import com.openopportunity.mockinterview.exception.DuplicateMockInterviewQuestionException;
import com.openopportunity.mockinterview.exception.InvalidMockInterviewVideoException;
import com.openopportunity.mockinterview.exception.MockInterviewQuestionNotFoundException;
import com.openopportunity.mockinterview.exception.MockInterviewQuestionRateLimitedException;
import com.openopportunity.mockinterview.exception.MockInterviewSessionLimitReachedException;
import com.openopportunity.mockinterview.exception.MockInterviewSessionNotFoundException;
import com.openopportunity.mockinterview.exception.QuestionGenerationUnavailableException;
import com.openopportunity.notification.exception.NotificationNotFoundException;
import com.openopportunity.sharedvideo.exception.AdminSharedVideoNotFoundException;
import com.openopportunity.sharedvideo.exception.AdminVideoShareNotFoundException;
import com.openopportunity.sharedvideo.exception.InvalidSharedVideoException;
import com.openopportunity.sharedvideo.exception.SharedVideoLinkNotFoundException;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(EmailAlreadyRegisteredException.class)
    public ResponseEntity<ApiError> handleEmailAlreadyRegistered(EmailAlreadyRegisteredException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidCredentialsException.class)
    public ResponseEntity<ApiError> handleInvalidCredentials(InvalidCredentialsException ex) {
        return error(HttpStatus.UNAUTHORIZED, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidRefreshTokenException.class)
    public ResponseEntity<ApiError> handleInvalidRefreshToken(InvalidRefreshTokenException ex) {
        return error(HttpStatus.UNAUTHORIZED, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidGoogleTokenException.class)
    public ResponseEntity<ApiError> handleInvalidGoogleToken(InvalidGoogleTokenException ex) {
        return error(HttpStatus.UNAUTHORIZED, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidOrExpiredResetTokenException.class)
    public ResponseEntity<ApiError> handleInvalidOrExpiredResetToken(InvalidOrExpiredResetTokenException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(PasswordResetEmailException.class)
    public ResponseEntity<ApiError> handlePasswordResetEmail(PasswordResetEmailException ex) {
        return error(HttpStatus.BAD_GATEWAY, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidRegistrationRoleException.class)
    public ResponseEntity<ApiError> handleInvalidRegistrationRole(InvalidRegistrationRoleException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(IncompleteCompanyProfileException.class)
    public ResponseEntity<ApiError> handleIncompleteCompanyProfile(IncompleteCompanyProfileException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(IncompleteCandidateProfileException.class)
    public ResponseEntity<ApiError> handleIncompleteCandidateProfile(IncompleteCandidateProfileException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CandidateProfileNotFoundException.class)
    public ResponseEntity<ApiError> handleCandidateProfileNotFound(CandidateProfileNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CandidateResumeNotFoundException.class)
    public ResponseEntity<ApiError> handleCandidateResumeNotFound(CandidateResumeNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(ResumeRenderingFailedException.class)
    public ResponseEntity<ApiError> handleResumeRenderingFailed(ResumeRenderingFailedException ex) {
        return error(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidResumeFileException.class)
    public ResponseEntity<ApiError> handleInvalidResumeFile(InvalidResumeFileException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidProfilePhotoException.class)
    public ResponseEntity<ApiError> handleInvalidProfilePhoto(InvalidProfilePhotoException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(ProfilePhotoNotFoundException.class)
    public ResponseEntity<ApiError> handleProfilePhotoNotFound(ProfilePhotoNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidCompanyLogoException.class)
    public ResponseEntity<ApiError> handleInvalidCompanyLogo(InvalidCompanyLogoException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CompanyLogoNotFoundException.class)
    public ResponseEntity<ApiError> handleCompanyLogoNotFound(CompanyLogoNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidCompanyCertificateException.class)
    public ResponseEntity<ApiError> handleInvalidCompanyCertificate(InvalidCompanyCertificateException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CompanyCertificateNotFoundException.class)
    public ResponseEntity<ApiError> handleCompanyCertificateNotFound(CompanyCertificateNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CompanyCertificateLimitReachedException.class)
    public ResponseEntity<ApiError> handleCompanyCertificateLimitReached(CompanyCertificateLimitReachedException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CandidateAccomplishmentNotFoundException.class)
    public ResponseEntity<ApiError> handleCandidateAccomplishmentNotFound(CandidateAccomplishmentNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CandidateAccomplishmentLimitReachedException.class)
    public ResponseEntity<ApiError> handleCandidateAccomplishmentLimitReached(
            CandidateAccomplishmentLimitReachedException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidCandidateCertificationLogoException.class)
    public ResponseEntity<ApiError> handleInvalidCandidateCertificationLogo(
            InvalidCandidateCertificationLogoException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CandidateCertificationLogoNotFoundException.class)
    public ResponseEntity<ApiError> handleCandidateCertificationLogoNotFound(
            CandidateCertificationLogoNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiError> handleMaxUploadSizeExceeded(MaxUploadSizeExceededException ex) {
        return error(HttpStatus.BAD_REQUEST, "Uploaded file is too large", List.of());
    }

    @ExceptionHandler(SuspendedAccountException.class)
    public ResponseEntity<ApiError> handleSuspendedAccount(SuspendedAccountException ex) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage(), List.of());
    }

    @ExceptionHandler(JobNotFoundException.class)
    public ResponseEntity<ApiError> handleJobNotFound(JobNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(JobAccessDeniedException.class)
    public ResponseEntity<ApiError> handleJobAccessDenied(JobAccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidJobStatusTransitionException.class)
    public ResponseEntity<ApiError> handleInvalidJobStatusTransition(InvalidJobStatusTransitionException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CompanyNotEligibleToPostJobsException.class)
    public ResponseEntity<ApiError> handleCompanyNotEligibleToPostJobs(CompanyNotEligibleToPostJobsException ex) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage(), List.of());
    }

    @ExceptionHandler(JobPostingLimitReachedException.class)
    public ResponseEntity<ApiError> handleJobPostingLimitReached(JobPostingLimitReachedException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(JobAlertLimitReachedException.class)
    public ResponseEntity<ApiError> handleJobAlertLimitReached(JobAlertLimitReachedException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(JobAlertNotFoundException.class)
    public ResponseEntity<ApiError> handleJobAlertNotFound(JobAlertNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CompanyNotEligibleToContactCandidatesException.class)
    public ResponseEntity<ApiError> handleCompanyNotEligibleToContactCandidates(
            CompanyNotEligibleToContactCandidatesException ex) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage(), List.of());
    }

    @ExceptionHandler(ApplicationNotFoundException.class)
    public ResponseEntity<ApiError> handleApplicationNotFound(ApplicationNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(ApplicationAccessDeniedException.class)
    public ResponseEntity<ApiError> handleApplicationAccessDenied(ApplicationAccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage(), List.of());
    }

    @ExceptionHandler(DuplicateApplicationException.class)
    public ResponseEntity<ApiError> handleDuplicateApplication(DuplicateApplicationException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(AdminUserNotFoundException.class)
    public ResponseEntity<ApiError> handleAdminUserNotFound(AdminUserNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(DuplicateAdminEmailException.class)
    public ResponseEntity<ApiError> handleDuplicateAdminEmail(DuplicateAdminEmailException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidAdminLevelException.class)
    public ResponseEntity<ApiError> handleInvalidAdminLevel(InvalidAdminLevelException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidBroadcastEmailException.class)
    public ResponseEntity<ApiError> handleInvalidBroadcastEmail(InvalidBroadcastEmailException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CannotDeleteSuperAdminException.class)
    public ResponseEntity<ApiError> handleCannotDeleteSuperAdmin(CannotDeleteSuperAdminException ex) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CompanyProfileNotFoundException.class)
    public ResponseEntity<ApiError> handleCompanyProfileNotFound(CompanyProfileNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CompanyProfileIncompleteException.class)
    public ResponseEntity<ApiError> handleCompanyProfileIncomplete(CompanyProfileIncompleteException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(IdeaNotFoundException.class)
    public ResponseEntity<ApiError> handleIdeaNotFound(IdeaNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(IdeaAccessDeniedException.class)
    public ResponseEntity<ApiError> handleIdeaAccessDenied(IdeaAccessDeniedException ex) {
        return error(HttpStatus.FORBIDDEN, ex.getMessage(), List.of());
    }

    @ExceptionHandler(DuplicateIdeaInterestException.class)
    public ResponseEntity<ApiError> handleDuplicateIdeaInterest(DuplicateIdeaInterestException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(IdeaLimitReachedException.class)
    public ResponseEntity<ApiError> handleIdeaLimitReached(IdeaLimitReachedException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(EmailDeliveryException.class)
    public ResponseEntity<ApiError> handleEmailDelivery(EmailDeliveryException ex) {
        return error(HttpStatus.BAD_GATEWAY, ex.getMessage(), List.of());
    }

    @ExceptionHandler(MockInterviewSessionNotFoundException.class)
    public ResponseEntity<ApiError> handleMockInterviewSessionNotFound(MockInterviewSessionNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(MockInterviewSessionLimitReachedException.class)
    public ResponseEntity<ApiError> handleMockInterviewSessionLimitReached(
            MockInterviewSessionLimitReachedException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidMockInterviewVideoException.class)
    public ResponseEntity<ApiError> handleInvalidMockInterviewVideo(InvalidMockInterviewVideoException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(QuestionGenerationUnavailableException.class)
    public ResponseEntity<ApiError> handleQuestionGenerationUnavailable(QuestionGenerationUnavailableException ex) {
        return error(HttpStatus.BAD_GATEWAY, ex.getMessage(), List.of());
    }

    @ExceptionHandler(MockInterviewQuestionRateLimitedException.class)
    public ResponseEntity<ApiError> handleMockInterviewQuestionRateLimited(
            MockInterviewQuestionRateLimitedException ex) {
        return error(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), List.of());
    }

    @ExceptionHandler(MockInterviewQuestionNotFoundException.class)
    public ResponseEntity<ApiError> handleMockInterviewQuestionNotFound(MockInterviewQuestionNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(DuplicateMockInterviewQuestionException.class)
    public ResponseEntity<ApiError> handleDuplicateMockInterviewQuestion(DuplicateMockInterviewQuestionException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(SamePlanException.class)
    public ResponseEntity<ApiError> handleSamePlan(SamePlanException ex) {
        return error(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(PaymentGatewayUnavailableException.class)
    public ResponseEntity<ApiError> handlePaymentGatewayUnavailable(PaymentGatewayUnavailableException ex) {
        return error(HttpStatus.BAD_GATEWAY, ex.getMessage(), List.of());
    }

    @ExceptionHandler(PaymentVerificationFailedException.class)
    public ResponseEntity<ApiError> handlePaymentVerificationFailed(PaymentVerificationFailedException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(BillingTransactionNotFoundException.class)
    public ResponseEntity<ApiError> handleBillingTransactionNotFound(BillingTransactionNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(PaidPlanRequiresCheckoutException.class)
    public ResponseEntity<ApiError> handlePaidPlanRequiresCheckout(PaidPlanRequiresCheckoutException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CompanyPaidPlanRequiresCheckoutException.class)
    public ResponseEntity<ApiError> handleCompanyPaidPlanRequiresCheckout(CompanyPaidPlanRequiresCheckoutException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CandidateNotFoundException.class)
    public ResponseEntity<ApiError> handleCandidateNotFound(CandidateNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(PlanNotAdminAssignableException.class)
    public ResponseEntity<ApiError> handlePlanNotAdminAssignable(PlanNotAdminAssignableException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CompanyNotFoundException.class)
    public ResponseEntity<ApiError> handleCompanyNotFound(CompanyNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(CompanyPlanNotAdminAssignableException.class)
    public ResponseEntity<ApiError> handleCompanyPlanNotAdminAssignable(CompanyPlanNotAdminAssignableException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(NotificationNotFoundException.class)
    public ResponseEntity<ApiError> handleNotificationNotFound(NotificationNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(AdminSharedVideoNotFoundException.class)
    public ResponseEntity<ApiError> handleAdminSharedVideoNotFound(AdminSharedVideoNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(AdminVideoShareNotFoundException.class)
    public ResponseEntity<ApiError> handleAdminVideoShareNotFound(AdminVideoShareNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidSharedVideoException.class)
    public ResponseEntity<ApiError> handleInvalidSharedVideo(InvalidSharedVideoException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
    }

    @ExceptionHandler(SharedVideoLinkNotFoundException.class)
    public ResponseEntity<ApiError> handleSharedVideoLinkNotFound(SharedVideoLinkNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(ChatUnavailableException.class)
    public ResponseEntity<ApiError> handleChatUnavailable(ChatUnavailableException ex) {
        return error(HttpStatus.BAD_GATEWAY, ex.getMessage(), List.of());
    }

    @ExceptionHandler(ChatRateLimitedException.class)
    public ResponseEntity<ApiError> handleChatRateLimited(ChatRateLimitedException ex) {
        return error(HttpStatus.TOO_MANY_REQUESTS, ex.getMessage(), List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult().getFieldErrors().stream()
                .map(fieldError -> fieldError.getField() + ": " + fieldError.getDefaultMessage())
                .toList();
        return error(HttpStatus.BAD_REQUEST, "Validation failed", details);
    }

    private ResponseEntity<ApiError> error(HttpStatus status, String message, List<String> details) {
        ApiError body = new ApiError(Instant.now(), status.value(), status.getReasonPhrase(), message, details);
        return ResponseEntity.status(status).body(body);
    }
}
