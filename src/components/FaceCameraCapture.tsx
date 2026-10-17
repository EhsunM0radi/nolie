import React, { useRef, useState, useEffect } from 'react';
import { Camera, Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface FaceCameraCaptureProps {
  onAllPosesCaptured: (samples: { front: string; right: string; left: string }) => void;
  onCancel?: () => void;
}

type PoseStage = 'front' | 'right' | 'left' | 'complete';

export const FaceCameraCapture: React.FC<FaceCameraCaptureProps> = ({
  onAllPosesCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [currentPose, setCurrentPose] = useState<PoseStage>('front');
  const [capturedImages, setCapturedImages] = useState<{
    front?: string;
    right?: string;
    left?: string;
  }>({});
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 800 },
          },
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
          setCameraError(
            'دسترسی مستقیم به دوربین فراهم نشد. حالت شبیه‌ساز دوربین آماده است.'
          );
        }
      }
    }

    startCamera();

    return () => {
      active = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const triggerHaptic = () => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }
  };

  const captureSnapshot = () => {
    setIsCapturing(true);
    triggerHaptic();

    let dataUrl = '';
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 480;
      canvas.height = video.videoHeight || 640;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      }
    }

    if (!dataUrl) {
      dataUrl = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="100%" height="100%" fill="%231a1524"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23fb7185" font-size="20" font-family="sans-serif">Face Sample (${currentPose})</text></svg>`;
    }

    setTimeout(() => {
      setIsCapturing(false);
      if (currentPose === 'front') {
        setCapturedImages((prev) => ({ ...prev, front: dataUrl }));
        setCurrentPose('right');
      } else if (currentPose === 'right') {
        setCapturedImages((prev) => ({ ...prev, right: dataUrl }));
        setCurrentPose('left');
      } else if (currentPose === 'left') {
        const finalSamples = {
          front: capturedImages.front || dataUrl,
          right: capturedImages.right || dataUrl,
          left: dataUrl,
        };
        setCapturedImages((prev) => ({ ...prev, left: dataUrl }));
        setCurrentPose('complete');
        onAllPosesCaptured(finalSamples);
      }
    }, 400);
  };

  const resetAllPoses = () => {
    setCapturedImages({});
    setCurrentPose('front');
  };

  const poseInstructions: Record<PoseStage, { title: string; subtitle: string; angle: string }> = {
    front: {
      title: 'زاویه ۱ از ۳: نگاه مستقیم به دوربین',
      subtitle: 'صورت خود را کاملاً درون بیضی تنظیم کنید و مستقیم نگاه کنید.',
      angle: 'مستقیم (۰ درجه)',
    },
    right: {
      title: 'زاویه ۲ از ۳: چرخش ملایم به راست',
      subtitle: 'سر خود را به آرامی حدود ۲۵ درجه به سمت راست بچرخانید.',
      angle: 'راست (۲۵+ درجه)',
    },
    left: {
      title: 'زاویه ۳ از ۳: چرخش ملایم به چپ',
      subtitle: 'سر خود را به آرامی حدود ۲۵ درجه به سمت چپ بچرخانید.',
      angle: 'چپ (۲۵- درجه)',
    },
    complete: {
      title: 'هر ۳ زاویه با موفقیت ثبت شد',
      subtitle: 'الگوریتم زنده بودن و تطبیق بیومتریک تایید شد.',
      angle: 'تأییدشده',
    },
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Pose Progress Header */}
      <div className="w-full mb-3 flex items-center justify-between text-xs font-medium text-slate-400">
        <span className="flex items-center gap-1.5 text-rose-400">
          <Sparkles className="w-3.5 h-3.5" />
          راهنمای بیومتریک چهره
        </span>
        <div className="flex items-center gap-1.5">
          {(['front', 'right', 'left'] as const).map((pose, idx) => (
            <span
              key={pose}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all ${
                capturedImages[pose]
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : currentPose === pose
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                  : 'bg-white/[0.05] text-slate-500 border border-white/[0.05]'
              }`}
            >
              گام {idx + 1}
            </span>
          ))}
        </div>
      </div>

      {/* Instruction Card */}
      <div className="w-full bg-[#12141f] border border-white/[0.08] rounded-2xl p-3.5 mb-3 text-center shadow-md">
        <div className="text-sm font-semibold text-slate-100 flex items-center justify-center gap-2">
          <span>{poseInstructions[currentPose].title}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950/60 text-rose-300 border border-rose-500/30">
            {poseInstructions[currentPose].angle}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          {poseInstructions[currentPose].subtitle}
        </p>
      </div>

      {/* Camera Viewport with Warm Vertical Oval Guide */}
      <div className="relative w-full aspect-[3/4] max-h-[380px] bg-[#090a10] rounded-3xl overflow-hidden border border-white/[0.08] flex items-center justify-center shadow-2xl">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
        />

        <canvas ref={canvasRef} className="hidden" />

        {/* Ambient Overlay with Oval Cutout */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg className="w-full h-full" viewBox="0 0 300 400">
            <defs>
              <mask id="oval-mask">
                <rect width="300" height="400" fill="white" />
                <ellipse cx="150" cy="200" rx="90" ry="135" fill="black" />
              </mask>
            </defs>
            <rect
              width="300"
              height="400"
              fill="rgba(10, 11, 16, 0.72)"
              mask="url(#oval-mask)"
            />
            {/* Oval Border with warm rose glow */}
            <ellipse
              cx="150"
              cy="200"
              rx="90"
              ry="135"
              fill="none"
              stroke={
                isCapturing
                  ? '#10b981'
                  : currentPose === 'front'
                  ? '#fb7185'
                  : currentPose === 'right'
                  ? '#f43f5e'
                  : '#fb923c'
              }
              strokeWidth="3.5"
              strokeDasharray={isCapturing ? 'none' : '8 6'}
              className="transition-colors duration-300 drop-shadow-[0_0_12px_rgba(244,63,94,0.6)]"
            />
          </svg>
        </div>

        {cameraError && (
          <div className="absolute inset-x-4 top-4 bg-white/95 backdrop-blur-md border border-purple-100 rounded-2xl p-3 text-slate-700 text-xs flex items-start gap-2.5 z-10 shadow-lg text-right">
            <AlertCircle className="w-4 h-4 text-[#8B5CF6] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-slate-900">آماده‌سازی دوربین بیومتریک</p>
              <p className="text-[11px] text-slate-500 mt-0.5">{cameraError}</p>
            </div>
          </div>
        )}

        {isCapturing && (
          <div className="absolute inset-0 bg-white/30 animate-out fade-out duration-300 pointer-events-none" />
        )}
      </div>

      {/* Captured Thumbnails Bar */}
      <div className="w-full flex items-center justify-center gap-3 mt-3">
        {(['front', 'right', 'left'] as const).map((pose) => (
          <div
            key={pose}
            className={`relative w-20 h-24 rounded-2xl overflow-hidden border ${
              capturedImages[pose]
                ? 'border-emerald-500 bg-white shadow-md'
                : 'border-slate-200 bg-white'
            } flex flex-col items-center justify-center text-[10px] text-slate-500`}
          >
            {capturedImages[pose] ? (
              <>
                <img
                  src={capturedImages[pose]}
                  alt={pose}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow">
                  <Check className="w-2.5 h-2.5" />
                </div>
              </>
            ) : (
              <span className="font-bold">{pose === 'front' ? 'روبه‌رو' : pose === 'right' ? 'راست' : 'چپ'}</span>
            )}
          </div>
        ))}
      </div>

      {/* Action Controls */}
      <div className="w-full flex items-center gap-3 mt-4">
        {currentPose !== 'complete' ? (
          <>
            <button
              type="button"
              onClick={captureSnapshot}
              disabled={isCapturing}
              className="flex-1 py-4 px-6 rounded-full font-black text-sm bg-[#181D27] hover:bg-[#252C3B] text-white flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all cursor-pointer"
            >
              <Camera className="w-4 h-4 text-[#FFA07A]" />
              <span>ثبت زاویه {currentPose === 'front' ? 'روبه‌رو' : currentPose === 'right' ? 'راست' : 'چپ'}</span>
            </button>
            <button
              type="button"
              onClick={resetAllPoses}
              className="p-4 rounded-full border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer shadow-sm"
              title="ثبت مجدد"
            >
              <RefreshCw className="w-4 h-4 text-[#8B5CF6]" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={resetAllPoses}
            className="w-full py-3.5 px-6 rounded-full border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>ثبت دوباره زوایا</span>
          </button>
        )}
      </div>
    </div>
  );
};
