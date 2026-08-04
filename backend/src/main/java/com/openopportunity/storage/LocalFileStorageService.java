package com.openopportunity.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** Writes uploaded files to a local directory — the default for local dev per the project's
 * local-first build philosophy (docs/DEVELOPMENT_ROADMAP.md), and active whenever
 * app.storage.provider isn't explicitly set to "gcs" (see GcsFileStorageService, the cloud-backed
 * implementation a real deployment switches to once uploads need to survive past a single
 * container instance / be visible across more than one). */
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalFileStorageService implements FileStorageService {

    private final Path rootDir;

    public LocalFileStorageService(@Value("${app.storage.root-dir}") String rootDir) {
        this.rootDir = Path.of(rootDir);
    }

    @Override
    public String store(MultipartFile file, String subdirectory) throws IOException {
        String storageKey = StorageKeyGenerator.newKey(subdirectory, file.getOriginalFilename());
        Files.createDirectories(rootDir.resolve(subdirectory));
        file.transferTo(rootDir.resolve(storageKey));
        return storageKey;
    }

    @Override
    public String store(byte[] content, String originalFilename, String subdirectory) throws IOException {
        String storageKey = StorageKeyGenerator.newKey(subdirectory, originalFilename);
        Files.createDirectories(rootDir.resolve(subdirectory));
        Files.write(rootDir.resolve(storageKey), content);
        return storageKey;
    }

    @Override
    public Resource load(String storageKey) throws IOException {
        return new UrlResource(rootDir.resolve(storageKey).toUri());
    }

    @Override
    public void delete(String storageKey) throws IOException {
        Files.deleteIfExists(rootDir.resolve(storageKey));
    }
}
