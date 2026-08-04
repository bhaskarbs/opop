package com.openopportunity.mockinterview;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import org.springframework.web.multipart.MultipartFile;

/** Verifies an upload is actually a WebM video by checking its magic-byte signature (the EBML
 * header every WebM/Matroska file starts with), rather than trusting the client-supplied
 * Content-Type header — trivially spoofable by anyone not going through the browser's
 * MediaRecorder flow (see frontend MockInterviewPage.tsx, the only real producer, which always
 * emits video/webm). Only reads the first few bytes rather than the whole file: a recording can
 * be up to 150MB, much larger than the image/resume uploads ImageContentValidator/
 * ResumeContentValidator check (which load the whole file, but those are capped far smaller). */
final class VideoContentValidator {

    private static final byte[] EBML_HEADER = {(byte) 0x1A, (byte) 0x45, (byte) 0xDF, (byte) 0xA3};

    private VideoContentValidator() {}

    static boolean isWebm(MultipartFile file) {
        byte[] header = new byte[EBML_HEADER.length];
        int read;
        try (InputStream in = file.getInputStream()) {
            read = in.readNBytes(header, 0, header.length);
        } catch (IOException ex) {
            return false;
        }
        return read == header.length && Arrays.equals(header, EBML_HEADER);
    }
}
