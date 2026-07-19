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

Notification.requestPermission().then(async (permission) => {
  if (permission === 'granted') {
    const token = await getToken(messaging, {
  vapidKey: "BIOewr1WkjzEkiQTH2FlepMBNFaF4soyMh8te3bFVNIyWstN6wif6oG2c6UFA-gYyKLZYNexM9MaZBWpzevDl"
});

  }
});

async function runSupabaseAuthDemo() {
  const email = 'testuser@example.com';
  const password = 'password123';

  try {
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    if (loginError) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw signUpError;
      return;
    }

    const userId = loginData.user?.id;
    if (!userId) throw new Error('No user returned after sign in');

    const { error: insertError } = await supabase.from('user_devices').insert([{ user_id: userId, fcm_token: 'TEST_TOKEN' }]);
    if (insertError) throw insertError;

    const { data, error: selectError } = await supabase.from('user_devices').select('*');
    if (selectError) throw selectError;

    console.log('Supabase auth demo:', { user: loginData.user, tokens: data });
  } catch (error) {
    console.error('Supabase auth demo failed:', error);
  }
}

if (import.meta.env.DEV) {
  void runSupabaseAuthDemo();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
