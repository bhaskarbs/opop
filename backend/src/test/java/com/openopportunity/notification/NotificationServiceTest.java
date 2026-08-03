package com.openopportunity.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.openopportunity.auth.User;
import com.openopportunity.auth.UserRepository;
import com.openopportunity.auth.UserRole;
import com.openopportunity.mail.AsyncEmailSender;
import com.openopportunity.mail.EmailButton;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AsyncEmailSender asyncEmailSender;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(
                notificationRepository, userRepository, asyncEmailSender, "http://localhost:5173");
    }

    @Test
    void notifyAdminsFansOutToEveryAdminUser() {
        User admin1 = new User("admin1@test.com", "hash", "Admin One", UserRole.ADMIN);
        User admin2 = new User("admin2@test.com", "hash", "Admin Two", UserRole.ADMIN);
        when(userRepository.findByRole(UserRole.ADMIN)).thenReturn(List.of(admin1, admin2));
        when(notificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

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

    @Test
    void notifySavesImmediatelyThenDelegatesEmailToAsyncEmailSender() {
        UUID recipientId = UUID.randomUUID();
        User recipient = new User("candidate@test.com", "hash", "Candidate", UserRole.CANDIDATE);
        when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipient));
        when(notificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        notificationService.notify(
                recipientId, NotificationType.APPLICATION_STATUS_CHANGED, "Your application moved forward.", "/jobs");

        verify(notificationRepository).save(any());
        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("candidate@test.com"),
                        anyString(),
                        anyString(),
                        anyList(),
                        any(EmailButton.class),
                        any(Runnable.class));
    }

    @Test
    void notifyMarksTheNotificationEmailSentOnceTheAsyncSendSucceeds() {
        UUID recipientId = UUID.randomUUID();
        User recipient = new User("candidate@test.com", "hash", "Candidate", UserRole.CANDIDATE);
        when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipient));
        when(notificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        ArgumentCaptor<Notification> savedCaptor = ArgumentCaptor.forClass(Notification.class);

        notificationService.notify(
                recipientId, NotificationType.APPLICATION_STATUS_CHANGED, "Your application moved forward.", "/jobs");

        verify(notificationRepository).save(savedCaptor.capture());
        Notification saved = savedCaptor.getValue();
        when(notificationRepository.findById(saved.getId())).thenReturn(Optional.of(saved));

        ArgumentCaptor<Runnable> onSuccessCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("candidate@test.com"),
                        anyString(),
                        anyString(),
                        anyList(),
                        any(EmailButton.class),
                        onSuccessCaptor.capture());
        assertThat(saved.isEmailSent()).isFalse();

        onSuccessCaptor.getValue().run();

        assertThat(saved.isEmailSent()).isTrue();
        verify(notificationRepository, times(2)).save(saved);
    }

    @Test
    void notifyDoesNotAttemptEmailWhenRecipientNoLongerExists() {
        UUID recipientId = UUID.randomUUID();
        when(userRepository.findById(recipientId)).thenReturn(Optional.empty());
        when(notificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        notificationService.notify(recipientId, NotificationType.IDEA_PENDING_APPROVAL, "New idea.", null);

        verify(asyncEmailSender, never())
                .sendBestEffort(any(), any(), any(), anyList(), any(), any());
    }
}
