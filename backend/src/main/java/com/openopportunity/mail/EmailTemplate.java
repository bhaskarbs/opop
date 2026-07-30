package com.openopportunity.mail;

import java.util.List;

/** The one HTML layout shared by every outgoing email (see EmailService) — a centered white
 * card on a light page background, matching the app's brand colors (StyleGuide.dc.html:
 * Primary Blue #2451D6, Ink #14181F). Built with table-based markup rather than flexbox/grid
 * since several email clients (Outlook in particular) only render a narrow subset of CSS. */
final class EmailTemplate {

    private EmailTemplate() {}

    static String render(String heading, List<String> paragraphs, EmailButton button) {
        StringBuilder paragraphsHtml = new StringBuilder();
        for (String paragraph : paragraphs) {
            paragraphsHtml
                    .append("<p style=\"margin:0 0 14px;font-size:14.5px;line-height:1.7;color:#3A414D;\">")
                    .append(escapeHtml(paragraph))
                    .append("</p>");
        }

        String buttonHtml = button == null
                ? ""
                : """
                <tr>
                  <td style="padding:8px 32px 32px;">
                    <a href="%s" style="display:inline-block;background:#2451D6;color:#FFFFFF;border-radius:9px;padding:12px 24px;font-size:14px;font-weight:700;text-decoration:none;">%s</a>
                  </td>
                </tr>
                """
                        .formatted(escapeHtml(button.url()), escapeHtml(button.label()));

        return """
                <!doctype html>
                <html>
                  <body style="margin:0;padding:0;background-color:#F7F8FA;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#F7F8FA;padding:32px 16px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#FFFFFF;border:1px solid #E2E5EA;border-radius:14px;">
                            <tr>
                              <td style="padding:28px 32px 0;">
                                <span style="font-size:19px;font-weight:800;letter-spacing:-0.01em;color:#14181F;">Open<span style="color:#2451D6;">Opportunity</span></span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:24px 32px 8px;">
                                <h1 style="margin:0 0 16px;font-size:20px;font-weight:700;color:#14181F;">%s</h1>
                                %s
                              </td>
                            </tr>
                            %s
                            <tr>
                              <td style="padding:20px 32px;border-top:1px solid #E2E5EA;">
                                <p style="margin:0;font-size:12.5px;color:#8891A0;">You're receiving this email because of your OpenOpportunity account. If this wasn't you, you can safely ignore it.</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </body>
                </html>
                """
                .formatted(escapeHtml(heading), paragraphsHtml, buttonHtml);
    }

    private static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
