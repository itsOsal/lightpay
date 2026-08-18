/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Power,
  Lock,
  Unlock,
  CreditCard,
  Cpu,
  Activity,
  Volume2,
  VolumeX,
  Radio,
  Wifi,
  Sparkles,
  AlertTriangle,
  Clock,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { LightState, PaymentOrder } from './types';
import { SmartLightVisualizer } from './components/SmartLightVisualizer';
import { PaymentModal } from './components/PaymentModal';
import { IotHardwareDrawer } from './components/IotHardwareDrawer';
import { ActivityLogsModal } from './components/ActivityLogsModal';
import { sound } from './utils/sound';

export default function App() {
  const [lightState, setLightState] = useState<LightState>({
    status: 'OFF',
    turnedOnAt: null,
    totalOnDurationSeconds: 0,
    brightness: 100,
    colorTemperature: '#fffae0',
    powerWatts: 9.5,
    offLockState: 'LOCKED',
    unlockToken: null,
    unlockExpiresAt: null,
    activeOrderId: null,
  });

  const [activeOrder, setActiveOrder] = useState<PaymentOrder | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isIotDrawerOpen, setIsIotDrawerOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unlockToken, setUnlockToken] = useState<string | null>(null);

  // Fetch status from server
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/light/status');
      if (res.ok) {
        const data: LightState = await res.json();
        setLightState(data);
        if (data.unlockToken) {
          setUnlockToken(data.unlockToken);
        }
      }
    } catch (err) {
      console.error('Failed to sync light status with server:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  // Turn Light ON (Free)
  const handleTurnOn = async () => {
    setLoadingAction('ON');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/light/on', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLightState(data.state);
        setUnlockToken(null);
        setActiveOrder(null);
        sound.playSwitchOn();
      } else {
        setErrorMessage(data.message || 'Failed to turn light ON.');
      }
    } catch {
      setErrorMessage('Network error turning on light.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Create ₹50 Payment Order and Open Modal
  const handleOpenPayment = async () => {
    setLoadingAction('PAYMENT');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (res.ok && data.success && data.order) {
        setActiveOrder(data.order);
        setIsPaymentModalOpen(true);
      } else {
        setErrorMessage('Failed to initialize payment gateway.');
      }
    } catch {
      setErrorMessage('Error connecting to payment service.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Turn Light OFF (Requires Token)
  const handleTurnOff = async () => {
    if (lightState.offLockState === 'LOCKED' && !unlockToken) {
      sound.playLockedBuzz();
      handleOpenPayment();
      return;
    }

    setLoadingAction('OFF');
    setErrorMessage(null);
    try {
      const res = await fetch('/api/light/off', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-unlock-token': unlockToken || lightState.unlockToken || '',
        },
        body: JSON.stringify({
          unlockToken: unlockToken || lightState.unlockToken,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setLightState(data.state);
        setUnlockToken(null);
        setActiveOrder(null);
        sound.playSwitchOff();
      } else {
        setErrorMessage(
          data.message || 'Turn OFF blocked: Server-side payment verification required.'
        );
        sound.playLockedBuzz();
        fetchStatus();
      }
    } catch {
      setErrorMessage('Network error turning off light.');
    } finally {
      setLoadingAction(null);
    }
  };

  const handlePaymentSuccess = (token: string) => {
    setUnlockToken(token);
    setLightState((prev) => ({
      ...prev,
      offLockState: 'UNLOCKED',
      unlockToken: token,
    }));
  };

  const isLightOn = lightState.status === 'ON';
  const isOffLocked = isLightOn && lightState.offLockState === 'LOCKED' && !unlockToken;
  const isOffUnlocked = isLightOn && (lightState.offLockState === 'UNLOCKED' || !!unlockToken);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Sleek Interface Header */}
      <header className="flex items-center justify-between px-6 sm:px-8 py-5 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        {/* Brand Icon & Title */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-900/30">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-white">Light</span>
        </div>

        {/* Center Nav Links from Sleek design */}
        <div className="hidden md:flex gap-6 text-sm font-medium text-slate-400">
          <span className="text-blue-400 cursor-pointer">Dashboard</span>
          <span
            onClick={() => setIsIotDrawerOpen(true)}
            className="hover:text-slate-200 transition-colors cursor-pointer"
          >
            Devices &amp; IoT
          </span>
          <span
            onClick={() => setIsLogsModalOpen(true)}
            className="hover:text-slate-200 transition-colors cursor-pointer"
          >
            History &amp; Logs
          </span>
        </div>

        {/* Right Metric and User Profile Pill */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Turn OFF Tariff</span>
            <span className="text-sm font-mono font-bold text-slate-200">₹50.00</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <div
            onClick={() => setIsLogsModalOpen(true)}
            className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 cursor-pointer hover:border-slate-600 transition-colors"
            title="System User & Logs"
          >
            LP
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="flex-grow flex flex-col lg:flex-row p-4 sm:p-8 gap-6 sm:gap-8 max-w-7xl mx-auto w-full">
        {/* Central Device Control Panel */}
        <div className="flex-grow flex flex-col items-center justify-center bg-slate-900/50 rounded-3xl border border-slate-800/50 shadow-2xl relative overflow-hidden p-6 sm:p-10">
          {/* Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 w-full max-w-md p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300 text-xs"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button onClick={() => setErrorMessage(null)} className="text-slate-400 hover:text-white font-bold ml-2">
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Light Visualizer Element */}
          <SmartLightVisualizer
            status={lightState.status}
            lockState={lightState.offLockState}
            turnedOnAt={lightState.turnedOnAt}
            brightness={lightState.brightness}
            colorTemperature={lightState.colorTemperature}
            powerWatts={lightState.powerWatts}
            onPayClick={handleOpenPayment}
          />

          {/* Actions Container from Sleek Theme */}
          <div className="mt-8 sm:mt-10 flex flex-col items-center gap-4 w-full max-w-md">
            {/* Condition 1: Light OFF */}
            {!isLightOn && (
              <>
                <p className="text-slate-300 font-medium text-sm sm:text-base">
                  Turn the light ON for free
                </p>
                <button
                  id="turn-on-light-btn"
                  onClick={handleTurnOn}
                  disabled={loadingAction === 'ON'}
                  className="w-full sm:w-auto px-10 py-5 bg-green-500 hover:bg-green-400 text-slate-950 rounded-2xl font-bold text-lg shadow-lg shadow-green-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Power className="w-5 h-5" />
                  <span>{loadingAction === 'ON' ? 'TURNING ON...' : 'TURN ON (FREE)'}</span>
                </button>
              </>
            )}

            {/* Condition 2: Light ON and LOCKED */}
            {isOffLocked && (
              <>
                <p className="text-slate-300 font-medium text-sm sm:text-base">
                  Pay ₹50 to unlock the OFF button
                </p>
                <button
                  id="pay-to-turn-off-btn"
                  onClick={handleOpenPayment}
                  disabled={loadingAction === 'PAYMENT'}
                  className="w-full sm:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-blue-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>{loadingAction === 'PAYMENT' ? 'PREPARING QR...' : 'PAY ₹50 TO TURN OFF'}</span>
                </button>
              </>
            )}

            {/* Condition 3: Light ON and UNLOCKED */}
            {isOffUnlocked && (
              <>
                <p className="text-green-400 font-medium text-sm sm:text-base flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Payment Verified! Turn OFF is unlocked</span>
                </p>
                <button
                  id="turn-off-light-btn"
                  onClick={handleTurnOff}
                  disabled={loadingAction === 'OFF'}
                  className="w-full sm:w-auto px-10 py-5 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-rose-900/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
                >
                  <Power className="w-5 h-5" />
                  <span>{loadingAction === 'OFF' ? 'TURNING OFF...' : 'TURN OFF NOW'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Sleek Sidebar (<aside>) from Sleek Interface design */}
        <aside className="w-full lg:w-80 space-y-6 shrink-0">
          {/* Device Info Card */}
          <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-500 text-xs uppercase tracking-widest font-bold">Device Info</h3>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Label</span>
                <span className="text-sm font-medium text-slate-100">Living Room A1</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Signal</span>
                <span className="text-sm font-medium text-blue-400 flex items-center gap-1">
                  <Wifi className="w-3.5 h-3.5" /> -48 dBm
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Uptime</span>
                <span className="text-sm font-medium font-mono text-slate-200">
                  {isLightOn ? 'Active' : 'Standby'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Voltage</span>
                <span className="text-sm font-medium text-slate-200">230V AC</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Power Draw</span>
                <span className="text-sm font-medium text-slate-200 font-mono">
                  {isLightOn ? `${lightState.powerWatts} W` : '0.2 W (idle)'}
                </span>
              </div>
            </div>
          </div>

          {/* Session Activity Card */}
          <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 shadow-lg">
            <h3 className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-4">Session Activity</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className={`w-1 rounded-full h-8 ${isLightOn ? 'bg-green-500' : 'bg-slate-700'}`} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">
                    {isLightOn ? 'Switched ON' : 'Standby Mode'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {isLightOn ? 'Active • Free tier' : 'Ready to turn ON'}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <div className={`w-1 rounded-full h-8 ${isOffUnlocked ? 'bg-green-500' : 'bg-slate-700'}`} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-200">Payment Status</span>
                  <span className="text-xs text-slate-500">
                    {isOffUnlocked ? '₹50 Verified • Unlocked' : '₹50 Required for OFF'}
                  </span>
                </div>
              </div>
            </div>

            {/* Quick action buttons */}
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex gap-2">
              <button
                onClick={() => setIsIotDrawerOpen(true)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-blue-400 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>IoT Bridge</span>
              </button>
              <button
                onClick={() => setIsLogsModalOpen(true)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Audit Logs</span>
              </button>
            </div>
          </div>
        </aside>
      </main>

      {/* Payment Modal (Sleek Theme Styled) */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onPaymentSuccess={handlePaymentSuccess}
        activeOrder={activeOrder}
        onCreateNewOrder={async () => {
          try {
            const res = await fetch('/api/payment/create', { method: 'POST' });
            const data = await res.json();
            if (data.success && data.order) {
              setActiveOrder(data.order);
              return data.order;
            }
          } catch {
            // catch
          }
          return null;
        }}
      />

      {/* IoT Integration Drawer */}
      <IotHardwareDrawer
        isOpen={isIotDrawerOpen}
        onClose={() => setIsIotDrawerOpen(false)}
        isLightOn={isLightOn}
      />

      {/* Activity Logs Modal */}
      <ActivityLogsModal
        isOpen={isLogsModalOpen}
        onClose={() => setIsLogsModalOpen(false)}
      />
    </div>
  );
}
