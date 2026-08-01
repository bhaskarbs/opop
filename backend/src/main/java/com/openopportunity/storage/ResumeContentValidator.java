package com.openopportunity.storage;

/** Verifies a resume upload's actual bytes look like one of the claimed document formats, by
 * checking each format's magic-byte signature — the filename extension alone (previously the
 * only check, see CandidateProfileService.validate) is trivially spoofable by renaming any file.
 * DOCX is a ZIP container, so isDocx only confirms "a well-formed ZIP", not specifically a Word
 * document — actually parsing it is heavier than justified for an upload-time gate, and
 * ResumeHtmlRenderer already does that (and fails safely) on demand when a company views it. */
public final class ResumeContentValidator {

    private ResumeContentValidator() {}

    public static boolean looksLikeAnAllowedDocument(byte[] bytes) {
        return isPdf(bytes) || isDoc(bytes) || isDocx(bytes);
    }

    private static boolean isPdf(byte[] bytes) {
        byte[] signature = {'%', 'P', 'D', 'F', '-'};
        return startsWith(bytes, signature);
    }

    // The legacy OLE Compound File Binary Format signature — covers .doc (and also .xls/.ppt,
    // but this is only ever checked after the .doc/.docx/.pdf extension gate in
    // CandidateProfileService.validate, so that ambiguity doesn't matter here).
    private static boolean isDoc(byte[] bytes) {
        byte[] signature = {
            (byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1
        };
        return startsWith(bytes, signature);
    }

    private static boolean isDocx(byte[] bytes) {
        byte[] signature = {'P', 'K', 0x03, 0x04};
        return startsWith(bytes, signature);
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
