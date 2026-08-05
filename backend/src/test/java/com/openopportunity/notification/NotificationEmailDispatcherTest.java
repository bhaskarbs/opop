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
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

/** The actual email-sending work, moved here out of NotificationServiceTest since it's now
 * shared by both NotificationEventPublisher implementations (see the class javadoc) rather than
 * being NotificationService's own concern. */
@ExtendWith(MockitoExtension.class)
class NotificationEmailDispatcherTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AsyncEmailSender asyncEmailSender;

    private NotificationEmailDispatcher dispatcher;

    @BeforeEach
    void setUp() {
        dispatcher = new NotificationEmailDispatcher(
                notificationRepository, userRepository, asyncEmailSender, "http://localhost:5173");
    }

    @Test
    void dispatchesToTheRecipientsEmailAddress() {
        UUID notificationId = UUID.randomUUID();
        UUID recipientId = UUID.randomUUID();
        User recipient = new User("candidate@test.com", "hash", "Candidate", UserRole.CANDIDATE);
        when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipient));

        dispatcher.dispatch(notificationId, recipientId, "Your application moved forward.", "/jobs");

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
    void marksTheNotificationEmailSentOnceTheAsyncSendSucceeds() {
        UUID notificationId = UUID.randomUUID();
        UUID recipientId = UUID.randomUUID();
        User recipient = new User("candidate@test.com", "hash", "Candidate", UserRole.CANDIDATE);
        when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipient));
        Notification notification =
                new Notification(recipientId, NotificationType.APPLICATION_STATUS_CHANGED, "moved forward", "/jobs");
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.of(notification));

        dispatcher.dispatch(notificationId, recipientId, "Your application moved forward.", "/jobs");

        ArgumentCaptor<Runnable> onSuccessCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(asyncEmailSender)
                .sendBestEffort(
                        eq("candidate@test.com"),
                        anyString(),
                        anyString(),
                        anyList(),
                        any(EmailButton.class),
                        onSuccessCaptor.capture());
        assertThat(notification.isEmailSent()).isFalse();

        onSuccessCaptor.getValue().run();

        assertThat(notification.isEmailSent()).isTrue();
        verify(notificationRepository).save(notification);
    }

    @Test
    void doesNotAttemptEmailWhenRecipientNoLongerExists() {
        UUID notificationId = UUID.randomUUID();
        UUID recipientId = UUID.randomUUID();
        when(userRepository.findById(recipientId)).thenReturn(Optional.empty());

        dispatcher.dispatch(notificationId, recipientId, "New idea.", null);

        verify(asyncEmailSender, never()).sendBestEffort(any(), any(), any(), anyList(), any(), any());
    }

    @Test
    void usesNoButtonWhenThereIsNoLink() {
        UUID notificationId = UUID.randomUUID();
        UUID recipientId = UUID.randomUUID();
        User recipient = new User("candidate@test.com", "hash", "Candidate", UserRole.CANDIDATE);
        when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipient));

        dispatcher.dispatch(notificationId, recipientId, "New idea.", null);

        verify(asyncEmailSender)
                .sendBestEffort(eq("candidate@test.com"), anyString(), anyString(), anyList(), eq(null), any());
    }

    @Test
    void doesNotFailWhenTheNotificationRowIsGoneByTheTimeTheSendSucceeds() {
        UUID notificationId = UUID.randomUUID();
        UUID recipientId = UUID.randomUUID();
        User recipient = new User("candidate@test.com", "hash", "Candidate", UserRole.CANDIDATE);
        when(userRepository.findById(recipientId)).thenReturn(Optional.of(recipient));
        when(notificationRepository.findById(notificationId)).thenReturn(Optional.empty());

        dispatcher.dispatch(notificationId, recipientId, "New idea.", null);

        ArgumentCaptor<Runnable> onSuccessCaptor = ArgumentCaptor.forClass(Runnable.class);
        verify(asyncEmailSender)
                .sendBestEffort(any(), any(), any(), anyList(), any(), onSuccessCaptor.capture());

        onSuccessCaptor.getValue().run();

        verify(notificationRepository, times(0)).save(any());
    }
}
