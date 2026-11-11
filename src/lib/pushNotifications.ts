
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { firebaseApp } from "./firebase";

export async function enablePushNotifications(userId: string) {
  if (typeof window === "undefined") {
    throw new Error("Notifications are only available in the browser.");
  }

  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    throw new Error("This browser does not support push notifications.");
  }

  if (!(await isSupported())) {
    throw new Error("Firebase messaging is not supported in this browser.");
  }

  const vapidKey = import.meta.env["VITE_FIREBASE_VAPID_KEY"];

  if (!vapidKey) {
    throw new Error("Firebase VAPID key is missing.");
  }

  const permission = await Notification.requestPermission();

  if (permission !== "granted") {
    throw new Error("Notification permission was not granted.");
  }

  const registration = await navigator.serviceWorker.register(
    "/firebase-messaging-sw.js"
  );

  const messaging = getMessaging(firebaseApp);

  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  if (!token) {
    throw new Error("Could not obtain a Firebase device token.");
  }

  const subscriptionPayload = {
    user_id: userId,
    token,
    platform: "web",
    device_info: navigator.userAgent,
    updated_at: new Date().toISOString(),
  };

  // Device registration is unavailable until notification storage is configured.
  // Never claim success when this installation has no subscriptions table.
  void subscriptionPayload;
  throw new Error("Push notifications are not configured for this site yet.");
}
