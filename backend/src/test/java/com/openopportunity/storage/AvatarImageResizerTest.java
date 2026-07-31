package com.openopportunity.storage;

import static org.assertj.core.api.Assertions.assertThat;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.Test;

class AvatarImageResizerTest {

    private static byte[] jpegOf(int width, int height) throws IOException {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(image, "jpg", out);
        return out.toByteArray();
    }

    @Test
    void resizeShrinksAnImageLargerThanTheMaxDimension() throws IOException {
        byte[] original = jpegOf(800, 600);

        byte[] resized = AvatarImageResizer.resize(original);

        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(resized));
        assertThat(decoded.getWidth()).isLessThanOrEqualTo(256);
        assertThat(decoded.getHeight()).isLessThanOrEqualTo(256);
        assertThat(resized.length).isLessThan(original.length);
    }

    @Test
    void resizePreservesAspectRatio() throws IOException {
        byte[] original = jpegOf(800, 400);

        byte[] resized = AvatarImageResizer.resize(original);

        BufferedImage decoded = ImageIO.read(new ByteArrayInputStream(resized));
        assertThat(decoded.getWidth()).isEqualTo(256);
        assertThat(decoded.getHeight()).isEqualTo(128);
    }

    @Test
    void resizeFallsBackToTheOriginalBytesWhenTheImageCannotBeDecoded() {
        byte[] notAnImage = "this is not an image".getBytes();

        byte[] result = AvatarImageResizer.resize(notAnImage);

        assertThat(result).isEqualTo(notAnImage);
    }
}
