package com.openopportunity.storage;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** Writes uploaded files to a local directory — the default for local dev per the project's
 * local-first build philosophy (docs/DEVELOPMENT_ROADMAP.md). See GcsFileStorageService for the
 * cloud-backed alternative (app.storage.provider=gcs) once a real deployment needs files to
 * survive past a single container instance. */
@Service
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "local", matchIfMissing = true)
public class LocalFileStorageService implements FileStorageService {

    private final Path rootDir;

    public LocalFileStorageService(@Value("${app.storage.root-dir}") String rootDir) {
        this.rootDir = Path.of(rootDir);
    }

    @Override
    public String store(MultipartFile file, String subdirectory) throws IOException {
        String storageKey = newStorageKey(subdirectory, file.getOriginalFilename());
        Files.createDirectories(rootDir.resolve(subdirectory));
        file.transferTo(rootDir.resolve(storageKey));
        return storageKey;
    }

    @Override
    public String store(byte[] content, String originalFilename, String subdirectory) throws IOException {
        String storageKey = newStorageKey(subdirectory, originalFilename);
        Files.createDirectories(rootDir.resolve(subdirectory));
        Files.write(rootDir.resolve(storageKey), content);
        return storageKey;
    }

    private String newStorageKey(String subdirectory, String originalFilename) {
        return subdirectory + "/" + UUID.randomUUID() + extensionOf(originalFilename);
    }

    @Override
    public Resource load(String storageKey) throws IOException {
        // Checked eagerly so a missing file surfaces here, where every caller already has an
        // IOException handler, rather than as an uncaught FileNotFoundException deep inside
        // Spring's response-serialization internals once the (lazy) UrlResource is actually read
        // — matches GcsFileStorageService.load, which fails eagerly by construction since it
        // reads the object's bytes up front.
        Path path = rootDir.resolve(storageKey);
        if (!Files.exists(path)) {
            throw new FileNotFoundException("No stored file at " + storageKey);
        }
        return new UrlResource(path.toUri());
    }

    @Override
    public void delete(String storageKey) throws IOException {
        Files.deleteIfExists(rootDir.resolve(storageKey));
    }

    // The generated storage key is always <UUID><extension> under a fixed subdirectory, so this
    // is the only piece of a client-supplied filename that ever reaches disk — allowlisting it
    // to plain alphanumeric characters rules out path separators/traversal segments (`/`, `..`)
    // ever being part of the path, rather than relying on how the rest of the key happens to be
    // built to incidentally block them.
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
