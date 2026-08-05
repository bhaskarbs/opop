package com.openopportunity.chat;

import java.util.List;

/** One cached FAQ answer — see chat-faq-cache.json for the actual content and ChatFaqCache for
 * how triggers are matched. */
record ChatFaqEntry(String id, List<String> triggers, String answer) {}
