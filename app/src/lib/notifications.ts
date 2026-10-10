import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { IS_EXPO_GO } from './config';
import { formatMonthDay, formatRange } from './time';
import type { CarRequest, Role } from './types';

export const CHANNEL_ID = 'car-requests';

export type NotificationData = { requestId?: string; type?: string };

export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Car requests',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 200, 120, 200],
      lightColor: '#4F46E5',
    });
  }
}

export async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

/**
 * Expo push token for remote notifications, or null when remote push isn't possible:
 * Expo Go (SDK 53+), simulators, or no EAS projectId configured yet. In those cases the
 * app falls back to local notifications triggered by realtime events.
 */
export async function getPushToken(): Promise<string | null> {
  if (IS_EXPO_GO || !Device.isDevice) return null;
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
  if (!projectId) return null;
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return data;
  } catch (err) {
    console.warn('Push token unavailable:', err);
    return null;
  }
}

export async function showLocalNotification(title: string, body: string, data: NotificationData) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: true },
      trigger: Platform.OS === 'android' ? { channelId: CHANNEL_ID } : null,
    });
  } catch (err) {
    console.warn('Could not show notification:', err);
  }
}

export function setAppBadge(count: number) {
  void Notifications.setBadgeCountAsync(count).catch(() => undefined);
}

/**
 * Builds the notification the current user should have received for a change that happened
 * while the app wasn't connected (mirrors the server's push copy). Returns null if the
 * change isn't something this user gets notified about.
 */
export function notificationForChange(
  prev: CarRequest | undefined,
  next: CarRequest,
  role: Role
): { title: string; body: string } | null {
  const day = formatMonthDay(next.requestedDate);
  const requested = formatRange(next.requestedStartTime, next.requestedEndTime);
  const alt =
    next.alternativeStartTime && next.alternativeEndTime
      ? formatRange(next.alternativeStartTime, next.alternativeEndTime)
      : '';

  if (role === 'APPROVER') {
    if (!prev && next.status === 'PENDING') {
      return {
        title: 'New Car Request',
        body: `${next.requesterName} wants to use the car on ${day} from ${requested}. Tap to review.`,
      };
    }
    if (prev?.status === 'ALTERNATIVE_PROPOSED' && next.status === 'APPROVED') {
      return { title: 'Time Accepted', body: `${next.requesterName} accepted the suggested time. ${day}, ${alt}` };
    }
    if (prev?.status === 'ALTERNATIVE_PROPOSED' && next.status === 'DECLINED') {
      return {
        title: 'Alternative Time Declined',
        body: `${next.requesterName} declined the suggested time of ${alt}.`,
      };
    }
    return null;
  }

  if (prev?.status !== 'PENDING' || next.status === 'PENDING') return null;
  switch (next.status) {
    case 'APPROVED':
      return { title: 'Car Request Approved', body: `Your request for ${day} from ${requested} was approved.` };
    case 'REJECTED':
      return {
        title: 'Car Request Rejected',
        body: `Your request for ${day} was rejected.\nReason: "${next.rejectionReason ?? ''}"`,
      };
    case 'ALTERNATIVE_PROPOSED':
      return {
        title: 'Alternative Car Time',
        body: `The car isn't available during your requested time. Available: ${alt}. Tap to respond.`,
      };
    default:
      return null;
  }
}
