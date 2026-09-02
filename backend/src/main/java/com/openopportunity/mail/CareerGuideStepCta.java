package com.openopportunity.mail;

/** One "Step N" button rendered by EmailTemplate.renderCareerGuide — see
 * EmailService.sendCareerGuide. stepNumber drives the button label ("Step 1", "Step 2", ...); the
 * description is the short line of copy above it; url is where clicking the button sends the
 * recipient (the video to watch). */
public record CareerGuideStepCta(int stepNumber, String description, String url) {}
