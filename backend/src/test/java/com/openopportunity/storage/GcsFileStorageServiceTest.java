package com.openopportunity.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Bucket;
import com.google.cloud.storage.Storage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.util.StreamUtils;

@ExtendWith(MockitoExtension.class)
class GcsFileStorageServiceTest {

    private static final String BUCKET = "openopportunity-uploads";

    @Mock
    private Storage storage;

    @Mock
    private Bucket bucket;

    private GcsFileStorageService service;

    @BeforeEach
    void setUp() {
        when(storage.get(BUCKET)).thenReturn(bucket);
        service = new GcsFileStorageService(storage, BUCKET);
    }

    @Test
    void createsTheBucketOnlyWhenItDoesNotAlreadyExist() {
        Storage freshStorage = org.mockito.Mockito.mock(Storage.class);
        when(freshStorage.get(BUCKET)).thenReturn(null);

        new GcsFileStorageService(freshStorage, BUCKET);

        verify(freshStorage).create(any(com.google.cloud.storage.BucketInfo.class));
    }

    @Test
    void doesNotRecreateAnAlreadyExistingBucket() {
        verify(storage, never()).create(any(com.google.cloud.storage.BucketInfo.class));
    }

    @Test
    void storesMultipartFilesUnderTheGivenSubdirectoryWithTheOriginalExtension() throws Exception {
        MockMultipartFile file =
                new MockMultipartFile("resume", "resume.pdf", "application/pdf", "content".getBytes());

        String storageKey = service.store(file, "resumes/some-user-id");

        assertThat(storageKey).startsWith("resumes/some-user-id/").endsWith(".pdf");
        verify(storage).create(any(BlobInfo.class), eq("content".getBytes()));
    }

    @Test
    void dropsAPathTraversalAttemptInTheFilename() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "resume", "../../etc/passwd.pdf/../../secret", "application/pdf", "content".getBytes());

        String storageKey = service.store(file, "resumes");

        assertThat(storageKey).startsWith("resumes/").doesNotContain("..");
    }

    @Test
    void loadsPreviouslyStoredContentBack() throws Exception {
        byte[] content = "hello world".getBytes();
        when(storage.readAllBytes(BUCKET, "photos/user-1/some-key.jpg")).thenReturn(content);

        Resource resource = service.load("photos/user-1/some-key.jpg");

        assertThat(StreamUtils.copyToByteArray(resource.getInputStream())).isEqualTo(content);
    }

    @Test
    void deleteRemovesTheBlobByStorageKey() {
        service.delete("logos/company-1/some-key.png");

        verify(storage).delete(BUCKET, "logos/company-1/some-key.png");
    }
}
