import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

/**
 * Service Worker Registration
 * 
 * Registers the service worker for caching static assets and enabling
 * offline functionality. The service worker uses:
 * - Cache-first strategy for static assets (JS, CSS, images, fonts)
 * - Network-first strategy for API calls
 * - Automatic cache versioning for updates
 */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
        
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('New content available; please refresh.');
                } else {
                  console.log('Content cached for offline use.');
                }
              }
            };
          }
        };
      })
      .catch((error) => {
        console.warn('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
