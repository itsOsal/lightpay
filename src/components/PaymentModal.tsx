import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import QRCode from 'qrcode';
import confetti from 'canvas-confetti';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { PaymentOrder } from '../types';
import { sound } from '../utils/sound';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: (unlockToken: string) => void;
  activeOrder: PaymentOrder | null;
  onCreateNewOrder: () => Promise<PaymentOrder | null>;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  onPaymentSuccess,
  activeOrder,
  onCreateNewOrder,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [showUtrBox, setShowUtrBox] = useState(false);
  const [timeLeft, setTimeLeft] = useState(900);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const orderId = activeOrder?.orderId || 'LP-INIT';
  const upiId = activeOrder?.upiId || 'itskimsia-1@okicici';
  const payeeName = activeOrder?.payeeName || 'Osal';
  const amount = activeOrder?.amount || 50;
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(
    payeeName
  )}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Light OFF Token ${orderId}`)}`;

  useEffect(() => {
    if (!isOpen) return;

    QRCode.toDataURL(upiUri, {
      width: 280,
      margin: 1,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error('QR generation error:', err));
  }, [upiUri, isOpen]);

  useEffect(() => {
    if (!isOpen || !activeOrder) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((activeOrder.expiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, activeOrder]);

  useEffect(() => {
    if (!isOpen || !activeOrder?.orderId || verificationSuccess) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${activeOrder.orderId}`);
        const data = await res.json();
        if (data.success && data.status === 'SUCCESS' && data.unlockToken) {
          handleSuccess(data.unlockToken);
        }
      } catch {
        // silent
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, activeOrder?.orderId, verificationSuccess]);

  const handleSuccess = (unlockToken: string) => {
    setVerificationSuccess(true);
    setIsVerifying(false);
    setVerificationError(null);
    sound.playPaymentSuccess();

    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#2563eb', '#22c55e', '#38bdf8', '#fbbf24'],
      });
    } catch {
      // fallback
    }

    onPaymentSuccess(unlockToken);
  };

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleVerify = async (mode: 'MANUAL_UTR' | 'INSTANT_GATEWAY') => {
    if (!activeOrder?.orderId) {
      setVerificationError('No active order. Please refresh.');
      return;
    }

    setIsVerifying(true);
    setVerificationError(null);

    try {
      const payload =
        mode === 'INSTANT_GATEWAY'
          ? {
              orderId: activeOrder.orderId,
              verificationType: 'INSTANT_DEMO',
              simulationSecret: 'VERIFIED_GATEWAY_WEBHOOK',
            }
          : {
              orderId: activeOrder.orderId,
              utr: utrInput,
              verificationType: 'MANUAL_UTR',
            };

      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (response.ok && result.success && result.unlockToken) {
        handleSuccess(result.unlockToken);
      } else {
        setIsVerifying(false);
        setVerificationError(
          result.message || 'Payment verification failed. Please check your UTR number.'
        );
        sound.playLockedBuzz();
      }
    } catch (err: unknown) {
      setIsVerifying(false);
      const msg = err instanceof Error ? err.message : 'Network error verifying payment.';
      setVerificationError(msg);
      sound.playLockedBuzz();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="payment-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-slate-900 w-full max-w-[440px] rounded-[40px] border border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col items-center text-center my-auto text-slate-50 relative"
      >
        {/* Sleek top pill handle */}
        <div className="w-16 h-1 bg-slate-800 rounded-full mb-6 shrink-0" />

        {/* Close Button Top Right */}
        <button
          id="close-payment-modal-btn"
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          title="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold mb-2 tracking-tight">Turn Off the Light</h2>
        <p className="text-slate-400 mb-6 text-sm">
          Amount:{' '}
          <span className="text-slate-50 font-mono text-xl font-bold ml-1">
            ₹{amount}.00
          </span>
        </p>

        {!verificationSuccess ? (
          <>
            {/* White Rounded QR Card */}
            <div className="bg-white p-4 rounded-3xl mb-4 shadow-xl flex flex-col items-center justify-center relative w-56 h-56 sm:w-60 sm:h-60">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="UPI ₹50 QR Code"
                  className="w-full h-full object-contain rounded-2xl"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-2 text-slate-700" />
                  <span className="text-xs font-semibold text-slate-600">Generating QR...</span>
                </div>
              )}

              {/* Center GPay icon marker */}
              <div className="absolute inset-0 m-auto w-9 h-9 bg-white rounded-full p-1 shadow-md flex items-center justify-center pointer-events-none border border-slate-100">
                <svg viewBox="0 0 24 24" className="w-5 h-5">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.27 21.36 7.34 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              </div>
            </div>

            {/* UPI ID Copy Bar */}
            <div className="flex items-center justify-between w-full max-w-[300px] px-3.5 py-1.5 bg-slate-950/80 rounded-xl border border-slate-800 mb-3 text-xs">
              <span className="font-mono text-slate-300 truncate">{upiId}</span>
              <button
                onClick={handleCopyUpi}
                className="ml-2 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1 shrink-0 transition-colors"
              >
                {copiedUpi ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <p className="text-sm text-slate-400 px-4 leading-relaxed mb-6">
              Scan the QR code and pay ₹50 to unlock the OFF button.
            </p>

            {/* Status & Verification Box */}
            <div className="w-full space-y-4">
              {/* Waiting for payment status pill */}
              <div className="flex items-center justify-center gap-3 py-3 px-4 bg-slate-950 rounded-2xl border border-slate-800">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-sm font-medium text-slate-400">
                  Waiting for payment...
                </span>
              </div>

              {/* Error Alert */}
              <AnimatePresence>
                {verificationError && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-2 text-rose-300 text-xs text-left"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{verificationError}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons from Sleek Theme */}
              {!showUtrBox ? (
                <div className="flex flex-col sm:flex-row gap-3 w-full">
                  <button
                    id="ive-paid-btn"
                    onClick={() => setShowUtrBox(true)}
                    disabled={isVerifying}
                    className="flex-1 py-4 bg-white text-slate-950 font-bold rounded-2xl hover:bg-slate-200 transition-colors text-sm shadow-md cursor-pointer"
                  >
                    I've Paid
                  </button>
                  <button
                    id="instant-demo-verify-btn"
                    onClick={() => handleVerify('INSTANT_GATEWAY')}
                    disabled={isVerifying}
                    className="py-4 px-5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-colors text-sm shadow-lg shadow-blue-900/20 flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Simulate payment gateway webhook confirmation"
                  >
                    {isVerifying ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    <span>Simulate Webhook</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="px-6 py-4 bg-slate-800 text-white font-bold rounded-2xl hover:bg-slate-700 transition-colors text-sm cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                /* Manual UTR Input View */
                <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      12-Digit UPI Reference (UTR):
                    </span>
                    <button
                      onClick={() => setShowUtrBox(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Back
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. 423891048291"
                    value={utrInput}
                    onChange={(e) => setUtrInput(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                    className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    maxLength={16}
                  />
                  <button
                    onClick={() => handleVerify('MANUAL_UTR')}
                    disabled={isVerifying || utrInput.trim().length < 6}
                    className="w-full py-3 bg-white text-slate-950 font-bold rounded-xl hover:bg-slate-200 disabled:opacity-50 text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isVerifying && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Confirm UTR & Unlock</span>
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Sleek Verified State */
          <div className="w-full space-y-5 py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/20 text-green-400 mx-auto flex items-center justify-center shadow-lg shadow-green-500/20">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-green-400">Payment Verified!</h3>
              <p className="text-xs text-slate-400 mt-1">
                The smart light OFF button has been unlocked on the server.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-4 bg-green-500 hover:bg-green-400 text-slate-950 font-bold rounded-2xl transition-colors shadow-lg shadow-green-900/30 text-base cursor-pointer"
            >
              Proceed to Turn Light OFF
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
