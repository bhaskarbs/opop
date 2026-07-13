package com.openopportunity.storage;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** Writes uploaded files to a local directory — the default for local dev per the project's
 * local-first build philosophy (docs/DEVELOPMENT_ROADMAP.md). A cloud-backed
 * FileStorageService (e.g. Google Cloud Storage) is the natural next implementation once a
 * real deployment needs files to survive past a single container instance. */
@Service
public class LocalFileStorageService implements FileStorageService {

    private final Path rootDir;

    public LocalFileStorageService(@Value("${app.storage.root-dir}") String rootDir) {
        this.rootDir = Path.of(rootDir);
    }

    @Override
    public String store(MultipartFile file, String subdirectory) throws IOException {
        Path dir = rootDir.resolve(subdirectory);
        Files.createDirectories(dir);

        String storageKey = subdirectory + "/" + UUID.randomUUID() + extensionOf(file.getOriginalFilename());
        file.transferTo(rootDir.resolve(storageKey));
        return storageKey;
    }

    private static String extensionOf(String originalFilename) {
        if (originalFilename == null) {
            return "";
        }
        int dot = originalFilename.lastIndexOf('.');
        return dot >= 0 ? originalFilename.substring(dot) : "";
    }
}
