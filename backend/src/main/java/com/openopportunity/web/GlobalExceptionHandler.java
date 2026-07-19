package com.openopportunity.web;

import com.openopportunity.admin.exception.AdminUserNotFoundException;
import com.openopportunity.admin.exception.CompanyProfileIncompleteException;
import com.openopportunity.admin.exception.CompanyProfileNotFoundException;
import com.openopportunity.application.exception.ApplicationAccessDeniedException;
import com.openopportunity.application.exception.ApplicationNotFoundException;
import com.openopportunity.application.exception.DuplicateApplicationException;
import com.openopportunity.auth.exception.CandidateProfileNotFoundException;
import com.openopportunity.auth.exception.EmailAlreadyRegisteredException;
import com.openopportunity.auth.exception.IncompleteCandidateProfileException;
import com.openopportunity.auth.exception.IncompleteCompanyProfileException;
import com.openopportunity.auth.exception.InvalidCredentialsException;
import com.openopportunity.auth.exception.InvalidGoogleTokenException;
import com.openopportunity.auth.exception.InvalidRefreshTokenException;
import com.openopportunity.auth.exception.InvalidRegistrationRoleException;
import com.openopportunity.auth.exception.InvalidResumeFileException;
import com.openopportunity.auth.exception.SuspendedAccountException;
import com.openopportunity.community.exception.EmailDeliveryException;
import com.openopportunity.idea.exception.DuplicateIdeaInterestException;
import com.openopportunity.idea.exception.IdeaAccessDeniedException;
import com.openopportunity.idea.exception.IdeaNotFoundException;
import com.openopportunity.job.exception.CompanyNotEligibleToPostJobsException;
import com.openopportunity.job.exception.InvalidJobStatusTransitionException;
import com.openopportunity.job.exception.JobAccessDeniedException;
import com.openopportunity.job.exception.JobNotFoundException;
import com.openopportunity.mockinterview.exception.InvalidMockInterviewVideoException;
import com.openopportunity.mockinterview.exception.MockInterviewSessionNotFoundException;
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

    @ExceptionHandler(InvalidResumeFileException.class)
    public ResponseEntity<ApiError> handleInvalidResumeFile(InvalidResumeFileException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
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

    @ExceptionHandler(EmailDeliveryException.class)
    public ResponseEntity<ApiError> handleEmailDelivery(EmailDeliveryException ex) {
        return error(HttpStatus.BAD_GATEWAY, ex.getMessage(), List.of());
    }

    @ExceptionHandler(MockInterviewSessionNotFoundException.class)
    public ResponseEntity<ApiError> handleMockInterviewSessionNotFound(MockInterviewSessionNotFoundException ex) {
        return error(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(InvalidMockInterviewVideoException.class)
    public ResponseEntity<ApiError> handleInvalidMockInterviewVideo(InvalidMockInterviewVideoException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage(), List.of());
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
