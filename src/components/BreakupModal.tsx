import React, { useState } from 'react';
import { HeartCrack, AlertTriangle } from 'lucide-react';
import { translations, Language } from '../i18n/translations.ts';
import { BottomSheet } from './BottomSheet.tsx';

interface BreakupModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  relationshipId: string;
  authToken: string;
  onTerminated: () => void;
}

export const BreakupModal: React.FC<BreakupModalProps> = ({
  isOpen,
  onClose,
  lang,
  relationshipId,
  authToken,
  onTerminated,
}) => {
  const t = translations[lang];
  const [selectedReason, setSelectedReason] = useState<string>(t.reasonIncompatible);
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reasons = [
    t.reasonIncompatible,
    t.reasonDistance,
    t.reasonDishonesty,
    t.reasonFamily,
    t.reasonOther,
  ];

  const handleConfirmBreakup = async () => {
    const finalReason = customReason.trim() ? `${selectedReason} - ${customReason.trim()}` : selectedReason;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/relationship/terminate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          relationshipId,
          reason: finalReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Termination failed');

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
      }

      onTerminated();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error ending relationship';
      setErrorMsg(msg);
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 pt-1 text-center">
        {/* Coral/Rose Circular Icon Container */}
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#FFA07A] to-[#E11D48] text-white flex items-center justify-center mx-auto shadow-[0_8px_20px_rgba(225,29,72,0.25)]">
          <HeartCrack className="w-8 h-8 fill-white" />
        </div>

        <div className="space-y-1">
          <h3 className="text-xl font-black text-slate-800">{t.endRelationshipModalTitle}</h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            {t.endRelationshipModalWarning}
          </p>
        </div>

        {/* Telegram & FCM Alert Callout */}
        <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-2xl text-[11px] text-rose-800 flex items-start gap-2.5 text-right">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <span>{t.breakupNotificationNotice}</span>
        </div>

        {/* Reason Selection */}
        <div className="space-y-2 text-right">
          <label className="text-xs font-bold text-slate-700 block">{t.selectBreakupReason}</label>
          <div className="space-y-1.5">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedReason(r)}
                className={`w-full text-right p-3.5 rounded-2xl text-xs transition-all cursor-pointer border ${
                  selectedReason === r
                    ? 'bg-[#FAF8FF] border-[#8B5CF6] text-[#7C3AED] font-bold shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Additional Comments */}
        <div className="text-right">
          <textarea
            rows={2}
            value={customReason}
            onChange={(e) => setCustomReason(e.target.value)}
            placeholder={t.customReasonPlaceholder}
            className="w-full p-3.5 bg-slate-50 border border-slate-200 focus:border-[#8B5CF6] focus:ring-2 focus:ring-[#8B5CF6]/20 rounded-2xl text-slate-800 placeholder:text-slate-400 text-xs outline-none transition-all"
          />
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 text-right">
            {errorMsg}
          </div>
        )}

        <div className="pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirmBreakup}
            className="w-full py-4 px-6 rounded-full bg-[#181D27] hover:bg-[#252C3B] text-white font-black text-sm shadow-[0_8px_20px_rgba(24,29,39,0.2)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <HeartCrack className="w-4 h-4 text-rose-400" />
            <span>{isSubmitting ? 'در حال ثبت...' : t.confirmBreakupBtn}</span>
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};
