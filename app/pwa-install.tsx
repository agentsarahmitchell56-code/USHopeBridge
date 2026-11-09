"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const registerWorker = () => {
        navigator.serviceWorker.register("/sw.js").catch((error) => {
          console.error("HOPEBRIDGE offline support could not be enabled.", error);
        });
      };
      if (document.readyState === "complete") registerWorker();
      else window.addEventListener("load", registerWorker, { once: true });
    }

    const checkInstalled = () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      const iosStandalone = "standalone" in window.navigator &&
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
      setIsInstalled(standalone || iosStandalone);
    };
    checkInstalled();

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (isInstalled) return null;

  async function installApp() {
    if (!installPrompt) {
      setShowHelp((visible) => !visible);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  return (
    <div style={{ position: "fixed", zIndex: 1000, right: 16, bottom: "max(16px, env(safe-area-inset-bottom))", maxWidth: "calc(100vw - 32px)" }}>
      <button
        type="button"
        onClick={installApp}
        aria-expanded={showHelp}
        style={{ display: "inline-flex", alignItems: "center", gap: 9, border: 0, borderRadius: 999, padding: "13px 18px", background: "#123c69", color: "#fff", font: "inherit", fontWeight: 800, fontSize: 14, boxShadow: "0 8px 28px rgba(16,42,67,.24)", cursor: "pointer" }}
      >
        <span aria-hidden="true" style={{ fontSize: 18 }}>↓</span> Install HOPEBRIDGE app
      </button>
      {showHelp && (
        <div role="status" style={{ marginTop: 10, padding: 16, borderRadius: 14, background: "#fff", color: "#102a43", border: "1px solid #d8e2ef", boxShadow: "0 8px 28px rgba(16,42,67,.16)", fontSize: 13, lineHeight: 1.55 }}>
          <strong>Install on your phone</strong>
          <p style={{ margin: "6px 0 0" }}>Open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>. On iPhone, tap Share, then Add to Home Screen.</p>
        </div>
      )}
    </div>
  );
}
