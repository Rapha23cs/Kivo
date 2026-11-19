import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { FeedbackProvider } from './components/common/FeedbackProvider.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FeedbackProvider>
      <App />
    </FeedbackProvider>
  </React.StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service Worker indisponível:', err?.message || err);
    });
  });
}

