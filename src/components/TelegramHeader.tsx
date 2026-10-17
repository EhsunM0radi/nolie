import React from 'react';
import { Heart, ShieldCheck, Globe, Crown } from 'lucide-react';
import type { VerificationState } from '../types/index.ts';
import { translations, Language } from '../i18n/translations.ts';

interface TelegramHeaderProps {
  telegramUser?: {
    first_name: string;
    last_name?: string;
    username?: string;
  };
  currentState: VerificationState;
  isIdentityVerified: boolean;
  lang: Language;
  onToggleLanguage: () => void;
  hasSubscription: boolean;
  onOpenSubscription: () => void;
  onSelectScreen?: (screen: string) => void;
  activeScreen: string;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  telegramUser,
  currentState,
  isIdentityVerified,
  lang,
  onToggleLanguage,
  hasSubscription,
  onOpenSubscription,
}) => {
  const t = translations[lang];

  return (
    <header className="w-full bg-[#080b12]/80 backdrop-blur-2xl border-b border-white/[0.08] sticky top-0 z-40 px-4 py-3 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.5)]">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand Lockup: Entwined Romantic Heart */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-400 flex items-center justify-center text-white shadow-[0_4px_16px_-2px_rgba(225,29,72,0.4)] shrink-0">
            <Heart className="w-5 h-5 fill-white text-white" />
          </div>
          <div>
            <div className="text-sm font-extrabold text-slate-100 flex items-center gap-1.5 leading-tight">
              <span>{t.appTitle}</span>
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
              {isIdentityVerified ? (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {t.verifiedBadge}
                </span>
              ) : (
                <span className="text-rose-400 font-medium">
                  {currentState === 'UNSTARTED' ? t.unverifiedBadge : currentState}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Controls: VIP Pass & Language Switcher */}
        <div className="flex items-center gap-2">
          {/* VIP Subscription Pill */}
          <button
            type="button"
            onClick={onOpenSubscription}
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              hasSubscription
                ? 'bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-rose-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_14px_rgba(245,158,11,0.2)] hover:border-amber-400/60'
                : 'bg-white/[0.04] text-slate-300 border border-white/[0.08] hover:border-rose-500/40'
            }`}
          >
            <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{hasSubscription ? (lang === 'fa' ? 'اشتراک VIP' : 'VIP') : (lang === 'fa' ? 'عضویت' : 'Get VIP')}</span>
          </button>

          {/* Language Switcher */}
          <button
            type="button"
            onClick={onToggleLanguage}
            className="px-2.5 py-1.5 rounded-xl border border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
            title="تغییر زبان / Switch Language"
          >
            <Globe className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span>{t.langToggle}</span>
          </button>

          {/* Telegram User Avatar Circle */}
          {telegramUser && (
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 border border-white/[0.12] flex items-center justify-center text-xs text-rose-200 font-bold shadow-sm">
              {telegramUser.first_name[0]}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
