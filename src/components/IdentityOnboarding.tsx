import React, { useState } from 'react';
import {
  ShieldCheck,
  Heart,
  Fingerprint,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { Language } from '../i18n/translations.ts';
import { toPersianDigits } from '../utils/persian.ts';

interface IdentityOnboardingProps {
  lang: Language;
  onStartVerification: () => void;
  onSkip?: () => void;
}

export const IdentityOnboarding: React.FC<IdentityOnboardingProps> = ({
  lang,
  onStartVerification,
  onSkip,
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      icon: <ShieldCheck className="w-10 h-10 text-white" />,
      badge: lang === 'fa' ? 'امنیت و صداقت در رابطه' : 'Trust & Honesty',
      title: lang === 'fa' ? 'چرا احراز هویت لازم است؟' : 'Why Identity Verification?',
      description:
        lang === 'fa'
          ? 'این سامانه برای پایان دادن به بازی‌های احساسی، دوستی‌های موازی پنهانی و اطمینان از تعهد واقعی پارتنر ساخته شده است. برای این منظور، هویت بیومتریک هر دو طرف ثبت می‌شود.'
          : 'To eliminate deceit, secret parallel relationships, and ensure both partners are genuine and uncommitted.',
      color: 'from-[#FFA07A] to-[#FF6B50]',
    },
    {
      icon: <Fingerprint className="w-10 h-10 text-white" />,
      badge: lang === 'fa' ? 'احراز بیومتریک امن' : 'Biometric Security',
      title: lang === 'fa' ? 'چهره ۳ زاویه و اثر انگشت شصت' : 'Face & Right Thumb Biometrics',
      description:
        lang === 'fa'
          ? 'بدون نیاز به کد ملی یا استعلام‌های دولتی؛ تنها با ثبت چهره از ۳ زاویه و اسکن اثر انگشت شصت راست، هویت و عکس‌های شما در کلودفلر نگهداری می‌گردد.'
          : 'No national ID or government APIs needed. 3-angle facial liveness and right thumb fingerprint are secured in Cloudflare R2.',
      color: 'from-[#8B5CF6] to-[#7C3AED]',
    },
    {
      icon: <Heart className="w-10 h-10 fill-white text-white" />,
      badge: lang === 'fa' ? 'قانون تعهد تک‌نفره' : 'Exclusive Monogamy',
      title: lang === 'fa' ? 'فقط یک پارتنر همزمان' : 'One Partner at a Time',
      description:
        lang === 'fa'
          ? 'هیچ کاربری نمی‌تواند همزمان دو رابطه فعال داشته باشد. در صورت جدایی، اعلان رسمی به طرف مقابل ارسال و علت پایان رابطه برای شفافیت آینده ثبت می‌گردد.'
          : 'No user can be in two relationships at once. Terminations require mutual reason documentation and instant alerts.',
      color: 'from-[#FF6B50] to-[#E11D48]',
    },
  ];

  const slide = slides[currentSlide];

  const handleNextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onStartVerification();
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7FF] flex flex-col justify-between max-w-md w-full mx-auto px-5 py-6 animate-in fade-in duration-300">
      {/* Top Bar - Clean Step indicator & Skip button */}
      <div className="flex items-center justify-between pb-4">
        <div className="text-xs font-black text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-full shadow-sm">
          {lang === 'fa'
            ? `گام ${toPersianDigits(currentSlide + 1)} از ${toPersianDigits(slides.length)}`
            : `${currentSlide + 1} of ${slides.length}`}
        </div>

        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors py-1 px-2 cursor-pointer"
          >
            {lang === 'fa' ? 'رد شدن' : 'Skip'}
          </button>
        ) : (
          <div className="w-8" />
        )}
      </div>

      {/* Main Hero Card */}
      <div className="bg-white rounded-[36px] p-6 shadow-[0_12px_36px_rgba(100,116,139,0.08)] border border-slate-100 space-y-6 text-center my-auto">
        {/* Dotted Inner Container */}
        <div className="rounded-[28px] bg-dot-matrix bg-[#FAF8FF] border border-purple-100/70 p-7 space-y-4">
          {/* Circular Icon Container */}
          <div
            className={`w-20 h-20 rounded-full bg-gradient-to-tr ${slide.color} text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-500/20 transition-all duration-300`}
          >
            {slide.icon}
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-black px-3.5 py-1 rounded-full bg-white text-[#7C3AED] shadow-sm border border-purple-100 inline-block">
              {slide.badge}
            </span>
            <h2 className="text-xl font-black text-slate-900 pt-1">
              {slide.title}
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed font-normal max-w-xs mx-auto">
              {slide.description}
            </p>
          </div>
        </div>

        {/* Carousel Indicators & Controls */}
        <div className="flex items-center justify-between px-3">
          {/* Right side in RTL (DOM 1st) = Previous Slide button (→ ChevronRight back in RTL) */}
          <button
            type="button"
            disabled={currentSlide === 0}
            onClick={handlePrevSlide}
            className="p-2.5 rounded-full border border-slate-200 text-slate-600 disabled:opacity-20 disabled:pointer-events-none hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title={lang === 'fa' ? 'اسلاید قبلی' : 'Previous'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Slide Indicator Dots */}
          <div className="flex items-center justify-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  idx === currentSlide
                    ? 'w-7 bg-[#8B5CF6]'
                    : 'w-2 bg-slate-200 hover:bg-slate-300'
                }`}
              />
            ))}
          </div>

          {/* Left side in RTL (DOM 2nd) = Next Slide button (← ChevronLeft forward in RTL) */}
          <button
            type="button"
            disabled={currentSlide === slides.length - 1}
            onClick={handleNextSlide}
            className="p-2.5 rounded-full border border-slate-200 text-slate-600 disabled:opacity-20 disabled:pointer-events-none hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
            title={lang === 'fa' ? 'اسلاید بعدی' : 'Next'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Checklist of Trust Perks with Persian Digits */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5 text-xs text-slate-700 text-right">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>اسکن بیومتریک ۳ زاویه چهره (لایونس کلاینت‌ساید)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>اسکن و ثبت بیومتریک اثر انگشت شصت دست راست</span>
          </div>
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>ذخیره‌سازی رمزنگاری‌شده در فضای ابری Cloudflare R2</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2.5 pt-1">
          {currentSlide < slides.length - 1 ? (
            <button
              type="button"
              onClick={handleNextSlide}
              className="w-full py-4 px-6 rounded-full bg-[#181D27] hover:bg-[#252C3B] text-white font-black text-sm shadow-[0_10px_25px_rgba(24,29,39,0.2)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{lang === 'fa' ? 'ادامه به مرحله بعد' : 'Continue'}</span>
              <ArrowLeft className="w-4 h-4 text-[#FFA07A]" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartVerification}
              className="w-full py-4 px-6 rounded-full bg-[#181D27] hover:bg-[#252C3B] text-white font-black text-sm shadow-[0_10px_25px_rgba(24,29,39,0.2)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-[#FFA07A]" />
              <span>{lang === 'fa' ? 'شروع احراز هویت هوشمند' : 'Start Identity Verification'}</span>
              <ArrowLeft className="w-4 h-4 text-[#FFA07A]" />
            </button>
          )}

          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="w-full py-2.5 px-4 rounded-full text-slate-400 hover:text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              {lang === 'fa' ? 'مشاهده سامانه به عنوان کاربر احرازنشده' : 'Explore as Unverified'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
