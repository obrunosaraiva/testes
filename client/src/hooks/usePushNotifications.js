import { useState, useEffect, useCallback } from 'react';
import { sb } from '../lib/supabase';

function urlB64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length % 4) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function usePushNotifications(userId) {
  const isSupported = typeof window !== 'undefined' &&
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  const [permission, setPermission] = useState(
    isSupported ? Notification.permission : 'denied'
  );
  const [subscribed, setSubscribed] = useState(false);

  // Check if already subscribed on mount
  useEffect(() => {
    if (!isSupported || !userId) return;
    navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    }).catch(() => {});
  }, [userId, isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !userId) return false;
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const { publicKey } = await fetch('/api/push/vapid-public-key').then(r => r.json());

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(publicKey),
        });
      }

      const { data: { session } } = await sb.auth.getSession();
      if (!session?.access_token) return false;

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });

      if (res.ok) { setSubscribed(true); return true; }
      return false;
    } catch (e) {
      console.warn('[Push] Subscribe failed:', e.message);
      return false;
    }
  }, [userId, isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    try {
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      if (!reg) return;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) { setSubscribed(false); return; }

      const { data: { session } } = await sb.auth.getSession();
      if (session?.access_token) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
      }

      await sub.unsubscribe();
      setSubscribed(false);
    } catch (e) {
      console.warn('[Push] Unsubscribe failed:', e.message);
    }
  }, [isSupported]);

  return { subscribe, unsubscribe, subscribed, permission, isSupported };
}
