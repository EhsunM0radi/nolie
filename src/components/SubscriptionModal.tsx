import React, { useState } from 'react';
import { Crown, Sparkles, Check, Lock, CreditCard } from 'lucide-react';
import { translations, Language } from '../i18n/translations.ts';
import { BottomSheet } from './BottomSheet.tsx';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  authToken: string;
  onSubscribed: () => void;
  onShowSuccessAlert?: (title: string, desc: string) => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({
  isOpen,
  onClose,
  lang,
  authToken,
  onSubscribed,
  onShowSuccessAlert,
}) => {
  const t = translations[lang];
  const [selectedPlan, setSelectedPlan] = useState<'MONTHLY' | 'ANNUAL'>('ANNUAL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGateway, setShowGateway] = useState(false);
  const [cardNumber] = useState('۶۰۳۷-۹۹۷۱-۸۸۲۲-۱۰۴۴');
  const [cvv2] = useState('۳۸۲');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStartCheckout = () => {
    setShowGateway(true);
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  const handleExecutePayment = async () => {
    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/subscription/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ planType: selectedPlan }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Payment simulation failed');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }

      onSubscribed();
      setShowGateway(false);
      onClose();

      if (onShowSuccessAlert) {
        onShowSuccessAlert(
          lang === 'fa' ? 'پرداخت انجام شد' : 'Payment Successful',
          lang === 'fa'
            ? 'اشتراک VIP شما با موفقیت فعال گردید و تمامی امکانات سامانه بازگشایی شد.'
            : 'Your VIP Pass has been activated with full feature access.'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error processing payment';
      setErrorMsg(msg);
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      {!showGateway ? (
        <div className="space-y-5 text-center pt-1">
          {/* Circular Coral Icon Container */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FFA07A] to-[#FF6B50] text-white flex items-center justify-center mx-auto shadow-[0_8px_20px_rgba(255,107,80,0.3)]">
            <Crown className="w-8 h-8 fill-white" />
          </div>

          <div className="space-y-1">
            <h3 className="text-xl font-black text-slate-800">{t.subscriptionRequiredTitle}</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {t.subscriptionRequiredDesc}
            </p>
          </div>

          {/* Plan Selector */}
          <div className="space-y-3 text-right">
            {/* Annual Plan */}
            <div
              onClick={() => setSelectedPlan('ANNUAL')}
              className={`p-4 rounded-3xl border-2 transition-all cursor-pointer relative ${
                selectedPlan === 'ANNUAL'
                  ? 'border-[#8B5CF6] bg-[#FAF8FF] shadow-[0_6px_20px_rgba(139,92,246,0.12)]'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className="absolute -top-2.5 left-4 px-2.5 py-0.5 rounded-full bg-[#8B5CF6] text-white font-bold text-[10px] shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3 fill-white" />
                <span>{t.annualDiscountBadge}</span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-sm text-slate-800">{t.annualPlanTitle}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t.annualPlanPeriod}</div>
                </div>
                <div className="text-left">
                  <div className="text-base font-black text-[#7C3AED]">{t.annualPlanPrice}</div>
                  <div className="text-[11px] text-slate-400 line-through">۱۰۰,۰۰۰ تومان</div>
                </div>
              </div>
            </div>

            {/* Monthly Plan */}
            <div
              onClick={() => setSelectedPlan('MONTHLY')}
              className={`p-4 rounded-3xl border-2 transition-all cursor-pointer ${
                selectedPlan === 'MONTHLY'
                  ? 'border-[#8B5CF6] bg-[#FAF8FF] shadow-[0_6px_20px_rgba(139,92,246,0.12)]'
                  : 'border-slate-100 bg-white hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-extrabold text-sm text-slate-800">{t.monthlyPlanTitle}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{t.monthlyPlanPeriod}</div>
                </div>
                <div className="text-left font-black text-slate-700 text-sm">
                  {t.monthlyPlanPrice}
                </div>
              </div>
            </div>
          </div>

          {/* Perks list */}
          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 space-y-2 text-xs text-slate-600 text-right">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>احراز هویت بیومتریک و تطبیق رسمی ثبت احوال و شاهکار</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>دسترسی کامل به سامانه تعهد انحصاری و ارسال دعوت‌نامه</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>مشاهده شفاف تاریخچه پارتنر رسمی با رضایت متقابل</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartCheckout}
            className="w-full py-4 px-6 rounded-full bg-[#181D27] hover:bg-[#252C3B] text-white font-black text-sm shadow-[0_8px_20px_rgba(24,29,39,0.2)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Crown className="w-4 h-4 text-amber-400" />
            <span>{t.subscribeBtn}</span>
          </button>
        </div>
      ) : (
        /* Payment Simulation Screen */
        <div className="space-y-4 pt-1 text-right">
          <div className="flex items-center justify-between p-3.5 bg-purple-50 border border-purple-100 rounded-2xl">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
              <Lock className="w-4 h-4 text-purple-700" />
              <span>{t.sandboxCheckoutTitle}</span>
            </div>
            <span className="text-[11px] text-purple-700 font-semibold">شاپرک / شتاب</span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            {t.sandboxCheckoutNotice}
          </p>

          <div className="p-4 rounded-3xl bg-slate-50 border border-slate-100 space-y-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-500 block mb-1">شماره کارت آزمایشی:</label>
              <div className="font-mono text-sm tracking-wider text-slate-800 font-bold bg-white p-2.5 rounded-xl border border-slate-200">
                {cardNumber}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">کد CVV2:</label>
                <div className="font-mono text-xs text-slate-800 font-bold bg-white p-2 rounded-xl border border-slate-200">
                  {cvv2}
                </div>
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">مبلغ پرداختی:</label>
                <div className="text-xs text-purple-700 font-bold bg-white p-2 rounded-xl border border-slate-200">
                  {selectedPlan === 'ANNUAL' ? '۶۰۰,۰۰۰ تومان' : '۱۰۰,۰۰۰ تومان'}
                </div>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <div className="pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExecutePayment}
              className="w-full py-4 px-6 rounded-full bg-[#181D27] hover:bg-[#252C3B] text-white font-black text-sm shadow-[0_8px_20px_rgba(24,29,39,0.2)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>{isProcessing ? 'در حال تکمیل تراکنش...' : t.payNowBtn}</span>
            </button>
          </div>
        </div>
      )}
    </BottomSheet>
  );
};
