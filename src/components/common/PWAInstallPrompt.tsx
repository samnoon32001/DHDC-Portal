import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, CheckCircle, Share2, PlusSquare, ArrowRight, ShieldCheck, Laptop } from 'lucide-react';
import { dataService } from '../../services/db';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  const institution = dataService.getInstitutionSettings();

  useEffect(() => {
    // 1. Check if already running in standalone PWA mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true ||
        document.referrer.includes('android-app://');
      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) {
        setIsInstalled(true);
      }
    };

    checkStandalone();

    // 2. Check for iOS device
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    // 3. Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('DHDC Portal PWA Service Worker active:', reg.scope);
        })
        .catch((err) => {
          console.warn('PWA Service Worker registration warning:', err);
        });
    }

    // 4. Capture beforeinstallprompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // If user hasn't dismissed in this session, show prompt after brief delay
      const dismissed = sessionStorage.getItem('dhdc_pwa_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 1500);
      }
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setShowPrompt(false);
      setInstallSuccess(true);
      setTimeout(() => setInstallSuccess(false), 5000);
    };

    // 5. Custom event listener to trigger install from any button in the app
    const handleCustomTrigger = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            setIsInstalled(true);
            setShowPrompt(false);
          }
          setDeferredPrompt(null);
        });
      } else if (isAppleDevice) {
        setShowIOSGuide(true);
        setShowPrompt(true);
      } else {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('dhdc-trigger-pwa-install', handleCustomTrigger);

    // If on iOS and not standalone, show prompt after 2 seconds if not dismissed
    if (isAppleDevice && !window.matchMedia('(display-mode: standalone)').matches) {
      const dismissed = sessionStorage.getItem('dhdc_pwa_dismissed');
      if (!dismissed) {
        setTimeout(() => setShowPrompt(true), 2000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('dhdc-trigger-pwa-install', handleCustomTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setShowPrompt(false);
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSGuide(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem('dhdc_pwa_dismissed', 'true');
  };

  if (isStandalone || !showPrompt) {
    if (installSuccess) {
      return (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CheckCircle className="w-6 h-6 text-emerald-200" />
          <div>
            <p className="font-bold text-sm">App Installed Successfully!</p>
            <p className="text-xs text-emerald-100">You can now open DHDC Portal directly from your home screen.</p>
          </div>
        </div>
      );
    }
    return null;
  }

  return (
    <div
      id="pwa-install-banner"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 max-w-md bg-slate-900/95 text-white backdrop-blur-xl border border-indigo-500/30 rounded-3xl shadow-2xl shadow-indigo-950/60 p-5 animate-in fade-in slide-in-from-bottom-6 duration-300 no-print"
      role="dialog"
      aria-label="Install web application"
    >
      <div className="flex items-start justify-between gap-3">
        {/* App Emblem / Logo */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-500/30 overflow-hidden border border-indigo-400/20">
            {institution.logoUrl || institution.appIconUrl ? (
              <img
                src={institution.appIconUrl || institution.logoUrl}
                alt="App Icon"
                className="w-full h-full object-contain p-1"
              />
            ) : (
              <Smartphone className="w-6 h-6 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-400">
                Web App Available
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight truncate">
              {institution.name || "DARUL HIDAYA DA'WA COLLEGE, MANOOR"}
            </h3>
            <p className="text-[11px] text-slate-300 line-clamp-1">
              {institution.shortName || 'DHDC Portal'} • Fast & Offline Ready
            </p>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer shrink-0"
          title="Dismiss notification"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Description / Feature Highlights */}
      <div className="mt-3.5 pt-3 border-t border-slate-800/80 text-xs text-slate-300 space-y-1.5">
        <p className="leading-relaxed">
          Install as a web app on your device for quick 1-tap launch, full-screen view, and uninterrupted offline access.
        </p>
        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
          <span className="flex items-center gap-1 text-emerald-400">
            <ShieldCheck className="w-3.5 h-3.5" /> Official Portal
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" /> Mobile
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Laptop className="w-3.5 h-3.5" /> PC / Mac
          </span>
        </div>
      </div>

      {/* iOS Manual Instructions Guide (if on iOS) */}
      {isIOS && showIOSGuide && (
        <div className="mt-3 p-3 bg-slate-800/90 rounded-2xl border border-indigo-500/20 text-xs text-slate-200 space-y-2 animate-in fade-in duration-200">
          <p className="font-bold text-indigo-300 flex items-center gap-1.5">
            <Share2 className="w-4 h-4 text-indigo-400" /> How to install on iOS Safari:
          </p>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-300">
            <li>
              Tap the <strong>Share button</strong> (<Share2 className="inline w-3 h-3 text-indigo-400" />) in Safari's bottom toolbar.
            </li>
            <li>
              Scroll down and tap <strong>'Add to Home Screen'</strong> (<PlusSquare className="inline w-3 h-3 text-emerald-400" />).
            </li>
            <li>
              Tap <strong>Add</strong> in the top right corner.
            </li>
          </ol>
        </div>
      )}

      {/* Action CTA Buttons */}
      <div className="mt-4 flex items-center gap-2.5">
        {deferredPrompt ? (
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:scale-98 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install App Now</span>
          </button>
        ) : isIOS ? (
          <button
            onClick={() => setShowIOSGuide(!showIOSGuide)}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{showIOSGuide ? 'Hide iOS Steps' : 'Install Instructions (iOS)'}</span>
          </button>
        ) : (
          <button
            onClick={handleInstallClick}
            className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Install Web App</span>
          </button>
        )}

        <button
          onClick={handleDismiss}
          className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          Later
        </button>
      </div>
    </div>
  );
};
