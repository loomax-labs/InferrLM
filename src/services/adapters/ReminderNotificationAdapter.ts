import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

const REMINDER_CHANNEL = 'inferrlm-reminders';

let ready = false;

export const initReminderNotifications = async (): Promise<void> => {
  if (ready) {
    return;
  }

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(REMINDER_CHANNEL, {
      name: 'Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#660880',
    });
  }

  ready = true;
  console.log('notify_init_ok');
};

export const getReminderChannelId = (): string | undefined => {
  return Platform.OS === 'android' ? REMINDER_CHANNEL : undefined;
};

export const requestReminderPermission = async (): Promise<boolean> => {
  await initReminderNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) {
    console.log('notify_perm_ok');
    return true;
  }

  const next = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  console.log('notify_perm_req', { granted: next.granted });
  return next.granted;
};

export const listScheduledReminders = async (): Promise<Notifications.NotificationRequest[]> => {
  await initReminderNotifications();
  return Notifications.getAllScheduledNotificationsAsync();
};
