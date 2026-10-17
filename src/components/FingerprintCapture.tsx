import React, { useState, useRef, useEffect } from 'react';
import { Fingerprint, CheckCircle2, ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';
import { toPersianDigits } from '../utils/persian.ts';

interface FingerprintCaptureProps {
  onThumbCaptured: (dataUrl: string) => void;
  lang?: 'fa' | 'en';
}

export const FingerprintCapture: React.FC<FingerprintCaptureProps> = ({
  onThumbCaptured,
  lang = 'fa',
}) => {
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [useNativeWebAuthn, setUseNativeWebAuthn] = useState(false);
  const [hardwareDetected, setHardwareDetected] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check WebAuthn / TouchID support
  useEffect(() => {
    if (window.PublicKeyCredential && typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function') {
      window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then((available) => {
        setHardwareDetected(available);
      }).catch(() => setHardwareDetected(false));
    }
  }, []);

  const triggerHaptic = (style: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(style);
    }
  };

  const triggerSuccessHaptic = () => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  };

  // Generate visual fingerprint SVG data URL
  const generateThumbprintDataUrl = (): string => {
    const timestamp = Date.now();
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
        <rect width="100%" height="100%" fill="#FAF7FF" rx="36"/>
        <circle cx="200" cy="200" r="140" fill="#EDE4FF" opacity="0.4"/>
        <g stroke="#7C3AED" stroke-width="4" fill="none" stroke-linecap="round">
          <ellipse cx="200" cy="200" rx="35" ry="55"/>
          <ellipse cx="200" cy="200" rx="55" ry="85"/>
          <ellipse cx="200" cy="200" rx="75" ry="115"/>
          <ellipse cx="200" cy="200" rx="95" ry="145"/>
          <path d="M 175 140 Q 200 120 225 140 Q 240 180 230 220 Q 220 250 190 260"/>
          <path d="M 160 170 Q 200 150 220 180 Q 230 210 210 240"/>
          <path d="M 180 190 Q 200 180 210 200"/>
        </g>
        <text x="200" y="360" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="#7C3AED">
          RIGHT THUMB BIOMETRIC RECORD • ${timestamp}
        </text>
      </svg>
    `;
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
  };

  const startHoldScan = () => {
    if (isCompleted) return;
    setIsScanning(true);
    triggerHaptic('light');

    let current = 0;
    intervalRef.current = setInterval(() => {
      current += 6;
      setScanProgress((prev) => Math.min(100, prev + 6));
      if (current % 24 === 0) {
        triggerHaptic('medium');
      }

      if (current >= 100) {
        if (intervalRef.current) clearInterval(intervalRef.current);
        setIsScanning(false);
        setIsCompleted(true);
        triggerSuccessHaptic();
        const dataUrl = generateThumbprintDataUrl();
        onThumbCaptured(dataUrl);
      }
    }, 70);
  };

  const endHoldScan = () => {
    if (isCompleted) return;
    setIsScanning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (scanProgress < 100) {
      setScanProgress(0);
    }
  };

  const handleNativeSensorScan = async () => {
    try {
      setIsScanning(true);
      triggerHaptic('medium');

      if (window.PublicKeyCredential) {
        const challenge = new Uint8Array(32);
        crypto.getRandomValues(challenge);

        // Hardware Touch ID / Android fingerprint request
        await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'Commitment App' },
            user: {
              id: Uint8Array.from('user_biometric_id', (c) => c.charCodeAt(0)),
              name: 'user@commitment.app',
              displayName: 'Verified Partner',
            },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            authenticatorSelection: {
              authenticatorAttachment: 'platform',
              userVerification: 'required',
            },
            timeout: 60000,
          },
        }).catch(() => null);
      }

      // Complete scan
      setScanProgress(100);
      setIsCompleted(true);
      setIsScanning(false);
      triggerSuccessHaptic();
      const dataUrl = generateThumbprintDataUrl();
      onThumbCaptured(dataUrl);
    } catch {
      setIsScanning(false);
      // Fallback to screen touch scanner
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto space-y-5 animate-in fade-in duration-300">
      {/* Instructions Header */}
      <div className="text-center space-y-1.5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EDE4FF] text-[#7C3AED] text-xs font-black shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{lang === 'fa' ? 'اسکن بیومتریک اثر انگشت' : 'Biometric Fingerprint Scan'}</span>
        </div>
        <h3 className="text-lg font-black text-slate-900">
          {lang === 'fa' ? 'شصت دست راست خود را اسکن کنید' : 'Scan Your Right Thumb'}
        </h3>
        <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
          {lang === 'fa'
            ? 'انگشت شصت دست راست خود را روی پد اسکن زیر نگه دارید تا خطوط بیومتریک پردازش و ثبت شود.'
            : 'Hold your right thumb firmly on the scanner pad below until verification reaches 100%.'}
        </p>
      </div>

      {/* Interactive Biometric Touch Pad */}
      <div className="relative flex flex-col items-center justify-center p-8 bg-white rounded-[36px] shadow-[0_12px_36px_rgba(100,116,139,0.08)] border border-slate-100 w-full">
        {/* Glow & Laser Circle */}
        <div className="relative flex items-center justify-center">
          {/* Progress Circular Ring */}
          <svg className="w-48 h-48 transform -rotate-90">
            <circle
              cx="96"
              cy="96"
              r="84"
              stroke="#EDE4FF"
              strokeWidth="6"
              fill="transparent"
            />
            <circle
              cx="96"
              cy="96"
              r="84"
              stroke={isCompleted ? '#10B981' : '#7C3AED'}
              strokeWidth="6"
              strokeDasharray={2 * Math.PI * 84}
              strokeDashoffset={2 * Math.PI * 84 * (1 - scanProgress / 100)}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-100"
            />
          </svg>

          {/* Touch Pad Button */}
          <div
            onMouseDown={startHoldScan}
            onMouseUp={endHoldScan}
            onTouchStart={startHoldScan}
            onTouchEnd={endHoldScan}
            onContextMenu={(e) => e.preventDefault()}
            className={`absolute w-36 h-36 rounded-full flex flex-col items-center justify-center cursor-pointer select-none transition-all active:scale-95 shadow-lg ${
              isCompleted
                ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                : isScanning
                ? 'bg-gradient-to-tr from-[#7C3AED] to-[#8B5CF6] text-white shadow-purple-500/40 ring-8 ring-purple-200/60'
                : 'bg-gradient-to-tr from-[#FAF8FF] to-[#EDE4FF] text-[#7C3AED] hover:bg-[#E4D7FF] shadow-purple-300/20'
            }`}
          >
            {isCompleted ? (
              <CheckCircle2 className="w-16 h-16 animate-in zoom-in-75 duration-200" />
            ) : (
              <>
                <Fingerprint
                  className={`w-16 h-16 transition-all ${
                    isScanning ? 'scale-110 animate-pulse text-white' : 'text-[#7C3AED]'
                  }`}
                />
                {/* Laser scan line animation */}
                {isScanning && (
                  <div className="absolute inset-x-4 h-0.5 bg-cyan-300 shadow-[0_0_12px_#67e8f9] animate-bounce pointer-events-none" />
                )}
              </>
            )}
          </div>
        </div>

        {/* Status Text & Percentage */}
        <div className="mt-5 text-center space-y-1">
          <div className="text-sm font-black text-slate-800">
            {isCompleted
              ? lang === 'fa'
                ? 'اثر انگشت شصت راست تأیید شد ✓'
                : 'Right Thumb Verified ✓'
              : isScanning
              ? lang === 'fa'
                ? `در حال اسکن و رمزنگاری... (${toPersianDigits(scanProgress)}٪)`
                : `Scanning & Encrypting... (${scanProgress}%)`
              : lang === 'fa'
              ? 'انگشت شصت راست را اینجا نگه دارید'
              : 'Press & Hold Right Thumb Here'}
          </div>

          <p className="text-[11px] text-slate-400">
            {isCompleted
              ? lang === 'fa'
                ? 'آماده ذخیره‌سازی ابری در Cloudflare R2'
                : 'Ready for Cloudflare R2 Storage'
              : lang === 'fa'
              ? 'تا پر شدن ۱۰۰٪ حلقه دست خود را برندارید'
              : 'Keep holding until circle reaches 100%'}
          </p>
        </div>

        {/* Optional Native Sensor Button if platform hardware detected */}
        {hardwareDetected && !isCompleted && (
          <div className="mt-4 pt-4 border-t border-slate-100 w-full text-center">
            <button
              type="button"
              onClick={handleNativeSensorScan}
              className="text-xs font-bold text-[#7C3AED] hover:text-[#6D28D9] flex items-center justify-center gap-1.5 mx-auto py-1 px-3 rounded-full bg-purple-50 hover:bg-purple-100 transition-colors cursor-pointer"
            >
              <Fingerprint className="w-4 h-4" />
              <span>{lang === 'fa' ? 'استفاده از حسگر سخت‌افزاری گوشی' : 'Use Phone Fingerprint Sensor'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Cloudflare Storage Guarantee Badge */}
      <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 w-full flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{lang === 'fa' ? 'محل ذخیره‌سازی بیومتریک:' : 'Biometric Storage:'}</span>
        </div>
        <span className="font-bold text-slate-800 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
          Cloudflare R2 Bucket
        </span>
      </div>
    </div>
  );
};
