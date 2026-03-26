"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import Image from "next/image";

const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show on mobile devices
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    // Check if app is already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      return;
    }

    // Check if dismissed before
    const isDismissed = localStorage.getItem("pwa-dismissed");
    if (isDismissed) return;

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show prompt after a short delay to not annoy the user immediately
      setTimeout(() => setIsVisible(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa-dismissed", "true");
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] w-[90%] max-w-sm animate-in slide-in-from-bottom-10 fade-in duration-500">
      <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-5 flex items-center gap-4 relative overflow-hidden backdrop-blur-sm bg-white/95">
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-4 text-black hover:text-neutral-900 transition p-1"
        >
          <X size={16} />
        </button>

        <div className="relative w-14 h-14 rounded-2xl overflow-hidden bg-blue-50 flex-shrink-0 border border-blue-100 p-2">
          <Image
            src="/logo.png"
            alt="App Icon"
            fill
            className="object-contain p-2"
          />
        </div>

        <div className="flex-1 pr-4">
          <h3 className="font-extrabold text-neutral-900 text-sm leading-tight">
            Installez ImmoPro
          </h3>
          <p className="text-[11px] font-semibold text-neutral-500 mt-0.5">
            Ajoutez l&apos;app à votre écran pour un accès rapide
          </p>

          <button
            onClick={handleInstall}
            className="mt-2.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold py-1.5 px-6 rounded-full shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center gap-2 w-fit"
          >
            <Download size={12} />
            Installer
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
