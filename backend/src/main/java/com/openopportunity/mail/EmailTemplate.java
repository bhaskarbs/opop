package com.openopportunity.mail;

import java.util.List;

/** The one HTML layout shared by every outgoing email (see EmailService) — a centered white
 * card on a light page background, matching the app's brand colors (StyleGuide.dc.html:
 * Primary Blue #2451D6, Ink #14181F). Built with table-based markup rather than flexbox/grid
 * since several email clients (Outlook in particular) only render a narrow subset of CSS. */
final class EmailTemplate {

    // Cycled (mod length) across renderCareerGuide's Step 1/2/3/... buttons so each stands out
    // distinctly in sequence, matching the approved design (green/blue/purple) rather than every
    // step looking identical — repeats from green again on a 4th+ step rather than growing the
    // palette indefinitely.
    private static final String[] STEP_BUTTON_COLORS = {"#219653", "#2451D6", "#7C3AED"};

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

    /** The "career guide" email (see EmailService.sendCareerGuide) — a fixed intro (matching the
     * approved copy/design) followed by a row of admin-configured Step 1/2/3/... buttons, each
     * linking out to a video to watch. Reuses the same branded card wrapper as render() above,
     * but the intro paragraphs and steps row are bespoke to this email rather than going through
     * the generic paragraphs/button shape, since this needs inline bold text and a variable-width
     * multi-button row that the generic template doesn't support. */
    static String renderCareerGuide(List<CareerGuideStepCta> steps) {
        String introHtml = """
                <p style="margin:0 0 14px;font-size:14.5px;line-height:1.7;color:#3A414D;">Dear Candidate,</p>
                <p style="margin:0 0 14px;font-size:14.5px;line-height:1.7;color:#3A414D;">We understand how challenging it can be to search for the right job for weeks or even months. Many talented candidates face rejection&mdash;not because they lack potential, but because the world of careers is changing faster than ever before.</p>
                <p style="margin:0;font-size:14.5px;line-height:1.7;color:#3A414D;">Instead of only applying for more jobs, take a few minutes to understand <strong>how the job market is evolving, what employers expect today, and how you can prepare yourself for future opportunities</strong>.</p>
                """;

        StringBuilder stepCells = new StringBuilder();
        for (int i = 0; i < steps.size(); i++) {
            CareerGuideStepCta step = steps.get(i);
            String buttonColor = STEP_BUTTON_COLORS[i % STEP_BUTTON_COLORS.length];
            stepCells.append(
                    """
                    <td valign="top" style="padding:0 10px 0 0;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%%">
                        <tr>
                          <td style="padding:0 0 14px;font-size:13px;line-height:1.5;color:#3A414D;">%s</td>
                        </tr>
                        <tr>
                          <td>
                            <a href="%s" style="display:inline-block;white-space:nowrap;background:%s;color:#FFFFFF;border-radius:24px;padding:12px 22px;font-size:14px;font-weight:700;text-decoration:none;">Step %d</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                    """
                            .formatted(
                                    escapeHtml(step.description()),
                                    escapeHtml(step.url()),
                                    buttonColor,
                                    step.stepNumber()));
            if (i < steps.size() - 1) {
                stepCells.append(
                        "<td valign=\"bottom\" style=\"padding:0 10px 18px;font-size:18px;color:#9CA3AF;\">&rarr;</td>");
            }
        }

        String stepsHtml = """
                <tr>
                  <td style="padding:16px 32px 8px;border-top:1px solid #E2E5EA;text-align:center;">
                    <p style="margin:0 0 18px;font-size:13px;font-weight:700;letter-spacing:0.01em;color:#14181F;">Click the buttons below in order to get started</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 32px 32px;">
                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0"><tr>%s</tr></table>
                  </td>
                </tr>
                """
                .formatted(stepCells);

        return """
                <!doctype html>
                <html>
                  <body style="margin:0;padding:0;background-color:#F7F8FA;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
                    <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="background-color:#F7F8FA;padding:32px 16px;">
                      <tr>
                        <td align="center">
                          <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#FFFFFF;border:1px solid #E2E5EA;border-radius:14px;">
                            <tr>
                              <td style="padding:28px 32px 0;">
                                <span style="font-size:19px;font-weight:800;letter-spacing:-0.01em;color:#14181F;">Open<span style="color:#2451D6;">Opportunity</span></span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:24px 32px 8px;">
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
                .formatted(introHtml, stepsHtml);
    }

    private static String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }
}
