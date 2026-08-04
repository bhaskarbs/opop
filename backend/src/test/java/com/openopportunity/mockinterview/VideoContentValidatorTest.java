package com.openopportunity.mockinterview;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

class VideoContentValidatorTest {

    @Test
    void acceptsBytesStartingWithTheRealEbmlHeader() {
        byte[] content = {(byte) 0x1A, (byte) 0x45, (byte) 0xDF, (byte) 0xA3, 1, 2, 3};
        MockMultipartFile file = new MockMultipartFile("video", "interview.webm", "video/webm", content);

        assertThat(VideoContentValidator.isWebm(file)).isTrue();
    }

    @Test
    void rejectsArbitraryBytesEvenWithASpoofedContentType() {
        MockMultipartFile file =
                new MockMultipartFile("video", "interview.webm", "video/webm", new byte[] {1, 2, 3, 4});

        assertThat(VideoContentValidator.isWebm(file)).isFalse();
    }

    @Test
    void rejectsAFileShorterThanTheHeader() {
        MockMultipartFile file = new MockMultipartFile("video", "interview.webm", "video/webm", new byte[] {0x1A});

        assertThat(VideoContentValidator.isWebm(file)).isFalse();
    }
}
