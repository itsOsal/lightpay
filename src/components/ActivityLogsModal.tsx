import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { X, Activity, ShieldAlert, CheckCircle2, Zap, Lock, RefreshCw } from 'lucide-react';
import { ActivityLog } from '../types';

interface ActivityLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogsModal: React.FC<ActivityLogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/logs');
      const data = await res.json();
      if (data.logs) setLogs(data.logs);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getLogBadge = (type: ActivityLog['type']) => {
    switch (type) {
      case 'LIGHT_ON':
        return {
          icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
          bg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
          label: 'LIGHT ON',
        };
      case 'LIGHT_OFF':
        return {
          icon: <Zap className="w-3.5 h-3.5 text-slate-400" />,
          bg: 'bg-slate-700/30 text-slate-300 border-slate-700',
          label: 'LIGHT OFF',
        };
      case 'LOCK_ENGAGED':
        return {
          icon: <Lock className="w-3.5 h-3.5 text-rose-400" />,
          bg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
          label: 'OFF LOCKED',
        };
      case 'PAYMENT_CREATED':
        return {
          icon: <Activity className="w-3.5 h-3.5 text-blue-400" />,
          bg: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
          label: 'ORDER CREATED',
        };
      case 'PAYMENT_VERIFIED':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
          bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
          label: 'PAYMENT VERIFIED',
        };
      case 'SECURITY_BLOCKED':
        return {
          icon: <ShieldAlert className="w-3.5 h-3.5 text-red-400" />,
          bg: 'bg-red-500/20 text-red-300 border-red-500/30',
          label: 'BLOCKED ATTEMPT',
        };
      default:
        return {
          icon: <Activity className="w-3.5 h-3.5 text-slate-400" />,
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          label: 'SYSTEM',
        };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 my-8"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">System & Security Audit Log</h3>
              <p className="text-xs text-slate-400">
                Server-side activity, security locks, and verified payments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Refresh logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">No activity recorded yet.</div>
          ) : (
            logs.map((log) => {
              const badge = getLogBadge(log.type);
              const dateStr = new Date(log.timestamp).toLocaleTimeString();
              return (
                <div
                  key={log.id}
                  className="p-3 bg-slate-800/50 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border shrink-0 mt-0.5 ${badge.bg}`}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                    <div>
                      <p className="text-xs font-medium text-slate-200">{log.message}</p>
                      {log.details && (
                        <p className="text-[11px] font-mono text-slate-400 mt-0.5">{log.details}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 shrink-0 self-end sm:self-center">
                    {dateStr}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};
