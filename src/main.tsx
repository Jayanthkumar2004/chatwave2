import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, getToken } from 'firebase/messaging';
import App from './App.tsx';
import './index.css';
import { supabase } from './lib/supabase';

const firebaseConfig = {
  apiKey: 'AIzaSyCecjRWkmgpgBHzh23qF_6WXMJnThGI1Ps',
  authDomain: 'chatwave-c9810.firebaseapp.com',
  projectId: 'chatwave-c9810',
  storageBucket: 'chatwave-c9810.firebasestorage.app',
  messagingSenderId: '1089816295813',
  appId: '1:1089816295813:web:fe08aa5b81e5f65f436cec',
  measurementId: 'G-LKDBJMD0E1',
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const messaging = getMessaging(app);

void analytics;

// Register service worker for FCM
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/firebase-messaging-sw.js')
    .then(() => console.log('Firebase service worker registered'))
    .catch(err => console.error('Service worker registration failed:', err));
}

Notification.requestPermission().then(async (permission) => {
  if (permission === 'granted') {
    try {
      const token = await getToken(messaging, {
  vapidKey: "BIOevr1WkjzEkiQTH27FiepMBNafFa45oyhMt8e3bFVNIyWstN6wif6oG2e6UFA-gYykLYZNeXM9MaZBWPzevDI"
});
console.log("FCM token:", token);

      // TODO: store token in Supabase user_devices table
    } catch (error) {
      console.error('Failed to get FCM token:', error);
    }
  }
});

// Example placeholder for Supabase auth — no demo credentials
async function runSupabaseAuth() {
  try {
    // Replace these with values from a login form or user input
    const email = ""; 
    const password = "";

    if (!email || !password) {
      console.warn("Email and password must be provided by user input.");
      return;
    }

    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      console.error('Supabase auth failed:', loginError.message);
      return;
    }

    console.log('Supabase auth success:', loginData);
  } catch (error) {
    console.error('Supabase auth error:', error);
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
