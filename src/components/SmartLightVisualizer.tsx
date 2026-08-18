import React from 'react';
import { motion } from 'motion/react';
import { Lock, Unlock, Zap, Clock, ShieldAlert } from 'lucide-react';
import { LightStatus, LockState } from '../types';

interface SmartLightVisualizerProps {
  status: LightStatus;
  lockState: LockState;
  turnedOnAt: number | null;
  brightness: number;
  colorTemperature: string;
  powerWatts: number;
  onPayClick?: () => void;
  isLockedShaking?: boolean;
  onLockedAttempt?: () => void;
}

export const SmartLightVisualizer: React.FC<SmartLightVisualizerProps> = ({
  status,
  lockState,
  turnedOnAt,
  brightness,
  powerWatts,
  onPayClick,
  isLockedShaking,
  onLockedAttempt,
}) => {
  const isLightOn = status === 'ON';
  const isLocked = isLightOn && lockState === 'LOCKED';
  const isUnlocked = isLightOn && lockState === 'UNLOCKED';

  // Format active time
  const [elapsedSec, setElapsedSec] = React.useState(0);

  React.useEffect(() => {
    if (!turnedOnAt || !isLightOn) {
      setElapsedSec(0);
      return;
    }
    const update = () => {
      setElapsedSec(Math.floor((Date.now() - turnedOnAt) / 1000));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [turnedOnAt, isLightOn]);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOrbClick = () => {
    if (isLocked) {
      if (onLockedAttempt) onLockedAttempt();
      if (onPayClick) onPayClick();
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-center p-4 sm:p-6 w-full">
      {/* Background Volumetric Ambient Radial Glow from Sleek theme */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-700"
        style={{
          background: isLightOn
            ? 'radial-gradient(circle at 50% 40%, rgba(251, 191, 36, 0.45) 0%, rgba(245, 158, 11, 0.25) 40%, transparent 80%)'
            : 'radial-gradient(circle at 50% 40%, rgba(51, 65, 85, 0.15), transparent 70%)',
        }}
      />

      {/* Main Fixture / Glowing Orb Stack */}
      <motion.div
        animate={
          isLockedShaking
            ? {
                x: [0, -10, 10, -8, 8, -4, 4, 0],
                rotate: [0, -1.5, 1.5, -1, 1, 0],
                transition: { duration: 0.45, ease: 'easeInOut' },
              }
            : {}
        }
        className="relative z-10 mb-6 sm:mb-8 cursor-pointer"
        onClick={handleOrbClick}
      >
        {/* Outer Halo */}
        <motion.div
          animate={{
            scale: isLightOn ? [1, 1.05, 1] : 0.96,
            boxShadow: isLightOn
              ? '0 0 100px rgba(251, 191, 36, 0.9), 0 0 40px rgba(255, 255, 255, 0.8)'
              : '0 0 0px rgba(0,0,0,0)',
          }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          className={`w-52 h-52 sm:w-60 sm:h-60 rounded-full flex items-center justify-center transition-all duration-700 border ${
            isLightOn
              ? 'bg-amber-400/40 border-amber-300 shadow-2xl'
              : 'bg-slate-800/30 border-slate-800'
          }`}
        >
          {/* Inner Glowing Center Core */}
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full flex items-center justify-center transition-all duration-500 ${
              isLightOn
                ? 'bg-gradient-to-tr from-amber-300 via-amber-100 to-white shadow-[0_0_70px_rgba(255,255,255,1)] text-amber-900 border-4 border-white'
                : 'bg-slate-800 shadow-inner text-slate-500 border border-slate-700/50'
            }`}
          >
            {isLightOn ? (
              <svg
                className="w-16 h-16 sm:w-20 sm:h-20 text-amber-700 drop-shadow-lg animate-pulse"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18h6m-3-13a6 6 0 00-6 6c0 3 2.5 5 2.5 8h7c0-3 2.5-5 2.5-8a6 6 0 00-6-6z" />
              </svg>
            ) : (
              <svg
                className="w-16 h-16 sm:w-20 sm:h-20 text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18h6m-3-13a6 6 0 00-6 6c0 3 2.5 5 2.5 8h7c0-3 2.5-5 2.5-8a6 6 0 00-6-6z" />
                <line x1="2" y1="2" x2="22" y2="22" />
              </svg>
            )}
          </div>
        </motion.div>

        {/* Lock Overlay Corner Badge (Matching Sleek Interface theme) */}
        {isLightOn && (
          <div
            onClick={isLocked ? onPayClick : undefined}
            title={isLocked ? 'Pay ₹1 to unlock OFF' : 'Payment verified'}
            className={`absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-slate-950 border border-slate-800 p-2.5 rounded-2xl shadow-xl flex items-center gap-1.5 transition-transform ${
              isLocked ? 'cursor-pointer hover:scale-110 active:scale-95' : ''
            }`}
          >
            {isLocked ? (
              <svg
                className="w-5 h-5 text-amber-500 animate-pulse"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M18 10V7a6 6 0 10-12 0v3H5a2 2 0 00-2 2v8a2 2 0 002 2h14a2 2 0 002-2v-8a2 2 0 00-2-2h-1zm-6 9a2 2 0 110-4 2 2 0 010 4zm4-9H8V7a4 4 0 118 0v3z" />
              </svg>
            ) : (
              <Unlock className="w-5 h-5 text-green-400" />
            )}
          </div>
        )}
      </motion.div>

      {/* Main Status Text Hierarchy */}
      <div className="text-center space-y-1.5">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-50">
          {isLightOn ? 'LIGHT IS ON' : 'LIGHT IS OFF'}
        </h2>
        <p className="text-slate-400 font-medium text-sm">
          Device Status:{' '}
          <span
            className={`font-semibold ${
              !isLightOn
                ? 'text-slate-500'
                : isLocked
                ? 'text-green-500'
                : 'text-emerald-400'
            }`}
          >
            {!isLightOn ? 'STANDBY' : isLocked ? 'LOCKED' : 'UNLOCKED'}
          </span>
        </p>

        {/* Cloud IoT telemetry text */}
        <div className="flex items-center justify-center gap-2 text-slate-500 text-xs mt-3">
          <span>Controlled via Cloud API v2.4.1</span>
          {isLightOn && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-400 font-mono">
                <Clock className="w-3 h-3" />
                {formatTimer(elapsedSec)}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-400 font-mono">
                <Zap className="w-3 h-3 text-amber-400" />
                {powerWatts}W
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
