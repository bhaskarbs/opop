package com.openopportunity.auth;

import java.io.IOException;
import java.io.InputStream;
import java.util.stream.Collectors;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.hwpf.HWPFDocument;
import org.apache.poi.hwpf.usermodel.Paragraph;
import org.apache.poi.hwpf.usermodel.Range;
import org.apache.poi.xwpf.usermodel.IBodyElement;
import org.apache.poi.xwpf.usermodel.UnderlinePatterns;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableCell;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;

/** Converts an uploaded resume (.pdf/.docx/.doc) into a small HTML fragment for the company-side
 * "view resume as a web view" preview (see CandidateSearchService.getResumeHtml) — a fragment
 * (no {@code <html>}/{@code <body>}), meant to be dropped straight into a container element. Only
 * an allow-listed set of tags is ever emitted (p, strong, em, u, li, ul, table/tr/td), and every
 * piece of extracted text is HTML-escaped first, since resume content is untrusted input. */
final class ResumeHtmlRenderer {

    private ResumeHtmlRenderer() {}

    static String render(InputStream in, String fileName) throws IOException {
        String lower = fileName == null ? "" : fileName.toLowerCase();
        if (lower.endsWith(".pdf")) {
            return renderPdf(in);
        }
        if (lower.endsWith(".docx")) {
            return renderDocx(in);
        }
        if (lower.endsWith(".doc")) {
            return renderDoc(in);
        }
        throw new IOException("Unsupported resume file type: " + fileName);
    }

    private static String renderPdf(InputStream in) throws IOException {
        try (PDDocument document = PDDocument.load(in)) {
            String text = new PDFTextStripper().getText(document);
            return linesToHtml(text.split("\\r?\\n"));
        }
    }

    private static String renderDocx(InputStream in) throws IOException {
        try (XWPFDocument document = new XWPFDocument(in)) {
            StringBuilder html = new StringBuilder();
            boolean inList = false;
            for (IBodyElement element : document.getBodyElements()) {
                if (element instanceof XWPFParagraph paragraph) {
                    String runsHtml = runsToHtml(paragraph);
                    if (runsHtml.isBlank()) {
                        inList = closeListIfOpen(html, inList);
                        continue;
                    }
                    boolean bullet = paragraph.getNumID() != null;
                    if (bullet && !inList) {
                        html.append("<ul>");
                        inList = true;
                    } else if (!bullet) {
                        inList = closeListIfOpen(html, inList);
                    }
                    String tag = bullet ? "li" : "p";
                    html.append('<').append(tag).append('>').append(runsHtml).append("</").append(tag).append('>');
                } else if (element instanceof XWPFTable table) {
                    inList = closeListIfOpen(html, inList);
                    html.append(tableToHtml(table));
                }
            }
            closeListIfOpen(html, inList);
            return html.toString();
        }
    }

    private static boolean closeListIfOpen(StringBuilder html, boolean inList) {
        if (inList) {
            html.append("</ul>");
        }
        return false;
    }

    private static String runsToHtml(XWPFParagraph paragraph) {
        return paragraph.getRuns().stream().map(ResumeHtmlRenderer::runToHtml).collect(Collectors.joining());
    }

    private static String runToHtml(XWPFRun run) {
        String text = run.text();
        if (text == null || text.isEmpty()) {
            return "";
        }
        String escaped = escapeHtml(text);
        if (run.isBold()) {
            escaped = "<strong>" + escaped + "</strong>";
        }
        if (run.isItalic()) {
            escaped = "<em>" + escaped + "</em>";
        }
        if (run.getUnderline() != UnderlinePatterns.NONE) {
            escaped = "<u>" + escaped + "</u>";
        }
        return escaped;
    }

    private static String tableToHtml(XWPFTable table) {
        StringBuilder html = new StringBuilder("<table>");
        for (XWPFTableRow row : table.getRows()) {
            html.append("<tr>");
            for (XWPFTableCell cell : row.getTableCells()) {
                html.append("<td>").append(escapeHtml(cell.getText())).append("</td>");
            }
            html.append("</tr>");
        }
        return html.append("</table>").toString();
    }

    private static String renderDoc(InputStream in) throws IOException {
        try (HWPFDocument document = new HWPFDocument(in)) {
            Range range = document.getRange();
            StringBuilder html = new StringBuilder();
            for (int i = 0; i < range.numParagraphs(); i++) {
                Paragraph paragraph = range.getParagraph(i);
                String text = paragraph.text().trim();
                if (!text.isEmpty()) {
                    html.append("<p>").append(escapeHtml(text)).append("</p>");
                }
            }
            return html.toString();
        }
    }

    private static String linesToHtml(String[] lines) {
        StringBuilder html = new StringBuilder();
        for (String line : lines) {
            String trimmed = line.trim();
            if (!trimmed.isEmpty()) {
                html.append("<p>").append(escapeHtml(trimmed)).append("</p>");
            }
        }
        return html.toString();
    }

    private static String escapeHtml(String text) {
        return text.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}
