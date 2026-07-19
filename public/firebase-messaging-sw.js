importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCecjRWkmgpgBHzh23qF_6WXMJnThGI1Ps',
  authDomain: 'chatwave-c9810.firebaseapp.com',
  projectId: 'chatwave-c9810',
  storageBucket: 'chatwave-c9810.firebasestorage.app',
  messagingSenderId: '1089816295813',
  appId: '1:1089816295813:web:fe08aa5b81e5f65f436cec',
});

const messaging = firebase.messaging();

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'New message';
  const body = data.body || 'You have a new notification';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
    })
  );
});
