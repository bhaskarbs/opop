package com.openopportunity.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private JavaMailSender mailSender;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                notificationRepository, userRepository, mailSender, "no-reply@test.com", "http://localhost:5173");
    }

    @Test
    void notifyAdminsFansOutToEveryAdminUser() {
        User admin1 = new User("admin1@test.com", "hash", "Admin One", UserRole.ADMIN);
        User admin2 = new User("admin2@test.com", "hash", "Admin Two", UserRole.ADMIN);
        when(userRepository.findByRole(UserRole.ADMIN)).thenReturn(List.of(admin1, admin2));

        notificationService.notifyAdmins(
                NotificationType.JOB_PENDING_APPROVAL, "New job awaiting approval.", "/admin/approvals/jobs");

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository, times(2)).save(captor.capture());
        assertThat(captor.getAllValues())
                .extracting(Notification::getRecipientUserId)
                .containsExactlyInAnyOrder(admin1.getId(), admin2.getId());
        assertThat(captor.getAllValues())
                .allSatisfy(notification -> assertThat(notification.getType())
                        .isEqualTo(NotificationType.JOB_PENDING_APPROVAL));
    }

    @Test
    void notifyAdminsDoesNothingWhenNoAdminsExist() {
        when(userRepository.findByRole(UserRole.ADMIN)).thenReturn(List.of());

        notificationService.notifyAdmins(NotificationType.IDEA_PENDING_APPROVAL, "New idea.", null);

        verify(notificationRepository, never()).save(any());
    }
}
