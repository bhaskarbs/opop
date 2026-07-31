package com.openopportunity.storage;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import net.coobird.thumbnailator.Thumbnails;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Downscales candidate profile photos and company logos before they're stored — both are only
 * ever displayed as small avatars (46-58px across job cards, candidate cards, and profile
 * pages), so storing/serving an original upload (up to 5MB) wastes bandwidth on some of the
 * app's most frequently-loaded images. 256px comfortably covers even a 3x-retina render of the
 * largest on-screen size while cutting a multi-MB photo down to a few KB. */
public final class AvatarImageResizer {

    private static final Logger log = LoggerFactory.getLogger(AvatarImageResizer.class);
    private static final int MAX_DIMENSION = 256;

    private AvatarImageResizer() {}

    /** Fits the image within MAX_DIMENSION x MAX_DIMENSION (preserving aspect ratio, no
     * cropping) and re-encodes it in its original format. Falls back to returning the original
     * bytes unchanged if the image can't be decoded — e.g. a content type the JDK's built-in
     * ImageIO has no reader for (WEBP support isn't bundled by default) or a corrupt file —
     * rather than failing the whole upload over a resize that isn't essential. */
    public static byte[] resize(byte[] original) {
        try {
            ByteArrayOutputStream output = new ByteArrayOutputStream();
            Thumbnails.of(new ByteArrayInputStream(original))
                    .size(MAX_DIMENSION, MAX_DIMENSION)
                    .outputQuality(0.85)
                    .toOutputStream(output);
            return output.toByteArray();
        } catch (Exception ex) {
            log.warn("Could not resize uploaded avatar image, storing original: {}", ex.getMessage());
            return original;
        }
    }
}
