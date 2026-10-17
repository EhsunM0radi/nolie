import React, { useState } from 'react';
import { Search, ShieldCheck, ShieldAlert, Lock, Info, Clock, Check, AlertCircle } from 'lucide-react';

interface RelationshipCheckerProps {
  authToken: string;
}

export const RelationshipChecker: React.FC<RelationshipCheckerProps> = ({ authToken }) => {
  const [identifierInput, setIdentifierInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [result, setResult] = useState<{
    verifiedAccountExists: boolean;
    rateLimitRemaining?: number;
    resetSeconds?: number;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const performCheck = async (identifierToCheck = identifierInput) => {
    if (!identifierToCheck.trim()) {
      setErrorMessage('Please enter a mobile phone number or national code.');
      return;
    }

    setIsSearching(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await fetch('/api/relationship/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ targetIdentifier: identifierToCheck.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || data.error || 'Check request failed');
      }

      setResult({
        verifiedAccountExists: data.verifiedAccountExists,
        rateLimitRemaining: data.rateLimitRemaining,
        resetSeconds: data.resetSeconds,
      });

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred(
          data.verifiedAccountExists ? 'success' : 'warning'
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lookup failed';
      setErrorMessage(msg);
      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('error');
      }
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Privacy Zero-Knowledge Callout */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm mb-1.5">
          <Lock className="w-4 h-4 text-cyan-400" />
          Zero-Knowledge Verification
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          You can check if a person possesses an active, identity-verified record. To protect individual privacy, this lookup returns only a binary confirmation. Personal details, documents, and photos are never disclosed.
        </p>
      </div>

      {/* Input Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-md">
        <label className="block text-xs font-semibold text-slate-300">
          Target Identifier (Mobile Number or National ID)
        </label>
        <div className="relative">
          <input
            type="text"
            value={identifierInput}
            onChange={(e) => setIdentifierInput(e.target.value)}
            placeholder="e.g. 09121112233 or 0012345679"
            className="w-full px-4 py-3 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl text-slate-100 text-sm placeholder:text-slate-600 outline-none transition-colors"
          />
          {identifierInput && (
            <button
              type="button"
              onClick={() => setIdentifierInput('')}
              className="absolute right-3 top-3 text-xs text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Quick Demo Pre-fills */}
        <div className="flex items-center gap-2 pt-1">
          <span className="text-[11px] text-slate-500">Quick Test:</span>
          <button
            type="button"
            onClick={() => {
              setIdentifierInput('09121112233');
              performCheck('09121112233');
            }}
            className="text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            Verified User
          </button>
          <button
            type="button"
            onClick={() => {
              setIdentifierInput('09350000000');
              performCheck('09350000000');
            }}
            className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            Unregistered
          </button>
        </div>

        <button
          type="button"
          onClick={() => performCheck()}
          disabled={isSearching}
          className="w-full py-3.5 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/30 active:scale-[0.98] transition-all cursor-pointer"
        >
          {isSearching ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Verifying Registry...</span>
            </div>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Check Relationship Verification
            </>
          )}
        </button>

        {/* Anti-Enumeration & Rate Limiting Disclaimer */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/80 pt-2.5">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-cyan-500/80" />
            Anti-enumeration rate limiter active
          </span>
          {result?.rateLimitRemaining !== undefined && (
            <span className="text-cyan-400 font-medium">
              {result.rateLimitRemaining} queries remaining
            </span>
          )}
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-800/60 rounded-xl text-xs text-rose-200 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Lookup Limit or Request Error</p>
            <p className="text-[11px] text-rose-300 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Result Card: strictly boolean zero-knowledge */}
      {result && (
        <div
          className={`p-4 rounded-2xl border transition-all ${
            result.verifiedAccountExists
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
              : 'bg-slate-900 border-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-start gap-3">
            {result.verifiedAccountExists ? (
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="w-6 h-6" />
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-slate-800 text-slate-400 border border-slate-700">
                <ShieldAlert className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1">
              <div className="text-sm font-semibold flex items-center gap-2">
                {result.verifiedAccountExists ? (
                  <span className="text-emerald-400">Verified Account Exists</span>
                ) : (
                  <span className="text-slate-300">No Verified Account Found</span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                {result.verifiedAccountExists
                  ? 'This individual holds an active, identity-verified profile matched with government registry records.'
                  : 'No verified relationship profile exists for this identifier, or verification has expired.'}
              </p>

              {/* Strict payload inspector proof */}
              <div className="mt-3 p-2 rounded-lg bg-black/40 border border-slate-800 text-[11px] font-mono text-cyan-300">
                <span className="text-slate-500">// API Response Payload:</span>
                <pre className="mt-0.5">
                  {JSON.stringify({ verifiedAccountExists: result.verifiedAccountExists }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
