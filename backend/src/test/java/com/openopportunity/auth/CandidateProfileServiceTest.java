package com.openopportunity.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.dto.CandidateProfileResponse;
import com.openopportunity.auth.dto.PhotoUploadResponse;
import com.openopportunity.auth.dto.UpdateBackgroundRequest;
import com.openopportunity.auth.exception.InvalidProfilePhotoException;
import com.openopportunity.auth.exception.InvalidResumeFileException;
import com.openopportunity.storage.FileStorageService;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.List;
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
class CandidateProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private CandidateProfileRepository candidateProfileRepository;

    @Mock
    private FileStorageService fileStorageService;

    private CandidateProfileService candidateProfileService;

    @BeforeEach
    void setUp() {
        candidateProfileService =
                new CandidateProfileService(userRepository, candidateProfileRepository, fileStorageService);
    }

    @Test
    void uploadPhotoStoresAResizedImageRatherThanTheRawUpload() throws IOException {
        UUID userId = UUID.randomUUID();
        CandidateProfile profile = new CandidateProfile(userId, "9876543210", List.of("React"), null);
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(fileStorageService.store(any(byte[].class), anyString(), eq("photos/" + userId)))
                .thenReturn("photos/" + userId + "/resized.jpg");

        BufferedImage original = new BufferedImage(800, 600, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream originalBytes = new ByteArrayOutputStream();
        ImageIO.write(original, "jpg", originalBytes);
        MockMultipartFile file =
                new MockMultipartFile("file", "photo.jpg", "image/jpeg", originalBytes.toByteArray());

        PhotoUploadResponse response = candidateProfileService.uploadPhoto(userId, file);

        ArgumentCaptor<byte[]> storedContent = ArgumentCaptor.forClass(byte[].class);
        verify(fileStorageService).store(storedContent.capture(), eq("photo.jpg"), eq("photos/" + userId));
        // A downscaled 256x256-max JPEG of a solid-color 800x600 source is unambiguously smaller
        // than the source — this is what actually proves the resize ran, not just that upload
        // still works with the new store(byte[], ...) overload.
        assertThat(storedContent.getValue().length).isLessThan(originalBytes.size());
        assertThat(response.photoUrl()).isNotNull();
    }

    @Test
    void uploadPhotoRejectsAFileWhoseBytesArentActuallyAnImage() {
        UUID userId = UUID.randomUUID();
        // Claims to be a JPEG via both filename and Content-Type — only the actual byte
        // signature (checked by ImageContentValidator) should decide this, not either of those,
        // since both are trivially spoofable by a non-browser caller.
        MockMultipartFile file = new MockMultipartFile(
                "file", "photo.jpg", "image/jpeg", "not actually an image".getBytes());

        assertThatThrownBy(() -> candidateProfileService.uploadPhoto(userId, file))
                .isInstanceOf(InvalidProfilePhotoException.class);
    }

    @Test
    void uploadResumeRejectsAFileRenamedToLookLikeAPdf() {
        UUID userId = UUID.randomUUID();
        MockMultipartFile file = new MockMultipartFile(
                "file", "resume.pdf", "application/pdf", "not actually a pdf".getBytes());

        assertThatThrownBy(() -> candidateProfileService.uploadResume(userId, file))
                .isInstanceOf(InvalidResumeFileException.class);
    }

    @Test
    void updateBackgroundPersistsAndReturnsAllSixFields() {
        UUID userId = UUID.randomUUID();
        User user = new User("candidate@example.com", "hash", "Candidate", UserRole.CANDIDATE);
        CandidateProfile profile = new CandidateProfile(userId, "9876543210", List.of(), null);
        when(candidateProfileRepository.findByUserId(userId)).thenReturn(Optional.of(profile));
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        UpdateBackgroundRequest request = new UpdateBackgroundRequest(
                new BigDecimal("2.5"),
                new BigDecimal("12.50"),
                NoticePeriod.MONTH_1,
                "B.Tech Computer Science",
                "IIT Delhi",
                2018);

        CandidateProfileResponse response = candidateProfileService.updateBackground(userId, request);

        assertThat(response.yearsOfExperience()).isEqualByComparingTo("2.5");
        assertThat(response.currentSalaryLakhs()).isEqualByComparingTo("12.50");
        assertThat(response.noticePeriod()).isEqualTo(NoticePeriod.MONTH_1);
        assertThat(response.educationDegree()).isEqualTo("B.Tech Computer Science");
        assertThat(response.educationInstitution()).isEqualTo("IIT Delhi");
        assertThat(response.educationGraduationYear()).isEqualTo(2018);
        assertThat(profile.getYearsOfExperience()).isEqualByComparingTo("2.5");
    }
}
