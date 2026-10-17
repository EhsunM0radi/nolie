import React, { useState, useEffect } from 'react';
import {
  Heart,
  HeartHandshake,
  HeartCrack,
  ShieldCheck,
  UserCheck,
  Send,
  AlertCircle,
  Clock,
  Calendar,
  Sparkles,
  Lock,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { translations, Language } from '../i18n/translations.ts';
import { toPersianDigits, formatPersianDate } from '../utils/persian.ts';
import { BreakupModal } from './BreakupModal.tsx';

interface RelationshipManagerProps {
  lang: Language;
  authToken: string;
  hasSubscription: boolean;
  onOpenSubscriptionModal: () => void;
  onViewHistory: () => void;
  onStartVerification?: () => void;
}

export const RelationshipManager: React.FC<RelationshipManagerProps> = ({
  lang,
  authToken,
  hasSubscription,
  onOpenSubscriptionModal,
  onViewHistory,
}) => {
  const t = translations[lang];
  const [loading, setLoading] = useState(true);
  const [relStatus, setRelStatus] = useState<'SINGLE' | 'PENDING' | 'IN_RELATIONSHIP'>('SINGLE');
  const [relationship, setRelationship] = useState<any>(null);
  const [partnerProfile, setPartnerProfile] = useState<any>(null);
  const [isSender, setIsSender] = useState<boolean>(false);

  // Invite form state
  const [targetInput, setTargetInput] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  // Breakup modal state
  const [showBreakupModal, setShowBreakupModal] = useState(false);

  // Quick suggestions with Persian digits in Persian mode
  const quickSuggestions = [
    {
      label: lang === 'fa' ? 'علیرضا (۰۹۱۲۱۱۱۲۲۳۳)' : 'Alireza (09121112233)',
      value: '09121112233',
    },
    {
      label: lang === 'fa' ? 'سارا (۰۹۳۵۲۲۲۳۳۴۴)' : 'Sara (09352223344)',
      value: '09352223344',
    },
    {
      label: lang === 'fa' ? 'نیما (۰۹۱۹۵۵۵۶۶۷۷)' : 'Nima (09195556677)',
      value: '09195556677',
    },
  ];

  const fetchRelationship = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/relationship/current', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setRelStatus(data.status);
        setRelationship(data.relationship);
        setPartnerProfile(data.partnerProfile);
        setIsSender(Boolean(data.isSender));
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRelationship();
  }, []);

  const handleSendInvite = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasSubscription) {
      onOpenSubscriptionModal();
      return;
    }

    if (!targetInput.trim()) {
      setInviteError(
        lang === 'fa'
          ? 'لطفاً شماره همراه یا کد ملی پارتنر را وارد نمایید.'
          : 'Please enter partner mobile number or ID.'
      );
      return;
    }

    setIsSendingInvite(true);
    setInviteError(null);
    setInviteSuccessMsg(null);

    try {
      const res = await fetch('/api/relationship/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ targetIdentifier: targetInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to dispatch invite');

      setInviteSuccessMsg(
        lang === 'fa'
          ? 'دعوت‌نامه رسمی تعهد ارسال شد. اعلان در تلگرام و نوتیفیکیشن برای پارتنر شما ارسال گردید.'
          : 'Commitment invite dispatched. Telegram and push alert sent to your partner.'
      );
      setTargetInput('');
      fetchRelationship();

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error sending invite';
      setInviteError(msg);
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleRespondInvite = async (accept: boolean) => {
    if (!relationship?.id) return;

    try {
      const res = await fetch('/api/relationship/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ relationshipId: relationship.id, accept }),
      });

      if (res.ok) {
        fetchRelationship();
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred(accept ? 'success' : 'warning');
        }
      }
    } catch {
      // Handle error
    }
  };

  const calculateDaysTogether = (timestamp?: number) => {
    if (!timestamp) return 1;
    const diffMs = Date.now() - timestamp;
    return Math.max(1, Math.floor(diffMs / (86400 * 1000)));
  };

  // Directional Chevron for row items (In RTL, clicking left-side chevron drills in, so it points LEFT)
  const RowChevron = () =>
    lang === 'fa' ? <ChevronLeft className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />;

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Monogamy Rule Banner (Soft Coral Card) */}
      <div className="p-4 bg-gradient-to-r from-[#FFF0EA] via-[#FFF6F2] to-[#FAF7FF] border border-[#FFE0D3] rounded-[28px] shadow-sm flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#FFA07A]/20 text-[#FF6B50] flex items-center justify-center shrink-0">
          <HeartHandshake className="w-5 h-5" />
        </div>
        <div className="space-y-0.5 text-right">
          <div className="text-xs font-black text-slate-800">{t.monogamyRuleTitle}</div>
          <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
            {t.monogamyRuleBody}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 space-y-2">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-[#8B5CF6] rounded-full animate-spin mx-auto" />
          <span>{lang === 'fa' ? 'در حال بررسی وضعیت...' : 'Checking status...'}</span>
        </div>
      ) : relStatus === 'IN_RELATIONSHIP' ? (
        /* ================= ACTIVE RELATIONSHIP VIEW ================= */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Main Hero Card with Dotted Background Matrix */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_12px_36px_rgba(100,116,139,0.06)] border border-slate-100 space-y-5">
            <div className="rounded-[28px] bg-dot-matrix bg-[#FAF8FF] border border-purple-100/60 p-6 text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FFA07A] to-[#FF6B50] text-white flex items-center justify-center mx-auto shadow-[0_10px_25px_rgba(255,107,80,0.35)]">
                <Heart className="w-10 h-10 fill-white" />
              </div>
              <div>
                <span className="text-[11px] font-extrabold px-3 py-1 rounded-full bg-[#EDE4FF] text-[#7C3AED]">
                  {lang === 'fa' ? 'هم‌پیمان رسمی' : 'Officially Bound'}
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-2">
                  {partnerProfile?.firstName} {partnerProfile?.lastName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {lang === 'fa' ? toPersianDigits(partnerProfile?.maskedPhone) : partnerProfile?.maskedPhone}
                </p>
              </div>
            </div>

            {/* Duration Counters with Persian Digits and Shamsi Date */}
            <div className="grid grid-cols-2 gap-3 text-right">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5 text-[#FF6B50]" />
                  <span>{lang === 'fa' ? 'مدت تعهد' : 'Duration'}</span>
                </div>
                <div className="text-base font-black text-slate-800">
                  {lang === 'fa'
                    ? `${toPersianDigits(calculateDaysTogether(relationship?.startedAt))} ${t.daysTogether}`
                    : `${calculateDaysTogether(relationship?.startedAt)} ${t.daysTogether}`}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Calendar className="w-3.5 h-3.5 text-[#8B5CF6]" />
                  <span>{t.sinceDate}</span>
                </div>
                <div className="text-xs font-black text-slate-800 pt-0.5">
                  {lang === 'fa'
                    ? formatPersianDate(relationship?.startedAt || Date.now())
                    : new Date(relationship?.startedAt || Date.now()).toLocaleDateString('en-US')}
                </div>
              </div>
            </div>

            {/* Menu Style Action Cards with Proper Directional Chevron */}
            <div className="space-y-2 pt-1">
              <div
                onClick={onViewHistory}
                className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-purple-200 flex items-center justify-between cursor-pointer shadow-sm active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#EDE4FF] text-[#7C3AED] flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-slate-800">
                      {lang === 'fa' ? 'مشاهده تاریخچه روابط قبلی پارتنر' : 'View Partner Past History'}
                    </div>
                    <div className="text-[10px] text-slate-400">شفافیت کامل طرفین</div>
                  </div>
                </div>
                <RowChevron />
              </div>

              <div
                onClick={() => setShowBreakupModal(true)}
                className="p-4 rounded-2xl bg-white border border-slate-100 hover:border-rose-200 flex items-center justify-between cursor-pointer shadow-sm active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <HeartCrack className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-rose-600">{t.endRelationshipBtn}</div>
                    <div className="text-[10px] text-slate-400">ثبت پایان رابطه همراه با اعلان به طرفین</div>
                  </div>
                </div>
                <RowChevron />
              </div>
            </div>
          </div>
        </div>
      ) : relStatus === 'PENDING' ? (
        /* ================= PENDING INVITATION VIEW ================= */
        <div className="bg-white rounded-[32px] p-6 shadow-[0_12px_36px_rgba(100,116,139,0.06)] border border-slate-100 space-y-4 animate-in fade-in duration-200">
          <div className="rounded-[28px] bg-dot-matrix bg-[#FFFBF8] border border-amber-100 p-6 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FFA07A] to-amber-400 text-white flex items-center justify-center mx-auto shadow-md">
              <Clock className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-800">{t.pendingInviteStatus}</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {isSender
                ? 'دعوت‌نامه رسمی تعهد شما برای پارتنر ارسال شد. به محض تأیید ایشان، رابطه انحصاری ثبت خواهد شد.'
                : `کاربر ${partnerProfile?.firstName || 'پارتنر'} برای شما دعوت‌نامه ثبت رابطه متعهدانه ارسال کرده است.`}
            </p>
          </div>

          {!isSender && (
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => handleRespondInvite(false)}
                className="flex-1 py-3.5 px-4 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer"
              >
                {lang === 'fa' ? 'رد درخواست' : 'Decline'}
              </button>
              <button
                type="button"
                onClick={() => handleRespondInvite(true)}
                className="flex-2 py-3.5 px-4 rounded-full bg-[#181D27] text-white font-bold text-xs shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <HeartHandshake className="w-4 h-4 text-[#FFA07A]" />
                <span>{lang === 'fa' ? 'پذیرش و ثبت تعهد' : 'Accept Commitment'}</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ================= SINGLE / INVITE PARTNER VIEW ================= */
        <div className="space-y-5 animate-in fade-in duration-200">
          {/* Hero Card */}
          <div className="bg-white rounded-[32px] p-6 shadow-[0_12px_36px_rgba(100,116,139,0.06)] border border-slate-100 space-y-5">
            {/* Dotted Inner Container */}
            <div className="rounded-[28px] bg-dot-matrix bg-[#FAF8FF] border border-purple-100/70 p-7 text-center space-y-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#FFA07A] to-[#FF6B50] text-white flex items-center justify-center mx-auto shadow-[0_10px_25px_rgba(255,107,80,0.35)]">
                <Heart className="w-10 h-10 fill-white" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-slate-800">{t.invitePartnerTitle}</h3>
                <p className="text-xs text-slate-400 font-medium">
                  {lang === 'fa' ? 'راستی‌آزمایی و تعهد انحصاری دوطرفه' : 'Mutual Exclusive Commitment'}
                </p>
              </div>
            </div>

            {/* Input Field */}
            <div className="space-y-2 text-right">
              <label className="text-xs font-bold text-slate-700 block">
                {lang === 'fa' ? 'شماره موبایل یا شناسه پارتنر:' : 'Partner Mobile or ID:'}
              </label>
              <input
                type="text"
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                placeholder={t.inviteInputPlaceholder}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 focus:border-[#8B5CF6] focus:bg-white focus:ring-2 focus:ring-[#8B5CF6]/20 rounded-2xl text-slate-800 placeholder:text-slate-400 text-sm outline-none transition-all font-medium"
              />
            </div>

            {/* Quick Chips Section with Persian Digits */}
            <div className="space-y-2 text-right">
              <span className="text-[11px] font-bold text-slate-500 block">
                {lang === 'fa' ? 'پیشنهادهای نمونه:' : 'Quick Picks:'}
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {quickSuggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setTargetInput(item.value)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                      targetInput === item.value
                        ? 'bg-[#EDE4FF] text-[#7C3AED] shadow-sm'
                        : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {inviteError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-start gap-2.5 text-right">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{inviteError}</span>
              </div>
            )}

            {inviteSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-start gap-2.5 text-right">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{inviteSuccessMsg}</span>
              </div>
            )}

            {/* Primary Dark Pill Button */}
            <button
              type="button"
              disabled={isSendingInvite}
              onClick={() => handleSendInvite()}
              className="w-full py-4 px-6 rounded-full bg-[#181D27] hover:bg-[#252C3B] text-white font-black text-sm shadow-[0_10px_25px_rgba(24,29,39,0.2)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-[#FFA07A]" />
              <span>{isSendingInvite ? (lang === 'fa' ? 'در حال ارسال...' : 'Sending...') : t.sendInviteBtn}</span>
            </button>
          </div>
        </div>
      )}

      {/* Breakup Bottom Sheet */}
      {relationship && (
        <BreakupModal
          isOpen={showBreakupModal}
          onClose={() => setShowBreakupModal(false)}
          lang={lang}
          relationshipId={relationship.id}
          authToken={authToken}
          onTerminated={() => {
            fetchRelationship();
          }}
        />
      )}
    </div>
  );
};
