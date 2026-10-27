import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register the service worker (production only) so the app is installable as a PWA.
// A production preview can leave our worker controlling this same localhost.
// Remove only our own worker in development, then reload once to release it.
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  const ownWorker = (url: string) => url === new URL('/sw.js', location.origin).href;
  const wasControlled = !!navigator.serviceWorker.controller && ownWorker(navigator.serviceWorker.controller.scriptURL);
  navigator.serviceWorker.getRegistrations().then(async registrations => {
    for (const registration of registrations) {
      const worker = registration.active ?? registration.waiting ?? registration.installing;
      if (worker && ownWorker(worker.scriptURL)) await registration.unregister();
    }
    if (wasControlled && !sessionStorage.getItem('camboverse-dev-worker-released')) {
      sessionStorage.setItem('camboverse-dev-worker-released', '1');
      location.reload();
    } else if (!wasControlled) sessionStorage.removeItem('camboverse-dev-worker-released');
  }).catch(error => console.warn('Could not release development service worker', error));
}
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* PWA is a progressive enhancement; ignore registration failures */
    });
  });
}
