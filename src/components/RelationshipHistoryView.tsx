import React, { useState, useEffect } from 'react';
import { History, HeartCrack, Clock, Sparkles, User, ShieldCheck } from 'lucide-react';
import { translations, Language } from '../i18n/translations.ts';
import { toPersianDigits, formatPersianDate } from '../utils/persian.ts';

interface RelationshipHistoryViewProps {
  lang: Language;
  authToken: string;
}

export const RelationshipHistoryView: React.FC<RelationshipHistoryViewProps> = ({
  lang,
  authToken,
}) => {
  const t = translations[lang];
  const [loading, setLoading] = useState(true);
  const [myHistory, setMyHistory] = useState<any[]>([]);
  const [partnerHistory, setPartnerHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/relationship/history', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setMyHistory(data.myHistory || []);
        setPartnerHistory(data.partnerHistory || []);
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const calculateDays = (start?: number, end?: number) => {
    if (!start || !end) return 0;
    return Math.max(1, Math.round((end - start) / (86400 * 1000)));
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Intro Header Card */}
      <div className="p-5 bg-gradient-to-r from-[#FFF0EA] via-[#FAF7FF] to-[#F4EFFF] border border-purple-100/80 rounded-[28px] shadow-sm flex items-start gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#EDE4FF] text-[#7C3AED] flex items-center justify-center shrink-0">
          <History className="w-5 h-5" />
        </div>
        <div className="space-y-0.5 text-right">
          <div className="text-xs font-black text-slate-800">{t.historyTitle}</div>
          <p className="text-[11px] text-slate-600 leading-relaxed font-normal">
            {t.historySubtitle}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400 space-y-2">
          <div className="w-8 h-8 border-3 border-purple-200 border-t-[#8B5CF6] rounded-full animate-spin mx-auto" />
          <span>{lang === 'fa' ? 'در حال بارگذاری تاریخچه شفاف...' : 'Loading history...'}</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Partner's Past History (if available) */}
          {partnerHistory.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-black text-purple-900 flex items-center gap-1.5 px-2">
                <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6]" />
                <span>
                  {lang === 'fa'
                    ? `تاریخچه پارتنر فعلی شما (${toPersianDigits(partnerHistory.length)} رابطه پیشین)`
                    : `Current Partner's Past History (${partnerHistory.length} records)`}
                </span>
              </div>

              {partnerHistory.map((rel, idx) => (
                <div
                  key={rel.id || idx}
                  className="bg-white rounded-[32px] p-5 shadow-[0_10px_30px_rgba(100,116,139,0.06)] border border-slate-100 space-y-3.5 text-xs text-right"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <HeartCrack className="w-4 h-4 text-rose-500" />
                      {t.pastRelationshipCard} #{lang === 'fa' ? toPersianDigits(idx + 1) : idx + 1}
                    </span>
                    <span className="text-[11px] font-bold text-purple-800 bg-[#EDE4FF] px-3 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#7C3AED]" />
                      {lang === 'fa'
                        ? `${toPersianDigits(calculateDays(rel.startedAt, rel.terminatedAt))} ${t.daysTogether}`
                        : `${calculateDays(rel.startedAt, rel.terminatedAt)} ${t.daysTogether}`}
                    </span>
                  </div>

                  {rel.startedAt && rel.terminatedAt && (
                    <div className="text-[11px] text-slate-400">
                      {lang === 'fa'
                        ? `از ${formatPersianDate(rel.startedAt)} تا ${formatPersianDate(rel.terminatedAt)}`
                        : `${new Date(rel.startedAt).toLocaleDateString()} to ${new Date(rel.terminatedAt).toLocaleDateString()}`}
                    </div>
                  )}

                  {rel.partner1TerminationReason && (
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 block font-bold">
                        {lang === 'fa' ? 'علت ثبت‌شده توسط طرف اول:' : 'Reason from first party:'}
                      </span>
                      <p className="text-slate-700 bg-slate-50 p-3.5 rounded-2xl text-xs leading-relaxed border border-slate-100">
                        {rel.partner1TerminationReason}
                      </p>
                    </div>
                  )}

                  {rel.partner2TerminationReason && (
                    <div className="space-y-1">
                      <span className="text-[11px] text-slate-500 block font-bold">
                        {lang === 'fa' ? 'روایت طرف دوم:' : 'Counter-perspective:'}
                      </span>
                      <p className="text-slate-700 bg-slate-50 p-3.5 rounded-2xl text-xs leading-relaxed border border-slate-100">
                        {rel.partner2TerminationReason}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* User's Own History */}
          <div className="space-y-3 pt-1">
            <div className="text-xs font-black text-slate-700 flex items-center gap-1.5 px-2">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {lang === 'fa'
                  ? `تاریخچه گذشته شما (${toPersianDigits(myHistory.length)} سابقه)`
                  : `Your Personal Past Records (${myHistory.length} records)`}
              </span>
            </div>

            {myHistory.length === 0 ? (
              <div className="bg-white rounded-[32px] p-7 shadow-[0_10px_30px_rgba(100,116,139,0.06)] border border-slate-100 text-center space-y-2">
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-800">{t.noPastRelationships}</h4>
                <p className="text-xs text-slate-400">
                  {lang === 'fa'
                    ? 'شما هیچ سابقه پایان رابطه قبلی در سامانه ندارید.'
                    : 'No past terminated relationships recorded.'}
                </p>
              </div>
            ) : (
              myHistory.map((rel, idx) => (
                <div
                  key={rel.id || idx}
                  className="bg-white rounded-[32px] p-5 shadow-[0_10px_30px_rgba(100,116,139,0.06)] border border-slate-100 space-y-3 text-xs text-right"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <HeartCrack className="w-4 h-4 text-slate-400" />
                      {t.pastRelationshipCard} #{lang === 'fa' ? toPersianDigits(idx + 1) : idx + 1}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {lang === 'fa'
                        ? `${toPersianDigits(calculateDays(rel.startedAt, rel.terminatedAt))} ${t.daysTogether}`
                        : `${calculateDays(rel.startedAt, rel.terminatedAt)} ${t.daysTogether}`}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 block font-bold">{t.initiatorReasonLabel}</span>
                    <p className="text-slate-700 bg-slate-50 p-3.5 rounded-2xl text-xs leading-relaxed border border-slate-100">
                      {rel.partner1TerminationReason || rel.partner2TerminationReason || 'ثبت نشده'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
