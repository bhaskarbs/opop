package com.openopportunity.storage;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ResumeContentValidatorTest {

    @Test
    void acceptsARealPdfSignature() {
        byte[] pdf = "%PDF-1.4\n%some content".getBytes();
        assertThat(ResumeContentValidator.looksLikeAnAllowedDocument(pdf)).isTrue();
    }

    @Test
    void acceptsARealDocxSignatureEvenThoughItsJustAZipContainer() {
        byte[] docx = {'P', 'K', 0x03, 0x04, 0, 0, 0, 0};
        assertThat(ResumeContentValidator.looksLikeAnAllowedDocument(docx)).isTrue();
    }

    @Test
    void acceptsARealLegacyDocSignature() {
        byte[] doc = {
            (byte) 0xD0, (byte) 0xCF, 0x11, (byte) 0xE0, (byte) 0xA1, (byte) 0xB1, 0x1A, (byte) 0xE1
        };
        assertThat(ResumeContentValidator.looksLikeAnAllowedDocument(doc)).isTrue();
    }

    @Test
    void rejectsAFileThatWasJustRenamedRatherThanBeingARealDocument() {
        byte[] fake = "this is plain text pretending to be a resume".getBytes();
        assertThat(ResumeContentValidator.looksLikeAnAllowedDocument(fake)).isFalse();
    }
}
