import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { FeedbackProvider } from './components/common/FeedbackProvider.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import './index.css'

const CHUNK_RELOAD_KEY = 'kivo_chunk_reload_at';

async function recoverFromStaleAssets() {
  try {
    const lastReload = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0');
    if (Date.now() - lastReload < 15000) return;
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith('kivo-shell-')).map((k) => caches.delete(k)));
    }
  } catch {
    // ignora
  }
  window.location.reload();
}

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  recoverFromStaleAssets();
});

window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event?.reason?.message || event?.reason || '');
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('Loading chunk')
  ) {
    recoverFromStaleAssets();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    let refreshing = false;
    const hadController = Boolean(navigator.serviceWorker.controller);

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || refreshing) return;
      refreshing = true;
      window.location.reload();
    });

    const notifyUpdateReady = (registration) => {
      if (!registration?.waiting) return;
      window.dispatchEvent(
        new CustomEvent('kivo:sw-update', { detail: { registration } })
      );
    };

    navigator.serviceWorker
      .register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        if (registration.waiting) {
          notifyUpdateReady(registration);
        }
        registration.addEventListener('updatefound', () => {
          const nextWorker = registration.installing;
          if (!nextWorker) return;
          nextWorker.addEventListener('statechange', () => {
            if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
              notifyUpdateReady(registration);
            }
          });
        });

        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') {
            registration.update().catch(() => {});
          }
        });
      })
      .catch((err) => {
        console.warn('Service Worker indisponível:', err?.message || err);
      });
  });
}
