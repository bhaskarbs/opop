package com.openopportunity.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.FileNotFoundException;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

class LocalFileStorageServiceTest {

    @TempDir
    Path tempDir;

    private LocalFileStorageService service(Path root) {
        return new LocalFileStorageService(root.toString());
    }

    @Test
    void preservesAnOrdinaryExtension() throws Exception {
        LocalFileStorageService service = service(tempDir);
        MockMultipartFile file = new MockMultipartFile("resume", "resume.pdf", "application/pdf", "content".getBytes());

        String storageKey = service.store(file, "resumes");

        assertThat(storageKey).startsWith("resumes/").endsWith(".pdf");
    }

    @Test
    void dropsAPathTraversalAttemptInTheFilenameInsteadOfPreservingIt() throws Exception {
        LocalFileStorageService service = service(tempDir);
        MockMultipartFile file = new MockMultipartFile(
                "resume", "../../etc/passwd.pdf/../../secret", "application/pdf", "content".getBytes());

        String storageKey = service.store(file, "resumes");

        // The unsafe filename produces no recognizable extension at all (rather than the raw
        // `.pdf/../../secret` tail), so the resulting key can only ever land inside "resumes/" —
        // i.e. everything after that prefix is a single path segment with no further slashes.
        assertThat(storageKey).startsWith("resumes/").doesNotContain("..");
        assertThat(storageKey.substring("resumes/".length())).doesNotContain("/");
    }

    @Test
    void lowercasesTheExtension() throws Exception {
        LocalFileStorageService service = service(tempDir);
        MockMultipartFile file = new MockMultipartFile("resume", "Resume.PDF", "application/pdf", "content".getBytes());

        String storageKey = service.store(file, "resumes");

        assertThat(storageKey).endsWith(".pdf");
    }

    @Test
    void dropsAnOverlyLongExtension() throws Exception {
        LocalFileStorageService service = service(tempDir);
        MockMultipartFile file =
                new MockMultipartFile("resume", "resume." + "x".repeat(50), "application/pdf", "content".getBytes());

        String storageKey = service.store(file, "resumes");

        assertThat(storageKey).startsWith("resumes/").doesNotContain("x".repeat(50));
    }

    @Test
    void treatsAMissingFilenameAsNoExtension() throws Exception {
        LocalFileStorageService service = service(tempDir);

        String storageKey = service.store("content".getBytes(), null, "resumes");

        assertThat(storageKey).startsWith("resumes/").doesNotContain(".");
    }

    @Test
    void loadsBackWhatWasStored() throws Exception {
        LocalFileStorageService service = service(tempDir);
        String storageKey = service.store("hello".getBytes(), "logo.png", "logos");

        Resource resource = service.load(storageKey);

        assertThat(resource.getContentAsByteArray()).isEqualTo("hello".getBytes());
    }

    // Regression test: the DB can end up referencing a storage key whose file no longer exists
    // on disk (e.g. it was written under a different app.storage.provider, or the uploads
    // directory was cleared) — load() must fail eagerly here rather than returning a Resource
    // that only blows up later, uncaught, while Spring serializes the HTTP response around it.
    @Test
    void failsEagerlyWhenTheStoredFileIsMissing() {
        LocalFileStorageService service = service(tempDir);

        assertThatThrownBy(() -> service.load("logos/does-not-exist.png"))
                .isInstanceOf(FileNotFoundException.class);
    }
}
