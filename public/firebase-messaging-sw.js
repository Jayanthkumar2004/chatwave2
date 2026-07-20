// public/firebase-messaging-sw.js
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "AIzaSyCecjRWkmgpgBHzh23qF_6WXMJnThGI1Ps",
  authDomain: "chatwave-c9810.firebaseapp.com",
  projectId: "chatwave-c9810",
  storageBucket: "chatwave-c9810.firebasestorage.app",
  messagingSenderId: "1089816295813",
  appId: "1:1089816295813:web:fe08aa5b81e5f65f436cec",
});

// Get messaging instance
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "New message";
  const body = payload.notification?.body || "You have a new notification";

  self.registration.showNotification(title, {
    body,
    icon: "/pwa-192x192.png",
  });
});
