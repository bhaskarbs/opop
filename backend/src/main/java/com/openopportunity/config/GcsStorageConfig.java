package com.openopportunity.config;

import com.google.cloud.NoCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Only created when app.storage.provider=gcs (see com.openopportunity.storage.GcsFileStorageService,
 * the sole consumer) — the google-cloud-storage dependency stays on the classpath unconditionally
 * (see build.gradle's comment), but no {@code Storage} client of any kind exists in the app
 * context unless this fires.
 *
 * <p>app.storage.gcs.emulator-host is what makes this work against fake-gcs-server locally (see
 * docker-compose.yml's "cdn" profile) instead of real GCS: pointing setHost at it and swapping in
 * NoCredentials (the emulator doesn't do real auth) is the documented way to use the
 * google-cloud-storage client against a local emulator. Blank (the default, and always blank in
 * any real deployment) falls back to {@link StorageOptions#getDefaultInstance()} — real GCS,
 * authenticated via Application Default Credentials (the Cloud Run service account, same as
 * postgres-socket-factory's Cloud SQL connection).
 */
@Configuration
@ConditionalOnProperty(name = "app.storage.provider", havingValue = "gcs")
public class GcsStorageConfig {

    @Bean
    public Storage storage(
            @Value("${app.storage.gcs.emulator-host:}") String emulatorHost,
            @Value("${app.storage.gcs.project-id:openopportunity-local}") String projectId) {
        if (emulatorHost.isBlank()) {
            return StorageOptions.getDefaultInstance().getService();
        }
        return StorageOptions.newBuilder()
                .setHost(emulatorHost)
                .setProjectId(projectId)
                .setCredentials(NoCredentials.getInstance())
                .build()
                .getService();
    }
}
