export type LightStatus = 'ON' | 'OFF';
export type LockState = 'LOCKED' | 'UNLOCKED';
export type PaymentStatus = 'PENDING' | 'VERIFYING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';

export interface LightState {
  status: LightStatus;
  turnedOnAt: number | null;
  totalOnDurationSeconds: number;
  brightness: number;
  colorTemperature: string;
  powerWatts: number;
  offLockState: LockState;
  unlockToken: string | null;
  unlockExpiresAt: number | null;
  activeOrderId: string | null;
}

export interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  upiId: string;
  payeeName: string;
  status: PaymentStatus;
  createdAt: number;
  verifiedAt: number | null;
  utr: string | null;
  unlockToken: string | null;
  expiresAt: number;
  notes: string;
}

export interface ActivityLog {
  id: string;
  timestamp: number;
  type: 'LIGHT_ON' | 'LIGHT_OFF' | 'PAYMENT_CREATED' | 'PAYMENT_VERIFIED' | 'LOCK_ENGAGED' | 'SECURITY_BLOCKED';
  message: string;
  details?: string;
}

export interface IotDeviceConfig {
  deviceId: string;
  model: string;
  relayPin: number;
  pollIntervalMs: number;
  endpointUrl: string;
}
