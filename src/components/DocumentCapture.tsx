import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, RefreshCw, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface DocumentCaptureProps {
  onDocumentCaptured: (dataUrl: string) => void;
}

export const DocumentCapture: React.FC<DocumentCaptureProps> = ({ onDocumentCaptured }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [capturedPreview, setCapturedPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });

        if (active) {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        }
      } catch {
        if (active) {
          setErrorMsg('دسترسی به دوربین در این مرورگر محدود است. می‌توانید تصویر کارت ملی را آپلود کنید.');
        }
      }
    }

    if (!capturedPreview) {
      initCamera();
    }

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [capturedPreview]);

  const snapPhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 800;
      canvas.height = video.videoHeight || 500;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedPreview(dataUrl);
        onDocumentCaptured(dataUrl);
      }
    } else {
      const simulatedSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="380" viewBox="0 0 600 380"><rect width="100%" height="100%" rx="24" fill="%23131522" stroke="%23fb7185" stroke-width="4"/><text x="40" y="70" fill="%23f8fafc" font-size="22" font-family="sans-serif" font-weight="bold">IRAN NATIONAL SMART ID CARD</text><rect x="40" y="100" width="120" height="150" rx="12" fill="%23242738"/><circle cx="100" cy="150" r="35" fill="%2394a3b8"/><path d="M60 230 Q100 190 140 230" fill="%2394a3b8"/><text x="180" y="130" fill="%23cbd5e1" font-size="14" font-family="sans-serif">کارت هوشمند ملی</text><text x="180" y="170" fill="%2394a3b8" font-size="14" font-family="sans-serif">شماره ملی: ••••••••••</text><text x="180" y="210" fill="%2394a3b8" font-size="14" font-family="sans-serif">تطبیق سامانه ثبت احوال</text></svg>`;
      setCapturedPreview(simulatedSvg);
      onDocumentCaptured(simulatedSvg);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setErrorMsg('تنها فرمت‌های تصویری JPEG، PNG یا WebP مجاز هستند.');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setErrorMsg('حجم تصویر نباید بیشتر از ۸ مگابایت باشد.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setCapturedPreview(dataUrl);
      onDocumentCaptured(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const retake = () => {
    setCapturedPreview(null);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      <div className="w-full bg-[#FAF8FF] border border-purple-100 rounded-2xl p-3.5 mb-3 text-xs text-slate-600 text-right">
        <div className="flex items-center gap-2 text-[#7C3AED] font-bold mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>اسکن کارت هوشمند ملی</span>
        </div>
        <p className="text-slate-500 leading-relaxed text-[11px]">
          کارت را کاملاً درون کادر قرار دهید به طوری که نوشته‌ها خوانا و بدون بازتاب نور شدید باشند.
        </p>
      </div>

      {/* Frame Container */}
      <div className="relative w-full aspect-[16/10] bg-slate-900 rounded-[28px] overflow-hidden border border-slate-200 flex items-center justify-center shadow-lg">
        {!capturedPreview ? (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Rectangular Card Framing Guide Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-[88%] h-[82%] rounded-2xl border-2 border-dashed border-[#FFA07A] relative shadow-[0_0_24px_rgba(255,160,122,0.3)] flex items-center justify-center">
                {/* 4 Corner Alignment Brackets */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-[#FFA07A] rounded-tl-xl" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-[#FFA07A] rounded-tr-xl" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-[#FFA07A] rounded-bl-xl" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-[#FFA07A] rounded-br-xl" />

                <span className="text-[11px] font-bold text-white bg-slate-900/80 px-3.5 py-1 rounded-full border border-white/20">
                  تنظیم ۴ گوشه کارت در کادر
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="relative w-full h-full">
            <img
              src={capturedPreview}
              alt="ID Card Preview"
              className="w-full h-full object-contain bg-slate-950"
            />
            <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs px-3.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>مدرک ثبت شد</span>
            </div>
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="w-full mt-2 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Capture or Retake Controls */}
      <div className="w-full flex items-center gap-3 mt-4">
        {!capturedPreview ? (
          <>
            <button
              type="button"
              onClick={snapPhoto}
              className="flex-1 py-4 px-6 rounded-full font-black text-sm bg-[#181D27] hover:bg-[#252C3B] text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#FFA07A]" />
              <span>عکس‌برداری</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="py-4 px-5 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs font-bold shadow-sm"
            >
              <Upload className="w-4 h-4 text-[#8B5CF6]" />
              <span>آپلود فایل</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              className="hidden"
            />
          </>
        ) : (
          <button
            type="button"
            onClick={retake}
            className="w-full py-3.5 px-4 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>عکس‌برداری مجدد</span>
          </button>
        )}
      </div>
    </div>
  );
};
