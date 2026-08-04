package com.openopportunity.storage;

import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.BucketInfo;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageException;
import java.io.IOException;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** Stores uploaded files in Google Cloud Storage instead of local disk — the storage key is the
 * GCS object name (blob name), same shape LocalFileStorageService already uses
 * ({@code <subdirectory>/<uuid><extension>}), so callers (CandidateProfileService,
 * CompanyProfileService, ...) don't need to know or care which implementation is active. Backs
 * app.storage.provider=gcs; see GcsStorageConfig for the client/emulator setup this depends on.
 *
 * <p>Every uploaded file is still served back through this app's own authenticated endpoints
 * (CandidatePhotoController, CompanyLogoController, resume download, ...) rather than exposing
 * direct/public bucket URLs to the frontend — swapping the storage backend doesn't change who's
 * allowed to read a resume. */
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "gcs")
public class GcsFileStorageService implements FileStorageService {

    private final Storage storage;
    private final String bucket;

    public GcsFileStorageService(Storage storage, @Value("${app.storage.gcs.bucket}") String bucket) {
        this.storage = storage;
        this.bucket = bucket;
        if (storage.get(bucket) == null) {
            storage.create(BucketInfo.of(bucket));
        }
    }

    @Override
    public String store(MultipartFile file, String subdirectory) throws IOException {
        return store(file.getBytes(), file.getOriginalFilename(), subdirectory);
    }

    @Override
    public String store(byte[] content, String originalFilename, String subdirectory) {
        String storageKey = newStorageKey(subdirectory, originalFilename);
        BlobInfo blobInfo = BlobInfo.newBuilder(BlobId.of(bucket, storageKey)).build();
        storage.create(blobInfo, content);
        return storageKey;
    }

    private String newStorageKey(String subdirectory, String originalFilename) {
        return subdirectory + "/" + UUID.randomUUID() + extensionOf(originalFilename);
    }

    @Override
    public Resource load(String storageKey) throws IOException {
        try {
            byte[] content = storage.readAllBytes(bucket, storageKey);
            return new ByteArrayResource(content);
        } catch (StorageException e) {
            throw new IOException("Failed to load " + storageKey + " from GCS bucket " + bucket, e);
        }
    }

    @Override
    public void delete(String storageKey) {
        storage.delete(bucket, storageKey);
    }

    // Same allowlist as LocalFileStorageService.extensionOf — the generated storage key is
    // always <UUID><extension> under a fixed subdirectory, so this is the only piece of a
    // client-supplied filename that ever becomes part of a GCS object name.
    private static final Pattern SAFE_EXTENSION = Pattern.compile("\\.[a-zA-Z0-9]{1,10}");

    private static String extensionOf(String originalFilename) {
        if (originalFilename == null) {
            return "";
        }
        int dot = originalFilename.lastIndexOf('.');
        if (dot < 0) {
            return "";
        }
        String candidate = originalFilename.substring(dot).toLowerCase(Locale.ROOT);
        return SAFE_EXTENSION.matcher(candidate).matches() ? candidate : "";
    }
}
