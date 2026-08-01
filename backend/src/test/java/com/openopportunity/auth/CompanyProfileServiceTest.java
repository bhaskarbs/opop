package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.dto.CompanyProfileResponse;
import com.openopportunity.auth.dto.UpdateCompanyProfileRequest;
import com.openopportunity.auth.exception.InvalidCompanyLogoException;
import com.openopportunity.notification.NotificationService;
import com.openopportunity.notification.NotificationType;
import com.openopportunity.storage.FileStorageService;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class CompanyProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CompanyProfileRepository companyProfileRepository;

    @Mock
    private FileStorageService fileStorageService;

    @Mock
    private NotificationService notificationService;

    private CompanyProfileService companyProfileService;

    @BeforeEach
    void setUp() {
        companyProfileService =
                new CompanyProfileService(userRepository, companyProfileRepository, fileStorageService, notificationService);
    }

    private UpdateCompanyProfileRequest completeRequest() {
        return new UpdateCompanyProfileRequest(
                "Vertex Robotics", "Private Limited", "CIN123", "GSTIN123", null, "PAN123", "Tech", "Address",
                "Signatory", "9876543210");
    }

    @Test
    void updateProfileNotifiesAdminsOnceTheProfileIsComplete() {
        UUID userId = UUID.randomUUID();
        User user = new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        // Blank profile, as left by AuthService.loginWithGoogleAsCompany right after sign-in.
        CompanyProfile blank = new CompanyProfile(userId, null, null, null, null, null, null, null, null, null);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(companyProfileRepository.findByUserId(userId)).thenReturn(Optional.of(blank));

        CompanyProfileResponse response = companyProfileService.updateProfile(userId, completeRequest());

        assertThat(response.profileComplete()).isTrue();
        verify(notificationService)
                .notifyAdmins(eq(NotificationType.COMPANY_PENDING_VERIFICATION), any(), any());
    }

    @Test
    void updateProfileDoesNotNotifyAdminsWhenStillIncomplete() {
        UUID userId = UUID.randomUUID();
        User user = new User("founder@vertex.com", "hash", "Vertex Robotics", UserRole.COMPANY);
        CompanyProfile blank = new CompanyProfile(userId, null, null, null, null, null, null, null, null, null);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(companyProfileRepository.findByUserId(userId)).thenReturn(Optional.of(blank));
        // Satisfies requireValidProfileFields (cin+gstin present) but leaves pan blank — bean
        // validation's @NotBlank never runs at this layer (it's enforced by the controller),
        // so isProfileComplete() is the only thing standing between this and a notification.
        UpdateCompanyProfileRequest stillIncomplete = new UpdateCompanyProfileRequest(
                "Vertex Robotics", "Private Limited", "CIN123", "GSTIN123", null, "", "Tech", "Address",
                "Signatory", "9876543210");

        companyProfileService.updateProfile(userId, stillIncomplete);

        verify(notificationService, never()).notifyAdmins(any(), any(), any());
    }

    @Test
    void uploadLogoStoresAResizedImageRatherThanTheRawUpload() throws IOException {
        UUID userId = UUID.randomUUID();
        CompanyProfile blank = new CompanyProfile(userId, null, null, null, null, null, null, null, null, null);
        when(companyProfileRepository.findByUserId(userId)).thenReturn(Optional.of(blank));
        when(fileStorageService.store(any(byte[].class), anyString(), eq("logos/" + userId)))
                .thenReturn("logos/" + userId + "/resized.jpg");

        BufferedImage original = new BufferedImage(800, 600, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream originalBytes = new ByteArrayOutputStream();
        ImageIO.write(original, "jpg", originalBytes);
        MockMultipartFile file =
                new MockMultipartFile("file", "logo.jpg", "image/jpeg", originalBytes.toByteArray());

        companyProfileService.uploadLogo(userId, file);

        ArgumentCaptor<byte[]> storedContent = ArgumentCaptor.forClass(byte[].class);
        verify(fileStorageService).store(storedContent.capture(), eq("logo.jpg"), eq("logos/" + userId));
        // A downscaled 256x256-max JPEG of a solid-color 800x600 source is unambiguously smaller
        // than the source — this is what actually proves the resize ran, not just that upload
        // still works with the new store(byte[], ...) overload.
        assertThat(storedContent.getValue().length).isLessThan(originalBytes.size());
    }

    @Test
    void uploadLogoRejectsAFileWhoseBytesArentActuallyAnImage() {
        UUID userId = UUID.randomUUID();
        // Claims to be a JPEG via both filename and Content-Type — only the actual byte
        // signature (checked by ImageContentValidator) should decide this, not either of those,
        // since both are trivially spoofable by a non-browser caller.
        MockMultipartFile file = new MockMultipartFile(
                "file", "logo.jpg", "image/jpeg", "not actually an image".getBytes());

        assertThatThrownBy(() -> companyProfileService.uploadLogo(userId, file))
                .isInstanceOf(InvalidCompanyLogoException.class);
    }
}
