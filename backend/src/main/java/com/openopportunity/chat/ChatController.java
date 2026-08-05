package com.openopportunity.chat;

import com.openopportunity.chat.dto.ChatRequest;
import com.openopportunity.chat.dto.ChatResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public (see SecurityConfig) — a support widget needs to work for a visitor who hasn't signed
 * up yet, not just logged-in users. */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public ChatResponse chat(@Valid @RequestBody ChatRequest request, HttpServletRequest servletRequest) {
        String reply = chatService.chat(servletRequest.getRemoteAddr(), request.message(), request.history());
        return new ChatResponse(reply);
    }
}
