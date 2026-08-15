package com.openopportunity.admin.dto;

/** recipientCount is the number of distinct, valid addresses the send was queued for — sends
 * happen asynchronously (see AsyncEmailSender), so this confirms what was accepted, not that
 * every message has actually been delivered yet. */
public record BroadcastEmailResult(int recipientCount) {}
