/**
 * Telegram Relationship Verification & Commitment Mini App
 * Light, Airy, Pastel Luxury Aesthetic Inspired by Modern Dribbble/iOS Design
 * With Vazirmatn Typography, Organic Top Controls, Zero-Header Layout,
 * Standalone Identity Onboarding & Verification Flows (Independent from Main Page),
 * Persian Digits & Shamsi Dates, Bottom Sheets (Drag-to-Dismiss) and In-Your-Face Alerts.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Heart,
  History,
  Crown,
  User,
  Sparkles,
  Lock,
  ArrowRight,
  HelpCircle,
  Globe,
  ChevronLeft,
  ChevronRight,
  Shield,
  CreditCard,
  UserCheck,
} from 'lucide-react';
import { RelationshipManager } from './components/RelationshipManager.tsx';
import { RelationshipHistoryView } from './components/RelationshipHistoryView.tsx';
import { VerificationWizard } from './components/VerificationWizard.tsx';
import { IdentityOnboarding } from './components/IdentityOnboarding.tsx';
import { SubscriptionModal } from './components/SubscriptionModal.tsx';
import { SuccessNotificationModal } from './components/SuccessNotificationModal.tsx';
import { BottomSheet } from './components/BottomSheet.tsx';
import { translations, Language } from './i18n/translations.ts';
import { toPersianDigits } from './utils/persian.ts';
import { useAnalytics } from './hooks/useAnalytics.ts';
import type { VerificationState } from './types/index.ts';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        initData: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
            language_code?: string;
          };
        };
        themeParams?: Record<string, string>;
        HapticFeedback?: {
          impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
          notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        };
      };
    };
  }
}

export default function App() {
  const [lang, setLang] = useState<Language>('fa');
  const t = translations[lang];

  // Navigation
  const [activeTab, setActiveTab] = useState<'partner' | 'history' | 'profile'>('partner');
  const [isVerifyingInWizard, setIsVerifyingInWizard] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  // Bottom Sheets & Alerts
  const [showSubscriptionSheet, setShowSubscriptionSheet] = useState(false);
  const [showPrivacySheet, setShowPrivacySheet] = useState(false);
  const [showHelpSheet, setShowHelpSheet] = useState(false);
  const [successAlert, setSuccessAlert] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  // Authentication & Session
  const [authToken, setAuthToken] = useState<string>('mock_dev_session_token');
  const [telegramUser, setTelegramUser] = useState<{
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
  }>({
    id: 987654321,
    first_name: 'سارا',
    last_name: 'راد',
    username: 'sara_rad',
  });
  const [currentState, setCurrentState] = useState<VerificationState>('UNSTARTED');
  const [hasSubscription, setHasSubscription] = useState<boolean>(true);

  // Analytics Hook
  const { trackEvent } = useAnalytics(activeTab);

  // Initialize Telegram WebApp SDK
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      if (tg.initDataUnsafe?.user) {
        setTelegramUser({
          id: tg.initDataUnsafe.user.id,
          first_name: tg.initDataUnsafe.user.first_name,
          last_name: tg.initDataUnsafe.user.last_name,
          username: tg.initDataUnsafe.user.username,
        });

        if (tg.initDataUnsafe.user.language_code?.toLowerCase().startsWith('en')) {
          setLang('en');
        }
      }
    }

    authenticateSession();
  }, []);

  const authenticateSession = async () => {
    try {
      const rawInitData =
        window.Telegram?.WebApp?.initData ||
        `query_id=AAHdF6IQAAAAAN0XohC_dev&user=${encodeURIComponent(
          JSON.stringify(telegramUser)
        )}&auth_date=${Math.floor(Date.now() / 1000)}&hash=mock_dev_hash`;

      const res = await fetch('/api/auth/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData: rawInitData }),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        setAuthToken(data.token);
        if (data.profile) {
          const isVerified = Boolean(data.profile.isIdentityVerified);
          setCurrentState(isVerified ? 'VERIFIED' : 'UNSTARTED');
          setShowOnboarding(!isVerified);
        }
      }

      // Check subscription status
      const subRes = await fetch('/api/subscription/status', {
        headers: { Authorization: `Bearer ${data.token || authToken}` },
      });
      const subData = await subRes.json();
      if (subRes.ok) {
        setHasSubscription(Boolean(subData.hasSubscription));
      }
    } catch {
      setHasSubscription(true);
    }
  };

  const toggleLanguage = () => {
    const next = lang === 'fa' ? 'en' : 'fa';
    setLang(next);
    trackEvent('language_changed', { language: next });
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
    }
  };

  const currentTabTitle =
    activeTab === 'partner'
      ? lang === 'fa'
        ? 'پارتنر و تعهد من'
        : 'My Partner & Bond'
      : activeTab === 'history'
      ? lang === 'fa'
        ? 'تاریخچه شفاف روابط'
        : 'Transparent History'
      : lang === 'fa'
      ? 'تنظیمات و حساب کاربری'
      : 'Account & Settings';

  // 1. DEDICATED STANDALONE WIZARD SCREEN (NO main page layout!)
  if (isVerifyingInWizard) {
    return (
      <div
        dir={t.dir}
        className={`min-h-screen text-[#1E2433] bg-[#FAF7FF] font-sans selection:bg-purple-200 selection:text-purple-900 ${
          lang === 'fa' ? 'rtl' : 'ltr'
        }`}
      >
        <VerificationWizard
          lang={lang}
          authToken={authToken}
          onCompleted={() => {
            setIsVerifyingInWizard(false);
            setShowOnboarding(false);
            setCurrentState('VERIFIED');
            trackEvent('identity_verification_completed');
            setSuccessAlert({
              isOpen: true,
              title: lang === 'fa' ? 'احراز هویت تکمیل شد' : 'Verification Complete',
              description:
                lang === 'fa'
                  ? 'مدارک شما با موفقیت تأیید شد و نشان رسمی هویت به حساب شما اضافه گردید.'
                  : 'Your identity has been verified and badge is active.',
            });
          }}
          onCancel={() => setIsVerifyingInWizard(false)}
        />

        <SuccessNotificationModal
          isOpen={successAlert.isOpen}
          onClose={() => setSuccessAlert((prev) => ({ ...prev, isOpen: false }))}
          title={successAlert.title}
          description={successAlert.description}
        />
      </div>
    );
  }

  // 2. DEDICATED STANDALONE ONBOARDING SCREEN (NO main page layout!)
  if (currentState !== 'VERIFIED' && showOnboarding) {
    return (
      <div
        dir={t.dir}
        className={`min-h-screen text-[#1E2433] bg-[#FAF7FF] flex flex-col font-sans selection:bg-purple-200 selection:text-purple-900 ${
          lang === 'fa' ? 'rtl' : 'ltr'
        }`}
      >
        <IdentityOnboarding
          lang={lang}
          onStartVerification={() => {
            setShowOnboarding(false);
            setIsVerifyingInWizard(true);
          }}
          onSkip={() => setShowOnboarding(false)}
        />
      </div>
    );
  }

  // 3. MAIN APPLICATION SCREEN (Rendered ONLY when user is past onboarding)
  return (
    <div
      dir={t.dir}
      className={`min-h-screen text-[#1E2433] flex flex-col font-sans selection:bg-purple-200 selection:text-purple-900 ${
        lang === 'fa' ? 'rtl' : 'ltr'
      }`}
    >
      {/* Main Container */}
      <main className="flex-1 flex flex-col max-w-md w-full mx-auto px-5 pt-6 pb-28">
        {/* Organic Top Controls Row */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2">
            {/* VIP Status Pill */}
            <button
              type="button"
              onClick={() => setShowSubscriptionSheet(true)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                hasSubscription
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>
                {hasSubscription
                  ? lang === 'fa'
                    ? 'اشتراک VIP فعال'
                    : 'VIP Pass'
                  : lang === 'fa'
                  ? 'عضویت VIP'
                  : 'Get VIP'}
              </span>
            </button>

            {/* Verified / Unverified Badge Pill */}
            {currentState === 'VERIFIED' ? (
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#EAFBF3] text-[#059669] border border-[#A7F3D0] flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t.verifiedBadge}</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setIsVerifyingInWizard(true)}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-[#FFF0EA] text-[#FF6B50] border border-[#FFE0D3] flex items-center gap-1 shadow-sm cursor-pointer hover:bg-[#FFE8DC] transition-all"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{t.unverifiedBadge}</span>
              </button>
            )}
          </div>
        </div>

        {/* Screen Title */}
        <div className="py-2 mb-1 text-right">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {currentTabTitle}
          </h1>
        </div>

        {/* VIP Inactive Banner: ONLY shown when user does NOT have subscription! */}
        {!hasSubscription && (
          <div
            onClick={() => setShowSubscriptionSheet(true)}
            className="mb-4 p-4 rounded-[28px] bg-gradient-to-r from-[#FFF5EF] via-[#FFF9F6] to-[#FAF8FF] border border-[#FFE2D4] flex items-center justify-between cursor-pointer shadow-sm active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-[#FF6B50] text-white flex items-center justify-center shadow-md">
                <Crown className="w-5 h-5" />
              </div>
              <div className="text-right">
                <div className="text-xs font-black text-slate-800">{t.subscriptionRequiredTitle}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  برای تعهد و مشاهده تاریخچه، اشتراک VIP الزامی است.
                </div>
              </div>
            </div>
            <span className="text-xs font-black px-4 py-2 rounded-full bg-[#181D27] text-white shadow-sm">
              {lang === 'fa' ? 'فعال‌سازی' : 'Get VIP'}
            </span>
          </div>
        )}

        {/* TAB 1: RELATIONSHIP COMMITMENT */}
        {activeTab === 'partner' && (
          <RelationshipManager
            lang={lang}
            authToken={authToken}
            hasSubscription={hasSubscription}
            onOpenSubscriptionModal={() => setShowSubscriptionSheet(true)}
            onViewHistory={() => setActiveTab('history')}
            onStartVerification={() => {
              setIsVerifyingInWizard(true);
            }}
          />
        )}

        {/* TAB 2: TRANSPARENT MUTUAL HISTORY */}
        {activeTab === 'history' && (
          <RelationshipHistoryView lang={lang} authToken={authToken} />
        )}

        {/* TAB 3: ACCOUNT & PROFILE */}
        {activeTab === 'profile' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Profile Hero Card with Dotted Matrix */}
            <div className="bg-white rounded-[32px] p-6 shadow-[0_12px_36px_rgba(100,116,139,0.06)] border border-slate-100 space-y-4">
              <div className="rounded-[28px] bg-dot-matrix bg-[#FAF8FF] border border-purple-100/70 p-6 text-center space-y-3">
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FFA07A] to-[#FF6B50] text-white font-black text-3xl flex items-center justify-center mx-auto shadow-[0_10px_25px_rgba(255,107,80,0.35)]">
                  {telegramUser.first_name[0]}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center justify-center gap-1.5">
                    <span>{telegramUser.first_name} {telegramUser.last_name || ''}</span>
                    {currentState === 'VERIFIED' && (
                      <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    )}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    @{telegramUser.username || 'user'} • شناسه: {lang === 'fa' ? toPersianDigits(telegramUser.id) : telegramUser.id}
                  </p>
                </div>
              </div>

              {currentState !== 'VERIFIED' && (
                <button
                  type="button"
                  onClick={() => setIsVerifyingInWizard(true)}
                  className="w-full py-4 px-6 rounded-full bg-[#181D27] hover:bg-[#252C3B] text-white font-black text-sm shadow-[0_10px_25px_rgba(24,29,39,0.2)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4 text-[#FFA07A]" />
                  <span>{lang === 'fa' ? 'شروع احراز هویت و دریافت نشان' : 'Start Identity Verification'}</span>
                </button>
              )}
            </div>

            {/* Menu List Style Options */}
            <div className="space-y-2.5">
              {/* Item 1: Moderation & Safety */}
              <div
                onClick={() => setShowPrivacySheet(true)}
                className="p-4 rounded-3xl bg-white border border-slate-100 hover:border-purple-200 flex items-center justify-between cursor-pointer shadow-sm active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#EDE4FF] text-[#7C3AED] flex items-center justify-center shrink-0">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-800">
                      {lang === 'fa' ? 'امنیت و حفظ حریم خصوصی' : 'Moderation & Safety'}
                    </div>
                    <div className="text-[11px] text-slate-400">تضمین عدم ذخیره‌سازی داده‌های حساس</div>
                  </div>
                </div>
                {lang === 'fa' ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>

              {/* Item 2: Go Premium */}
              <div
                onClick={() => setShowSubscriptionSheet(true)}
                className="p-4 rounded-3xl bg-white border border-slate-100 hover:border-amber-200 flex items-center justify-between cursor-pointer shadow-sm active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#FFF5EF] text-[#FF6B50] flex items-center justify-center shrink-0">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-800">
                      {lang === 'fa' ? 'عضویت و اشتراک VIP' : 'Go Premium'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {hasSubscription ? 'اشتراک شما فعال است' : 'پلن سالانه یا ماهانه'}
                    </div>
                  </div>
                </div>
                {lang === 'fa' ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>

              {/* Item 3: Help Center / FAQ */}
              <div
                onClick={() => setShowHelpSheet(true)}
                className="p-4 rounded-3xl bg-white border border-slate-100 hover:border-purple-200 flex items-center justify-between cursor-pointer shadow-sm active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-[#EDE4FF] text-[#7C3AED] flex items-center justify-center shrink-0">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-800">
                      {lang === 'fa' ? 'مرکز راهنما و مانیفست' : 'Help Center'}
                    </div>
                    <div className="text-[11px] text-slate-400">علت شکل‌گیری و قوانین تعهد انحصاری</div>
                  </div>
                </div>
                {lang === 'fa' ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Pill Bottom Dock */}
      <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center pointer-events-none">
        <nav className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-white/80 rounded-full shadow-[0_12px_36px_rgba(100,116,139,0.12)] p-1.5 flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('partner');
              trackEvent('tab_switched', { tab: 'partner' });
            }}
            className={`p-3 rounded-full transition-all cursor-pointer ${
              activeTab === 'partner'
                ? 'bg-[#EDE4FF] text-[#7C3AED] shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title={t.tabPartner}
          >
            <Heart className={`w-5 h-5 ${activeTab === 'partner' ? 'fill-[#7C3AED]' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('history');
              trackEvent('tab_switched', { tab: 'history' });
            }}
            className={`p-3 rounded-full transition-all cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#EDE4FF] text-[#7C3AED] shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title={t.tabHistory}
          >
            <History className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('profile');
              trackEvent('tab_switched', { tab: 'profile' });
            }}
            className={`p-3 rounded-full transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#EDE4FF] text-[#7C3AED] shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
            title={t.tabStatus}
          >
            <User className="w-5 h-5" />
          </button>
        </nav>
      </div>

      {/* Subscription Bottom Sheet (No close X, drag to dismiss) */}
      <SubscriptionModal
        isOpen={showSubscriptionSheet}
        onClose={() => setShowSubscriptionSheet(false)}
        lang={lang}
        authToken={authToken}
        onSubscribed={() => {
          setHasSubscription(true);
          authenticateSession();
          trackEvent('subscription_purchased');
        }}
        onShowSuccessAlert={(title, desc) => {
          setSuccessAlert({
            isOpen: true,
            title,
            description: desc,
          });
        }}
      />

      {/* Privacy Bottom Sheet */}
      <BottomSheet isOpen={showPrivacySheet} onClose={() => setShowPrivacySheet(false)}>
        <div className="space-y-4 pt-1 text-center">
          <div className="w-16 h-16 rounded-full bg-[#EDE4FF] text-[#7C3AED] flex items-center justify-center mx-auto shadow-md">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-800">{t.privacyNoticeTitle}</h3>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed text-right font-normal">
            {t.privacyNoticeBody}
          </div>
          <div className="p-4 rounded-3xl bg-[#F0FDF4] border border-emerald-100 text-xs text-emerald-800 leading-relaxed text-right font-semibold">
            ✓ هیچ تصویر چهره یا کارت ملی در سرورهای ما ذخیره دائم نمی‌شود و بلافاصله پس از استعلام با سامانه ثبت احوال و شاهکار نابود می‌گردد.
          </div>
        </div>
      </BottomSheet>

      {/* Help & Manifesto Bottom Sheet */}
      <BottomSheet isOpen={showHelpSheet} onClose={() => setShowHelpSheet(false)}>
        <div className="space-y-4 pt-1 text-center">
          <div className="w-16 h-16 rounded-full bg-[#FFF5EF] text-[#FF6B50] flex items-center justify-center mx-auto shadow-md">
            <HelpCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-800">{t.helpFaqTitle}</h3>
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 text-xs text-slate-600 leading-relaxed text-right font-normal">
            {t.helpFaqAnswer}
          </div>
        </div>
      </BottomSheet>

      {/* Centered In-Your-Face Alert for Payment Successful & Critical Notices */}
      <SuccessNotificationModal
        isOpen={successAlert.isOpen}
        onClose={() => setSuccessAlert((prev) => ({ ...prev, isOpen: false }))}
        title={successAlert.title}
        description={successAlert.description}
      />
    </div>
  );
}
