package com.openopportunity.storage;

import com.google.cloud.storage.BlobId;
import com.google.cloud.storage.BlobInfo;
import com.google.cloud.storage.Storage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

/**
 * Runs once at startup, only when app.storage.provider=gcs: uploads any file under
 * app.storage.root-dir (the local-disk uploads directory — see LocalFileStorageService) that
 * isn't already in the GCS bucket. Without this, switching an app instance with existing local
 * uploads over to app.storage.provider=gcs leaves every previously-uploaded resume/photo/logo
 * pointing at a storage key that only ever existed on disk — Postgres's stored storage key
 * doesn't change when the provider does, so GcsFileStorageService.load() 404s on anything
 * uploaded before the switch.
 *
 * <p>Preserves each file's relative path as-is for the GCS object name (the same shape
 * LocalFileStorageService already uses, e.g. {@code photos/<userId>/<uuid>.jpg}), so every
 * existing storage key in Postgres resolves correctly afterward with no data migration needed —
 * this only ever copies bytes, never touches the database. Only ever an upload of what's
 * missing, so it's safe (and cheap once caught up) to run on every restart, same reasoning as
 * JobSearchIndexInitializer's reindex-if-empty check for Elasticsearch.
 */
@Component
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "gcs")
public class LocalUploadsSyncRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalUploadsSyncRunner.class);

    private final Storage storage;
    private final String bucket;
    private final Path localRoot;

    public LocalUploadsSyncRunner(
            Storage storage,
            @Value("${app.storage.gcs.bucket}") String bucket,
            @Value("${app.storage.root-dir}") String rootDir) {
        this.storage = storage;
        this.bucket = bucket;
        this.localRoot = Path.of(rootDir);
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        if (!Files.isDirectory(localRoot)) {
            return;
        }

        Set<String> alreadyInBucket =
                storage.list(bucket).streamAll().map(BlobInfo::getName).collect(Collectors.toSet());

        int uploaded = 0;
        try (Stream<Path> files = Files.walk(localRoot)) {
            for (Path file : files.filter(Files::isRegularFile).toList()) {
                // Not every file under the uploads root is a real object this app wrote —
                // .DS_Store and other dotfiles are OS/editor artifacts, not storage keys.
                if (file.getFileName().toString().startsWith(".")) {
                    continue;
                }
                String storageKey = toStorageKey(file);
                if (alreadyInBucket.contains(storageKey)) {
                    continue;
                }
                storage.create(BlobInfo.newBuilder(BlobId.of(bucket, storageKey)).build(), Files.readAllBytes(file));
                uploaded++;
            }
        }

        if (uploaded > 0) {
            log.info("Synced {} local upload(s) into GCS bucket {} that weren't there yet.", uploaded, bucket);
        }
    }

    private String toStorageKey(Path file) {
        return localRoot.relativize(file).toString().replace('\\', '/');
    }
}
