package com.openopportunity.storage;

import java.util.Optional;

/** Verifies an upload is actually one of the image formats it claims to be, by checking the
 * file's magic-byte signature — rather than trusting the client-supplied Content-Type header
 * (trivially spoofable by anyone not going through a browser's file picker, e.g. a raw HTTP
 * client), which is all CandidateProfileService.validatePhoto / CompanyProfileService.validateLogo
 * previously checked. Deliberately signature-based rather than a full decode: the JDK's built-in
 * ImageIO has no WEBP reader (see AvatarImageResizer), so a "must fully decode" check would
 * reject every legitimate WEBP upload even though WEBP is an explicitly supported format here. */
public final class ImageContentValidator {

    private ImageContentValidator() {}

    /** Returns the detected content type (one of image/jpeg, image/png, image/webp) if the bytes
     * match a known image signature, or empty if they match none — the caller should reject the
     * upload in that case rather than trusting whatever Content-Type the client claimed. */
    public static Optional<String> detectContentType(byte[] bytes) {
        if (isJpeg(bytes)) {
            return Optional.of("image/jpeg");
        }
        if (isPng(bytes)) {
            return Optional.of("image/png");
        }
        if (isWebp(bytes)) {
            return Optional.of("image/webp");
        }
        return Optional.empty();
    }

    private static boolean isJpeg(byte[] bytes) {
        return bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xD8
                && (bytes[2] & 0xFF) == 0xFF;
    }

    private static boolean isPng(byte[] bytes) {
        byte[] signature = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        return startsWith(bytes, signature);
    }

    // RIFF....WEBP — bytes 4-7 are the (little-endian) chunk size, which varies per file, so
    // only the "RIFF" prefix and the "WEBP" tag right after it are checked.
    private static boolean isWebp(byte[] bytes) {
        return bytes.length >= 12
                && bytes[0] == 'R'
                && bytes[1] == 'I'
                && bytes[2] == 'F'
                && bytes[3] == 'F'
                && bytes[8] == 'W'
                && bytes[9] == 'E'
                && bytes[10] == 'B'
                && bytes[11] == 'P';
    }

    private static boolean startsWith(byte[] bytes, byte[] prefix) {
        if (bytes.length < prefix.length) {
            return false;
        }
        for (int i = 0; i < prefix.length; i++) {
            if (bytes[i] != prefix[i]) {
                return false;
            }
        }
        return true;
    }
}
