package com.openopportunity.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.google.cloud.ReadChannel;
import com.google.cloud.RestorableState;
import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageException;
import java.io.ByteArrayInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.channels.Channels;
import java.nio.channels.ReadableByteChannel;
import org.junit.jupiter.api.Test;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

class GcsFileStorageServiceTest {

    private final Storage storage = mock(Storage.class);
    private final GcsFileStorageService service = new GcsFileStorageService(storage, "test-bucket");

    @Test
    void storeUploadsToTheConfiguredBucketWithASanitizedKeyAndContentType() throws Exception {
        MockMultipartFile file =
                new MockMultipartFile("resume", "resume.PDF", "application/pdf", "content".getBytes());

        String storageKey = service.store(file, "resumes");

        assertThat(storageKey).startsWith("resumes/").endsWith(".pdf");
        verify(storage)
                .createFrom(
                        argThatBlobInfo(blobInfo -> blobInfo.getBlobId().getBucket().equals("test-bucket")
                                && blobInfo.getBlobId().getName().equals(storageKey)
                                && "application/pdf".equals(blobInfo.getContentType())),
                        any(java.io.InputStream.class));
    }

    @Test
    void storeFromBytesUploadsToTheConfiguredBucket() throws Exception {
        String storageKey = service.store("content".getBytes(), "photo.png", "photos");

        assertThat(storageKey).startsWith("photos/").endsWith(".png");
        verify(storage)
                .create(
                        argThatBlobInfo(blobInfo -> blobInfo.getBlobId().getBucket().equals("test-bucket")
                                && blobInfo.getBlobId().getName().equals(storageKey)),
                        eq("content".getBytes()));
    }

    @Test
    void loadStreamsTheBlobBackWithItsKnownContentLength() throws Exception {
        Blob blob = mock(Blob.class);
        when(blob.getSize()).thenReturn(7L);
        when(blob.reader()).thenReturn(fakeReadChannel("content".getBytes()));
        when(storage.get("test-bucket", "resumes/x.pdf")).thenReturn(blob);

        Resource resource = service.load("resumes/x.pdf");

        assertThat(resource.contentLength()).isEqualTo(7L);
        assertThat(resource.getInputStream().readAllBytes()).isEqualTo("content".getBytes());
    }

    @Test
    void loadThrowsFileNotFoundWhenTheBlobDoesNotExist() {
        when(storage.get("test-bucket", "resumes/missing.pdf")).thenReturn(null);

        assertThatThrownBy(() -> service.load("resumes/missing.pdf")).isInstanceOf(FileNotFoundException.class);
    }

    @Test
    void deleteDelegatesToTheStorageClient() throws Exception {
        service.delete("resumes/x.pdf");

        verify(storage).delete("test-bucket", "resumes/x.pdf");
    }

    @Test
    void wrapsStorageExceptionAsIOExceptionSoCallersDontNeedToKnowWhichBackendIsActive() {
        when(storage.get("test-bucket", "resumes/x.pdf")).thenThrow(new StorageException(500, "boom"));

        assertThatThrownBy(() -> service.load("resumes/x.pdf")).isInstanceOf(IOException.class);
    }

    private static BlobInfo argThatBlobInfo(java.util.function.Predicate<BlobInfo> predicate) {
        return org.mockito.ArgumentMatchers.argThat(predicate::test);
    }

    // The client library ships ReadChannel only as an interface (Blob.reader()'s return type) —
    // no concrete test double, so this delegates the actual reading to a plain
    // ReadableByteChannel over the given bytes and leaves the GCS-specific extras
    // (seek/setChunkSize/capture) unsupported, since load() never calls them.
    private static ReadChannel fakeReadChannel(byte[] content) {
        ReadableByteChannel delegate = Channels.newChannel(new ByteArrayInputStream(content));
        return new ReadChannel() {
            @Override
            public boolean isOpen() {
                return delegate.isOpen();
            }

            @Override
            public void close() {
                try {
                    delegate.close();
                } catch (IOException e) {
                    throw new UncheckedIOException(e);
                }
            }

            @Override
            public int read(ByteBuffer dst) throws IOException {
                return delegate.read(dst);
            }

            @Override
            public void seek(long position) {
                throw new UnsupportedOperationException();
            }

            @Override
            public void setChunkSize(int chunkSize) {
                // No-op — this fake has no chunking behavior to configure.
            }

            @Override
            public RestorableState<ReadChannel> capture() {
                throw new UnsupportedOperationException();
            }
        };
    }
}
