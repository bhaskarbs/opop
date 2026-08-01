package com.openopportunity.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Optional;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class ImageContentValidatorTest {

    private static byte[] jpegBytes() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "jpg", out);
        return out.toByteArray();
    }

    private static byte[] pngBytes() throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(new BufferedImage(4, 4, BufferedImage.TYPE_INT_RGB), "png", out);
        return out.toByteArray();
    }

    @Test
    void detectsARealJpeg() throws IOException {
        assertThat(ImageContentValidator.detectContentType(jpegBytes())).contains("image/jpeg");
    }

    @Test
    void detectsARealPng() throws IOException {
        assertThat(ImageContentValidator.detectContentType(pngBytes())).contains("image/png");
    }

    @Test
    void detectsAWebpByItsRiffContainerSignature() {
        // A minimal, syntactically valid RIFF/WEBP header — this codebase has no WEBP encoder
        // available (see AvatarImageResizer), so this is built directly rather than generated.
        byte[] webp = {
            'R', 'I', 'F', 'F', 0, 0, 0, 0, 'W', 'E', 'B', 'P', 'V', 'P', '8', ' '
        };
        assertThat(ImageContentValidator.detectContentType(webp)).contains("image/webp");
    }

    @Test
    void rejectsBytesThatArentAnyKnownImageFormatRegardlessOfClaimedType() {
        Optional<String> detected =
                ImageContentValidator.detectContentType("not actually an image".getBytes());
        assertThat(detected).isEmpty();
    }

    @Test
    void rejectsAnEmptyOrTooShortByteArray() {
        assertThat(ImageContentValidator.detectContentType(new byte[0])).isEmpty();
        assertThat(ImageContentValidator.detectContentType(new byte[] {(byte) 0xFF})).isEmpty();
    }
}
