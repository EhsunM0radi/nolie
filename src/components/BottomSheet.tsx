import React, { useRef, useState, useEffect } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxHeight?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  maxHeight = 'max-h-[88vh]',
}) => {
  const [offsetY, setOffsetY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const startYRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setOffsetY(0);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    startYRef.current = e.clientY;
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || startYRef.current === null) return;
    const delta = e.clientY - startYRef.current;
    if (delta > 0) {
      setOffsetY(delta);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture was already released
    }
    if (offsetY > 70) {
      onClose();
    } else {
      setOffsetY(0);
    }
    startYRef.current = null;
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Backdrop tap to dismiss */}
      <div className="flex-1 w-full" onClick={onClose} />

      {/* Bottom Sheet Container */}
      <div
        style={{
          transform: `translateY(${offsetY}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`w-full max-w-md mx-auto bg-white rounded-t-[36px] shadow-[0_-10px_40px_rgba(0,0,0,0.12)] border-t border-slate-100 flex flex-col overflow-hidden ${maxHeight} animate-in slide-in-from-bottom duration-300`}
      >
        {/* Generous Drag Area at Top (Handles both Touch & Pointer) */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full pt-4 pb-3 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing select-none touch-none"
        >
          <div className="w-12 h-1.5 bg-slate-300 hover:bg-slate-400 rounded-full transition-colors" />
          <span className="text-[10px] text-slate-400 font-medium mt-1 select-none pointer-events-none">
            برای بستن به پایین بکشید
          </span>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-8 pt-1 no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
