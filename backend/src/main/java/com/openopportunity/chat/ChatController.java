package com.openopportunity.chat;

import com.openopportunity.chat.dto.ChatRequest;
import com.openopportunity.chat.dto.ChatResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Public (see SecurityConfig) — a support widget needs to work for a visitor who hasn't signed
 * up yet, not just logged-in users. Still reads whatever Authentication JwtAuthenticationFilter
 * already populated when a valid bearer token IS present (that filter runs on every request
 * regardless of permitAll — see its Javadoc), so a logged-in company gets the search_candidates
 * tool (see ChatService/ChatTool) while an anonymous visitor or candidate doesn't. */
@RestController
@RequestMapping("/api/chat")
public class ChatController {

    private final ChatService chatService;

    public ChatController(ChatService chatService) {
        this.chatService = chatService;
    }

    @PostMapping
    public ChatResponse chat(@Valid @RequestBody ChatRequest request, HttpServletRequest servletRequest) {
        String reply = chatService.chat(
                servletRequest.getRemoteAddr(),
                currentUserIdOrNull(),
                currentUserRoleOrNull(),
                request.message(),
                request.history());
        return new ChatResponse(reply);
    }

    /** Same pattern as JobController's public GET /{id} — an anonymous request still gets an
     * Authentication object from Spring Security, but its principal is the string
     * "anonymousUser" rather than a UUID. */
    private UUID currentUserIdOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        Object principal = authentication == null ? null : authentication.getPrincipal();
        return principal instanceof UUID userId ? userId : null;
    }

    private String currentUserRoleOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null) {
            return null;
        }
        return authentication.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> authority.substring("ROLE_".length()))
                .findFirst()
                .orElse(null);
    }
}
