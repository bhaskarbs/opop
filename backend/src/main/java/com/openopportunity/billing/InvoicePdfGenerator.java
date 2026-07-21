package com.openopportunity.billing;

import com.openopportunity.auth.User;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;

/** Renders a one-page PDF receipt for a single PAID BillingTransaction — the "Download invoice"
 * link on CandidateBillingPage.tsx. Kept as plain text/rules rather than a templating engine
 * since it's one fixed layout with no variants.
 *
 * <p>Every text() call returns the baseline for the *next* line (current y minus that call's own
 * line height, roughly 1.4x font size) — callers chain with {@code y = text(...)} and must never
 * re-derive a y offset themselves, since that's what previously produced overlapping lines. */
final class InvoicePdfGenerator {

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("dd MMM yyyy").withZone(ZoneOffset.UTC);
    private static final float MARGIN = 56f;
    private static final float PAGE_WIDTH = PDRectangle.A4.getWidth();

    private InvoicePdfGenerator() {}

    static byte[] generate(BillingTransaction transaction, User candidate) {
        try (PDDocument document = new PDDocument()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);

            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = PDRectangle.A4.getHeight() - MARGIN;

                y = text(content, PDType1Font.HELVETICA_BOLD, 20, MARGIN, y, "OpenOpportunity");
                y = text(content, PDType1Font.HELVETICA, 11, MARGIN, y, "Payment invoice");
                y -= 14;
                y = rule(content, y);
                y -= 26;

                y = text(
                        content,
                        PDType1Font.HELVETICA_BOLD,
                        11,
                        MARGIN,
                        y,
                        "Invoice No: INV-" + transaction.getId().toString().substring(0, 8).toUpperCase());
                y = text(content, PDType1Font.HELVETICA, 11, MARGIN, y, "Date: " + DATE_FORMAT.format(transaction.getCreatedAt()));
                y -= 14;

                y = text(content, PDType1Font.HELVETICA_BOLD, 11, MARGIN, y, "Billed to");
                y = text(content, PDType1Font.HELVETICA, 11, MARGIN, y, candidate.getFullName());
                y = text(content, PDType1Font.HELVETICA, 11, MARGIN, y, candidate.getEmail());
                y -= 14;
                y = rule(content, y);
                y -= 26;

                float amountX = PAGE_WIDTH - MARGIN - 80;
                float tableHeaderY = y;
                y = text(content, PDType1Font.HELVETICA_BOLD, 11, MARGIN, y, "Description");
                text(content, PDType1Font.HELVETICA_BOLD, 11, amountX, tableHeaderY, "Amount");
                y -= 6;

                float rowY = y;
                y = text(
                        content,
                        PDType1Font.HELVETICA,
                        11,
                        MARGIN,
                        y,
                        planLabel(transaction) + " plan — monthly subscription");
                text(content, PDType1Font.HELVETICA, 11, amountX, rowY, "Rs. " + transaction.getAmountRupees());
                y -= 14;
                y = rule(content, y);
                y -= 26;

                float totalRowY = y;
                y = text(content, PDType1Font.HELVETICA_BOLD, 11, MARGIN, y, "Total paid");
                text(content, PDType1Font.HELVETICA_BOLD, 11, amountX, totalRowY, "Rs. " + transaction.getAmountRupees());
                y -= 24;

                if (transaction.getRazorpayPaymentId() != null) {
                    y = text(
                            content,
                            PDType1Font.HELVETICA,
                            10,
                            MARGIN,
                            y,
                            "Payment reference: " + transaction.getRazorpayPaymentId());
                }
                y = text(content, PDType1Font.HELVETICA, 10, MARGIN, y, "Status: Paid");

                y -= 30;
                text(
                        content,
                        PDType1Font.HELVETICA_OBLIQUE,
                        9,
                        MARGIN,
                        y,
                        "This is a system-generated invoice and does not require a signature.");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            document.save(out);
            return out.toByteArray();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private static String planLabel(BillingTransaction transaction) {
        String name = transaction.getPlan().name();
        return name.charAt(0) + name.substring(1).toLowerCase();
    }

    /** Draws one line at the given baseline and returns the baseline for the next line
     * (y minus ~1.4x this line's font size — generous enough that ascenders/descenders of
     * adjacent lines never touch). */
    private static float text(
            PDPageContentStream content, PDType1Font font, float size, float x, float y, String value) {
        try {
            content.beginText();
            content.setFont(font, size);
            content.newLineAtOffset(x, y);
            content.showText(value);
            content.endText();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
        return y - (size * 1.4f);
    }

    private static float rule(PDPageContentStream content, float y) {
        try {
            content.setLineWidth(0.75f);
            content.moveTo(MARGIN, y);
            content.lineTo(PAGE_WIDTH - MARGIN, y);
            content.stroke();
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
        return y;
    }
}
