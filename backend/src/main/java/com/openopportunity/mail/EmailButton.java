package com.openopportunity.mail;

/** An optional call-to-action button rendered inside the branded email layout — see
 * EmailService.send. */
public record EmailButton(String label, String url) {}
