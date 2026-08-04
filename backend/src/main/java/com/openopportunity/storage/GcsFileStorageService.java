package com.openopportunity.storage;

import com.google.cloud.storage.Blob;
import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageException;
import com.google.cloud.storage.StorageOptions;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.channels.Channels;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** Google Cloud Storage-backed FileStorageService — active once app.storage.provider=gcs is set
 * (see LocalFileStorageService, the local-disk default this replaces). This is what lets
 * uploads survive past a single Cloud Run container instance and stay visible across however
 * many are running, unlike local disk. Uses Application Default Credentials — the Cloud Run
 * service account in a real deployment (see infra/storage.tf for its IAM binding); never
 * invoked locally, since this bean only exists when explicitly enabled, so no GCP credentials
 * are needed to build or run the app locally.
 *
 * <p>{@link StorageException} (the client library's unchecked failure type) is wrapped as
 * {@link IOException} at every method boundary here so callers written against
 * {@link FileStorageService}'s {@code throws IOException} contract behave identically regardless
 * of which implementation is active — e.g. CandidateSearchService.getResumeHtml's {@code catch
 * (IOException ex)} around a resume load. */
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "gcs")
public class GcsFileStorageService implements FileStorageService {

    private final Storage storage;
    private final String bucketName;

    public GcsFileStorageService(@Value("${app.storage.gcs.bucket}") String bucketName) {
        this(StorageOptions.getDefaultInstance().getService(), bucketName);
    }

    // Package-private: lets tests inject a mock Storage instead of going through
    // StorageOptions.getDefaultInstance(), which resolves real Application Default Credentials
    // and would fail outside an actual GCP environment.
    GcsFileStorageService(Storage storage, String bucketName) {
        this.storage = storage;
        this.bucketName = bucketName;
    }

    @Override
    public String store(MultipartFile file, String subdirectory) throws IOException {
        String storageKey = StorageKeyGenerator.newKey(subdirectory, file.getOriginalFilename());
        BlobInfo.Builder blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, storageKey));
        if (file.getContentType() != null) {
            blobInfo.setContentType(file.getContentType());
        }
        try (InputStream in = file.getInputStream()) {
            storage.createFrom(blobInfo.build(), in);
        } catch (StorageException e) {
            throw new IOException(e);
        }
        return storageKey;
    }

    @Override
    public String store(byte[] content, String originalFilename, String subdirectory) throws IOException {
        String storageKey = StorageKeyGenerator.newKey(subdirectory, originalFilename);
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucketName, storageKey)).build();
        try {
            storage.create(blobInfo, content);
        } catch (StorageException e) {
            throw new IOException(e);
        }
        return storageKey;
    }

    @Override
    public Resource load(String storageKey) throws IOException {
        Blob blob;
        try {
            blob = storage.get(bucketName, storageKey);
        } catch (StorageException e) {
            throw new IOException(e);
        }
        if (blob == null) {
            throw new FileNotFoundException("No such object: " + storageKey);
        }
        long size = blob.getSize() != null ? blob.getSize() : -1;
        return new SizedInputStreamResource(Channels.newInputStream(blob.reader()), size);
    }

    @Override
    public void delete(String storageKey) throws IOException {
        try {
            storage.delete(bucketName, storageKey);
        } catch (StorageException e) {
            throw new IOException(e);
        }
    }

    /** Same streaming behavior as InputStreamResource, but with a known content length up front
     * (from the GCS blob metadata load() already fetched) — avoids buffering a whole file (up
     * to 150MB for mock-interview recordings) into memory just to compute Content-Length. */
    private static final class SizedInputStreamResource extends InputStreamResource {
        private final long size;

        SizedInputStreamResource(InputStream inputStream, long size) {
            super(inputStream);
            this.size = size;
        }

        @Override
        public long contentLength() {
            return size;
        }
    }
}
