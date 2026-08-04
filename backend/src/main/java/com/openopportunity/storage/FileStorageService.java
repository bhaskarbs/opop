package com.openopportunity.storage;

import java.io.IOException;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

/** Abstracts where uploaded files (resumes, photos/logos, company certificates, mock interview
 * recordings) actually live, so callers never know or care whether the active implementation is
 * {@link LocalFileStorageService} (local dev's default) or {@link GcsFileStorageService} (a
 * real deployment, see app.storage.provider). */
public interface FileStorageService {

    /** Stores the file under the given subdirectory and returns an opaque storage key that
     * identifies where it landed. */
    String store(MultipartFile file, String subdirectory) throws IOException;

    /** Like {@link #store(MultipartFile, String)}, but for content already resolved to bytes in
     * memory (e.g. an image resized by AvatarImageResizer) rather than a raw upload —
     * originalFilename is only used to preserve the file extension in the storage key. */
    String store(byte[] content, String originalFilename, String subdirectory) throws IOException;

    /** Loads a previously stored file back by the storage key {@link #store} returned. */
    Resource load(String storageKey) throws IOException;

    /** Removes a previously stored file. A no-op if it's already gone. */
    void delete(String storageKey) throws IOException;
}
