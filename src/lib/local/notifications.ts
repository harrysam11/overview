import { readVaultData, updateVaultData } from "@/lib/local/vault";
import type { LocalNotificationSettings } from "@/lib/local/schema";

export const getNotificationSettings = async (): Promise<LocalNotificationSettings> => {
  const data = await readVaultData();
  return (
    data.notification_settings || {
      enabled: false,
      morning_time: "08:00",
      evening_time: "21:00",
      last_notified_date: "",
    }
  );
};

export const updateNotificationSettings = async (
  settings: Partial<LocalNotificationSettings>
): Promise<LocalNotificationSettings> => {
  let updated: LocalNotificationSettings;
  await updateVaultData((data) => {
    updated = {
      ...(data.notification_settings || {
        enabled: false,
        morning_time: "08:00",
        evening_time: "21:00",
        last_notified_date: "",
      }),
      ...settings,
    };
    return {
      ...data,
      notification_settings: updated,
    };
  });
  return updated!;
};

export const requestBrowserNotificationPermission = async (): Promise<boolean> => {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  } catch {
    return false;
  }
};

export const showLocalNotification = (title: string, body: string, icon = "/favicon.ico"): boolean => {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon });
      return true;
    } catch {
      return false;
    }
  }
  return false;
};

export const checkAndTriggerHabitReminders = async (
  pendingHabits: number | any[]
): Promise<void> => {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const count = typeof pendingHabits === "number" ? pendingHabits : Array.isArray(pendingHabits) ? pendingHabits.length : 0;
  const settings = await getNotificationSettings();
  if (!settings.enabled) return;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  if (settings.last_notified_date === `${today}-${currentTime}`) return;

  if (currentTime === settings.morning_time && count > 0) {
    showLocalNotification(
      "Good Morning from HabitFlow ☀️",
      `You have ${count} habits planned for today. Start strong!`
    );
    await updateNotificationSettings({ last_notified_date: `${today}-${currentTime}` });
  } else if (currentTime === settings.evening_time && count > 0) {
    showLocalNotification(
      "Evening Reflection & Check-in 🌙",
      `You have ${count} habits remaining today. Complete them before midnight!`
    );
    await updateNotificationSettings({ last_notified_date: `${today}-${currentTime}` });
  }
};
