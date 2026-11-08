
importScripts(
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-app-compat.js"
);
importScripts(
  "https://www.gstatic.com/firebasejs/13.2.0/firebase-messaging-compat.js"
);

firebase.initializeApp({
  apiKey: "AIzaSyC3_QZwJ2o23wPr3uLK4DZNATBAtIiHTvc",
  authDomain: "enkingi-43715.firebaseapp.com",
  projectId: "enkingi-43715",
  storageBucket: "enkingi-43715.firebasestorage.app",
  messagingSenderId: "627693672726",
  appId: "1:627693672726:web:e683681e29988d20091837",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Firebase automatically displays notification payloads.
  // This handles messages containing data only.
  if (!payload.notification && payload.data) {
    const title = payload.data.title || "eNkingi";
    const options = {
      body: payload.data.body || "You have a new notification.",
      icon: "/enkingi-logo.png",
      data: {
        url: payload.data.url || "/",
      },
    };

    self.registration.showNotification(title, options);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  event.waitUntil(
    clients.openWindow(url)
  );
});
