import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { FeedbackProvider } from './components/common/FeedbackProvider.jsx'
import ErrorBoundary from './components/common/ErrorBoundary.jsx'
import './index.css'

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
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
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
      .register('/sw.js')
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
      })
      .catch((err) => {
        console.warn('Service Worker indisponível:', err?.message || err);
      });
  });
}
