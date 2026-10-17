import React from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';

interface SuccessNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  buttonText?: string;
}

export const SuccessNotificationModal: React.FC<SuccessNotificationModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  buttonText = 'متوجه شدم',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[32px] p-6 max-w-sm w-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] text-center space-y-4 border border-slate-100 animate-in zoom-in-95 duration-200">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-500 text-white flex items-center justify-center mx-auto shadow-[0_8px_20px_rgba(16,185,129,0.35)]">
          <CheckCircle2 className="w-9 h-9" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-slate-800 flex items-center justify-center gap-1.5">
            <span>{title}</span>
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {description}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 px-4 rounded-full bg-[#181D27] text-white font-bold text-sm hover:bg-[#252C3B] active:scale-[0.98] transition-all cursor-pointer shadow-md"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};
