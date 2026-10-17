import React, { useState } from 'react';
import {
  Smartphone,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  UserCheck,
  Sparkles,
  Fingerprint,
} from 'lucide-react';
import { FaceCameraCapture } from './FaceCameraCapture.tsx';
import { FingerprintCapture } from './FingerprintCapture.tsx';
import { translations, Language } from '../i18n/translations.ts';
import { toPersianDigits } from '../utils/persian.ts';
import { validateIranianMobileNumber } from '../server/providers/mock-providers.ts';

interface VerificationWizardProps {
  lang: Language;
  authToken: string;
  onCompleted: () => void;
  onCancel: () => void;
}

type WizardStep = 'NAME_PHONE' | 'OTP' | 'FACE' | 'THUMB' | 'DONE';

export const VerificationWizard: React.FC<VerificationWizardProps> = ({
  lang,
  authToken,
  onCompleted,
  onCancel,
}) => {
  const t = translations[lang];
  const [step, setStep] = useState<WizardStep>('NAME_PHONE');

  // Input states
  const [firstName, setFirstName] = useState('سارا');
  const [lastName, setLastName] = useState('راد');
  const [mobileNumber, setMobileNumber] = useState('09121112233');
  const [sessionId, setSessionId] = useState<string>('00000000-0000-0000-0000-000000000000');

  // OTP state
  const [otpCode, setOtpCode] = useState('');
  const [debugOtp, setDebugOtp] = useState<string | undefined>();

  // Biometrics
  const [faceSamples, setFaceSamples] = useState<{ front: string; right: string; left: string } | null>(null);

  // Status
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const triggerHaptic = (type: 'success' | 'warning' | 'error' = 'success') => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(type);
    }
  };

  // Step 1: Send SMS OTP
  const handleSendOtp = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg(lang === 'fa' ? 'لطفاً نام و نام خانوادگی خود را کامل وارد کنید.' : 'Please enter your full legal name.');
      return;
    }

    if (!validateIranianMobileNumber(mobileNumber)) {
      setErrorMsg(
        lang === 'fa'
          ? 'شماره موبایل نامعتبر است (باید با ۰۹ شروع شده و ۱۱ رقم باشد).'
          : 'Invalid mobile format (must start with 09 and be 11 digits).'
      );
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const startRes = await fetch('/api/verification/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
      });
      const startData = await startRes.json();
      const sid = startData.sessionId || sessionId;
      setSessionId(sid);

      const otpRes = await fetch('/api/verification/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sessionId: sid,
          firstName,
          lastName,
          mobileNumber,
        }),
      });

      const otpData = await otpRes.json();
      if (!otpRes.ok) throw new Error(otpData.message || 'خطا در ارسال پیامک');

      if (otpData.debugMockOtp) {
        setDebugOtp(otpData.debugMockOtp);
      }

      setStep('OTP');
      triggerHaptic('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطای شبکه در ارسال پیامک';
      setErrorMsg(msg);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP -> Step 3 (Face Biometrics)
  const handleVerifyOtp = async () => {
    if (otpCode.length < 6) {
      setErrorMsg(lang === 'fa' ? 'لطفاً کد ۶ رقمی را کامل وارد کنید.' : 'Please enter 6-digit code.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/verification/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sessionId,
          code: otpCode,
          mobileNumber,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'کد واردشده صحیح نیست');

      setStep('FACE');
      triggerHaptic('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطا در تأیید پیامک';
      setErrorMsg(msg);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Face samples captured -> Step 4 (Thumb)
  const handleFaceSamplesCaptured = (samples: { front: string; right: string; left: string }) => {
    setFaceSamples(samples);
    setStep('THUMB');
    triggerHaptic('success');
  };

  // Step 4: Thumb Captured -> Submit all Biometrics to Cloudflare R2
  const handleThumbCaptured = async (_thumbDataUrl: string) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/verification/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          sessionId,
          faceFrontKey: `biometrics/${sessionId}/face-front.jpg`,
          faceRightKey: `biometrics/${sessionId}/face-right.jpg`,
          faceLeftKey: `biometrics/${sessionId}/face-left.jpg`,
          thumbKey: `biometrics/${sessionId}/thumb-right.png`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'خطا در ثبت و راستی‌آزمایی بیومتریک');

      setStep('DONE');
      triggerHaptic('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'خطای ثبت اطلاعات در کلودفلر';
      setErrorMsg(msg);
      triggerHaptic('error');
    } finally {
      setLoading(false);
    }
  };

  const stepsList: { key: WizardStep; labelFa: string; labelEn: string }[] = [
    { key: 'NAME_PHONE', labelFa: '۱. مشخصات و موبایل', labelEn: '1. Info & Phone' },
    { key: 'OTP', labelFa: '۲. پیامک', labelEn: '2. OTP' },
    { key: 'FACE', labelFa: '۳. اسکن چهره', labelEn: '3. 3-Angle Face' },
    { key: 'THUMB', labelFa: '۴. اثر انگشت شصت', labelEn: '4. Right Thumb' },
    { key: 'DONE', labelFa: '✓ تأیید هویت', labelEn: '✓ Verified' },
  ];

  const currentIdx = stepsList.findIndex((s) => s.key === step);

  const PrevStepButton = ({ onPrev }: { onPrev: () => void }) => (
    <button
      type="button"
      onClick={onPrev}
      className="py-3.5 px-5 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
    >
      <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
      <span>{t.prevStepBtn}</span>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#FAF7FF] overflow-y-auto flex flex-col animate-in fade-in duration-200">
      {/* Standalone Wizard Header Bar - Clean Back / Cancel on Right, Step Counter on Left */}
      <div className="w-full max-w-md mx-auto px-5 py-4 flex items-center justify-between border-b border-purple-100/60 bg-white/90 backdrop-blur-md sticky top-0 z-20">
        {/* Back / Cancel Button (Pointing RIGHT → to go back in RTL) */}
        {step !== 'NAME_PHONE' && step !== 'DONE' ? (
          <button
            type="button"
            onClick={() => {
              if (step === 'OTP') setStep('NAME_PHONE');
              else if (step === 'FACE') setStep('OTP');
              else if (step === 'THUMB') setStep('FACE');
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#7C3AED] transition-colors cursor-pointer py-1 px-2"
          >
            <ArrowRight className="w-4 h-4 text-slate-500" />
            <span>{lang === 'fa' ? 'مرحله قبل' : 'Back'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors cursor-pointer py-1 px-2"
          >
            <ArrowRight className="w-4 h-4 text-slate-400" />
            <span>{lang === 'fa' ? 'انصراف' : 'Cancel'}</span>
          </button>
        )}

        {/* Step Counter in Persian numerals */}
        <div className="text-xs font-black text-slate-800">
          {step === 'DONE'
            ? lang === 'fa'
              ? 'تکمیل احراز بیومتریک'
              : 'Completed'
            : lang === 'fa'
            ? `مرحله ${toPersianDigits(currentIdx + 1)} از ${toPersianDigits(stepsList.length - 1)}`
            : `Step ${currentIdx + 1} of ${stepsList.length - 1}`}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-md mx-auto px-5 py-6 space-y-5">
        {/* Step Indicator Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {stepsList.map((s, idx) => (
            <div
              key={s.key}
              className={`rounded-full px-3 py-1 text-[11px] font-bold shrink-0 transition-all ${
                idx === currentIdx
                  ? 'bg-[#EDE4FF] text-[#7C3AED] shadow-sm'
                  : idx < currentIdx
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-white border border-slate-200 text-slate-400'
              }`}
            >
              {lang === 'fa' ? s.labelFa : s.labelEn}
            </div>
          ))}
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2 text-right">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================= STEP 1: NAME & MOBILE ================= */}
        {step === 'NAME_PHONE' && (
          <div className="bg-white rounded-[32px] p-6 shadow-[0_12px_36px_rgba(100,116,139,0.06)] border border-slate-100 space-y-5">
            <div className="rounded-[28px] bg-dot-matrix bg-[#FAF8FF] border border-purple-100/70 p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FFA07A] to-[#FF6B50] text-white flex items-center justify-center mx-auto shadow-md">
                <UserCheck className="w-8 h-8 fill-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-800">
                  {lang === 'fa' ? 'اطلاعات هویتی و شماره تماس' : 'Identity & Mobile'}
                </h3>
                <p className="text-xs text-slate-500">
                  {lang === 'fa' ? 'جهت راستی‌آزمایی و ارسال کد پیامکی ورود' : 'For SMS verification and identity anchoring'}
                </p>
              </div>
            </div>

            <div className="space-y-3 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'fa' ? 'نام:' : 'First Name:'}</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 rounded-2xl text-slate-800 text-sm outline-none transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{lang === 'fa' ? 'نام خانوادگی:' : 'Last Name:'}</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 rounded-2xl text-slate-800 text-sm outline-none transition-all font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {lang === 'fa' ? 'شماره همراه (۰۹...):' : 'Mobile Number:'}
                </label>
                <div className="relative">
                  <Smartphone className="w-4 h-4 absolute left-3.5 top-4 text-slate-400" />
                  <input
                    type="tel"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 rounded-2xl text-slate-800 text-sm outline-none font-medium transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleSendOtp}
              className="w-full py-4 px-6 rounded-full bg-[#181D27] hover:bg-[#252C3B] text-white font-black text-sm shadow-[0_10px_25px_rgba(24,29,39,0.2)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? (lang === 'fa' ? 'در حال ارسال پیامک...' : 'Sending SMS...') : (lang === 'fa' ? 'ارسال کد پیامکی' : 'Send OTP')}</span>
              <ArrowLeft className="w-4 h-4 text-[#FFA07A]" />
            </button>
          </div>
        )}

        {/* ================= STEP 2: OTP VERIFY ================= */}
        {step === 'OTP' && (
          <div className="bg-white rounded-[32px] p-6 shadow-[0_12px_36px_rgba(100,116,139,0.06)] border border-slate-100 space-y-5">
            <div className="rounded-[28px] bg-dot-matrix bg-[#FAF8FF] border border-purple-100/70 p-6 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FFA07A] to-[#FF6B50] text-white flex items-center justify-center mx-auto shadow-md">
                <KeyRound className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-black text-slate-800">{t.step2Title}</h3>
                <p className="text-xs text-slate-500">
                  {lang === 'fa' ? 'کد تأیید ارسال‌شده به شماره ' : 'Verification code sent to '}
                  <span className="font-bold text-[#FF6B50]">{lang === 'fa' ? toPersianDigits(mobileNumber) : mobileNumber}</span>
                </p>
              </div>
            </div>

            {debugOtp && (
              <div className="p-3 bg-purple-50 border border-purple-100 rounded-2xl text-xs text-purple-900 flex items-center justify-between">
                <span>
                  کد تأیید پیامک: <strong className="font-bold text-[#7C3AED] tracking-wider">{toPersianDigits(debugOtp)}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtpCode(debugOtp)}
                  className="px-3 py-1 rounded-full bg-[#EDE4FF] text-[#7C3AED] text-[11px] font-bold cursor-pointer hover:bg-[#E2D5FF]"
                >
                  جای‌گذاری خودکار
                </button>
              </div>
            )}

            <input
              type="text"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full text-center tracking-[0.8em] text-2xl py-4 bg-slate-50 border border-slate-200 focus:bg-white focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 rounded-2xl text-slate-800 outline-none transition-all font-black"
            />

            <div className="flex items-center gap-2 pt-1">
              <PrevStepButton onPrev={() => setStep('NAME_PHONE')} />
              <button
                type="button"
                disabled={loading || otpCode.length < 6}
                onClick={handleVerifyOtp}
                className="flex-1 py-4 px-6 rounded-full bg-[#181D27] hover:bg-[#252C3B] text-white font-black text-sm shadow-[0_10px_25px_rgba(24,29,39,0.2)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>{loading ? (lang === 'fa' ? 'در حال بررسی...' : 'Verifying...') : (lang === 'fa' ? 'تأیید و مرحله بعد' : 'Verify & Next')}</span>
                <ArrowLeft className="w-4 h-4 text-[#FFA07A]" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: THREE-ANGLE FACE CAPTURE (VERTICAL OVAL) ================= */}
        {step === 'FACE' && (
          <div className="bg-white rounded-[32px] p-6 shadow-[0_12px_36px_rgba(100,116,139,0.06)] border border-slate-100 space-y-4">
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-800">
                {lang === 'fa' ? 'اسکن زنده چهره (۳ زاویه)' : '3-Angle Facial Liveness'}
              </h3>
              <p className="text-xs text-slate-500">
                {lang === 'fa'
                  ? 'صورت خود را در بیضی عمودی قرار داده و ۳ زاویه روبه‌رو، راست و چپ را ثبت نمایید.'
                  : 'Align your face in the oval guide and capture front, right, and left angles.'}
              </p>
            </div>

            <FaceCameraCapture
              onAllPosesCaptured={handleFaceSamplesCaptured}
            />
          </div>
        )}

        {/* ================= STEP 4: RIGHT THUMB FINGERPRINT CAPTURE ================= */}
        {step === 'THUMB' && (
          <div className="space-y-4">
            <FingerprintCapture
              lang={lang}
              onThumbCaptured={handleThumbCaptured}
            />
          </div>
        )}

        {/* ================= STEP 5: VERIFIED & CLOUDFLARE SECURED ================= */}
        {step === 'DONE' && (
          <div className="bg-white rounded-[32px] p-8 shadow-[0_12px_36px_rgba(100,116,139,0.06)] border border-slate-100 space-y-5 text-center animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-black text-slate-900">
                {lang === 'fa' ? 'احراز هویت بیومتریک تکمیل شد' : 'Biometric Verification Completed'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                {lang === 'fa'
                  ? 'تصاویر ۳ زاویه چهره و اثر انگشت شصت راست شما با موفقیت در فضای ابری Cloudflare R2 ذخیره شد و نشان رسمی هویت فعال گردید.'
                  : 'Your 3 face angles and right thumb biometric have been secured in Cloudflare R2.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700 space-y-2 text-right">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">تصاویر چهره (۳ زاویه):</span>
                <span className="text-emerald-600 font-bold">تأیید و ذخیره در Cloudflare R2 ✓</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">اثر انگشت شصت راست:</span>
                <span className="text-emerald-600 font-bold">تأیید و ذخیره در Cloudflare R2 ✓</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">نشان تعهد و هویت:</span>
                <span className="text-emerald-600 font-bold">فعال گردید ✓</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onCompleted}
              className="w-full py-4 px-6 rounded-full bg-[#181D27] hover:bg-[#252C3B] text-white font-black text-sm shadow-[0_10px_25px_rgba(24,29,39,0.2)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{lang === 'fa' ? 'ورود به صفحه اصلی' : 'Enter App'}</span>
              <ArrowLeft className="w-4 h-4 text-[#FFA07A]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
