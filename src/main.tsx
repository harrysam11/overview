import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { isLocalMode, requestPersistentStorage } from "./lib/appMode";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Local mode: ask the browser not to evict on-device data (best effort, may be declined).
if (isLocalMode) void requestPersistentStorage();

// PWA: Guard against registering service worker in iframes, preview hosts, or dev mode
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

const isPreviewHost = window.location.hostname.includes("id-preview--");
const isDev = import.meta.env.DEV;

if (isDev || isPreviewHost || isInIframe) {
  navigator.serviceWorker?.getRegistrations().then((registrations) => {
    registrations.forEach((r) => r.unregister());
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find the root element in index.html");
}

createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
