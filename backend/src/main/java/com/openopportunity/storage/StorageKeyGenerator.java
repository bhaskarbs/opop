package com.openopportunity.storage;

import java.util.Locale;
import java.util.UUID;
import java.util.regex.Pattern;

/** Shared by every {@link FileStorageService} implementation so a client-supplied filename is
 * sanitized exactly once, in one place, rather than each backend (local disk, GCS, ...)
 * reimplementing it and risking drift — this is the same allowlisting fix applied after a
 * security review found the original implementation trusted a filename's extension verbatim. */
final class StorageKeyGenerator {

    private StorageKeyGenerator() {}

    static String newKey(String subdirectory, String originalFilename) {
        return subdirectory + "/" + UUID.randomUUID() + extensionOf(originalFilename);
    }

    // The generated storage key is always <UUID><extension> under a fixed subdirectory, so this
    // is the only piece of a client-supplied filename that ever reaches a real path/object key —
    // allowlisting it to plain alphanumeric characters rules out path separators/traversal
    // segments (`/`, `..`) ever being part of it, rather than relying on how the rest of the key
    // happens to be built to incidentally block them.
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
