package com.openopportunity.storage;

import java.io.IOException;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;

/** Abstracts where uploaded files (resumes, mock interview recordings, and eventually company
 * certificates) actually live, so the local-disk implementation used in dev can be swapped for
 * a cloud-backed one (e.g. Google Cloud Storage) later without touching callers. */
public interface FileStorageService {

    /** Stores the file under the given subdirectory and returns an opaque storage key that
     * identifies where it landed. */
    String store(MultipartFile file, String subdirectory) throws IOException;

    /** Loads a previously stored file back by the storage key {@link #store} returned. */
    Resource load(String storageKey) throws IOException;
}
