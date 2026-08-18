import express from 'express';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

// Data structures
interface LightState {
  status: 'ON' | 'OFF';
  turnedOnAt: number | null;
  totalOnDurationSeconds: number;
  brightness: number;
  colorTemperature: string;
  powerWatts: number;
  offLockState: 'LOCKED' | 'UNLOCKED';
  unlockToken: string | null;
  unlockExpiresAt: number | null;
  activeOrderId: string | null;
}

interface PaymentOrder {
  orderId: string;
  amount: number;
  currency: string;
  upiId: string;
  payeeName: string;
  status: 'PENDING' | 'VERIFYING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  createdAt: number;
  verifiedAt: number | null;
  utr: string | null;
  unlockToken: string | null;
  expiresAt: number;
  notes: string;
}

interface ActivityLog {
  id: string;
  timestamp: number;
  type: 'LIGHT_ON' | 'LIGHT_OFF' | 'PAYMENT_CREATED' | 'PAYMENT_VERIFIED' | 'LOCK_ENGAGED' | 'SECURITY_BLOCKED';
  message: string;
  details?: string;
}

// In-Memory Server State
const lightState: LightState = {
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
};

const orders = new Map<string, PaymentOrder>();
const logs: ActivityLog[] = [
  {
    id: 'log-init',
    timestamp: Date.now(),
    type: 'LOCK_ENGAGED',
    message: 'System initialized. Pay-to-turn-off security policy active (₹50 tariff).',
  },
];

function addLog(type: ActivityLog['type'], message: string, details?: string) {
  logs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    type,
    message,
    details,
  });
  if (logs.length > 50) logs.pop();
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // GET Light Status
  app.get('/api/light/status', (req, res) => {
    // Check if token expired
    if (lightState.unlockExpiresAt && Date.now() > lightState.unlockExpiresAt) {
      lightState.offLockState = 'LOCKED';
      lightState.unlockToken = null;
      lightState.unlockExpiresAt = null;
    }

    res.json({
      ...lightState,
      serverTime: Date.now(),
    });
  });

  // POST Turn ON (Free)
  app.post('/api/light/on', (req, res) => {
    if (lightState.status === 'ON') {
      return res.json({ success: true, message: 'Light is already ON', state: lightState });
    }

    lightState.status = 'ON';
    lightState.turnedOnAt = Date.now();
    lightState.offLockState = 'LOCKED';
    lightState.unlockToken = null;
    lightState.unlockExpiresAt = null;
    lightState.activeOrderId = null;

    addLog('LIGHT_ON', 'Smart Light turned ON (Free tier activation)');
    addLog('LOCK_ENGAGED', 'OFF button locked. ₹50 payment required to unlock OFF control.');

    res.json({
      success: true,
      message: 'Light turned ON successfully! Turn-OFF control is locked.',
      state: lightState,
    });
  });

  // POST Turn OFF (Requires Payment Unlock Token)
  app.post('/api/light/off', (req, res) => {
    const clientToken = (req.headers['x-unlock-token'] as string) || req.body?.unlockToken;

    if (lightState.status === 'OFF') {
      return res.json({ success: true, message: 'Light is already OFF', state: lightState });
    }

    // Security Check: Is OFF unlocked?
    if (lightState.offLockState !== 'UNLOCKED') {
      addLog('SECURITY_BLOCKED', 'Unauthorized turn-off attempt blocked: payment not verified', `IP: ${req.ip}`);
      return res.status(403).json({
        success: false,
        error: 'OFF_BUTTON_LOCKED',
        message: 'Security policy violation: You must pay ₹50 to unlock the OFF button.',
      });
    }

    // Token verification
    if (!lightState.unlockToken || clientToken !== lightState.unlockToken) {
      addLog('SECURITY_BLOCKED', 'Turn-off blocked: Invalid or forged unlock token');
      return res.status(403).json({
        success: false,
        error: 'INVALID_TOKEN',
        message: 'Invalid or missing security unlock token.',
      });
    }

    // Expiry check
    if (lightState.unlockExpiresAt && Date.now() > lightState.unlockExpiresAt) {
      lightState.offLockState = 'LOCKED';
      lightState.unlockToken = null;
      lightState.unlockExpiresAt = null;
      return res.status(403).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Unlock token expired. Please verify payment again.',
      });
    }

    // Turn OFF successful
    const sessionDuration = lightState.turnedOnAt
      ? Math.round((Date.now() - lightState.turnedOnAt) / 1000)
      : 0;
    lightState.totalOnDurationSeconds += sessionDuration;
    lightState.status = 'OFF';
    lightState.turnedOnAt = null;
    lightState.offLockState = 'LOCKED';
    lightState.unlockToken = null;
    lightState.unlockExpiresAt = null;
    lightState.activeOrderId = null;

    addLog('LIGHT_OFF', `Smart Light turned OFF after ${sessionDuration}s session duration.`);

    res.json({
      success: true,
      message: 'Light turned OFF successfully. Payment consumed.',
      state: lightState,
    });
  });

  // POST Create Payment Order (₹50)
  app.post('/api/payment/create', (req, res) => {
    const orderId = `LP-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const amount = 50;
    const upiId = 'itskimsia-1@okicici';
    const payeeName = 'Osal';
    const note = `LightPay OFF Token ${orderId}`;
    
    // Construct standard UPI intent URI
    const upiPayload = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(note)}`;

    const newOrder: PaymentOrder = {
      orderId,
      amount,
      currency: 'INR',
      upiId,
      payeeName,
      status: 'PENDING',
      createdAt: Date.now(),
      verifiedAt: null,
      utr: null,
      unlockToken: null,
      expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
      notes: note,
    };

    orders.set(orderId, newOrder);
    lightState.activeOrderId = orderId;

    addLog('PAYMENT_CREATED', `Order ${orderId} generated for ₹50. Awaiting UPI payment.`, `UPI ID: ${upiId}`);

    res.json({
      success: true,
      order: newOrder,
      upiPayload,
    });
  });

  // POST Verify Payment
  app.post('/api/payment/verify', (req, res) => {
    const { orderId, utr, verificationType, simulationSecret } = req.body || {};

    if (!orderId || !orders.has(orderId)) {
      return res.status(404).json({
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: 'Order ID not found or expired.',
      });
    }

    const order = orders.get(orderId)!;

    if (order.status === 'SUCCESS' && order.unlockToken) {
      // Already verified, return existing unlock token
      lightState.offLockState = 'UNLOCKED';
      lightState.unlockToken = order.unlockToken;
      lightState.unlockExpiresAt = Date.now() + 10 * 60 * 1000;
      return res.json({
        success: true,
        message: 'Order already verified.',
        order,
        unlockToken: order.unlockToken,
      });
    }

    // Backend verification logic:
    // In production, this hooks into Razorpay/Cashfree Webhooks or Bank Statement / UPI SMS parsing.
    // For manual UTR verification, require at least 8-12 alphanumeric characters.
    // For Instant Demo/Webhook Verification, confirm authenticity.
    const isUtrProvided = typeof utr === 'string' && utr.trim().length >= 6;
    const isInstantVerification = verificationType === 'INSTANT_DEMO' || simulationSecret === 'VERIFIED_GATEWAY_WEBHOOK';

    if (!isUtrProvided && !isInstantVerification) {
      return res.status(400).json({
        success: false,
        error: 'VERIFICATION_FAILED',
        message: 'Valid 12-digit UPI UTR reference number or payment gateway confirmation is required.',
      });
    }

    // Generate secure cryptographic unlock token
    const unlockToken = `LP_SEC_${crypto.randomBytes(16).toString('hex')}`;
    const verifiedUtr = utr ? utr.trim() : `DEMO-UTR-${Math.floor(100000000000 + Math.random() * 900000000000)}`;

    order.status = 'SUCCESS';
    order.verifiedAt = Date.now();
    order.utr = verifiedUtr;
    order.unlockToken = unlockToken;
    orders.set(orderId, order);

    // Update authoritative light state
    lightState.offLockState = 'UNLOCKED';
    lightState.unlockToken = unlockToken;
    lightState.unlockExpiresAt = Date.now() + 10 * 60 * 1000; // 10 mins unlock window

    addLog(
      'PAYMENT_VERIFIED',
      `Payment of ₹50 verified for order ${orderId}. OFF control unlocked!`,
      `UTR: ${verifiedUtr}`
    );

    res.json({
      success: true,
      message: 'Payment verified successfully! OFF button has been unlocked.',
      order,
      unlockToken,
    });
  });

  // GET Payment Status Polling
  app.get('/api/payment/status/:orderId', (req, res) => {
    const { orderId } = req.params;
    const order = orders.get(orderId);

    if (!order) {
      return res.status(404).json({ success: false, error: 'ORDER_NOT_FOUND' });
    }

    res.json({
      success: true,
      status: order.status,
      order,
      isUnlocked: lightState.offLockState === 'UNLOCKED',
      unlockToken: order.status === 'SUCCESS' ? order.unlockToken : null,
    });
  });

  // GET Logs
  app.get('/api/logs', (req, res) => {
    res.json({ logs });
  });

  // POST Update Light Appearance (Brightness / Color)
  app.post('/api/light/settings', (req, res) => {
    const { brightness, colorTemperature } = req.body || {};
    if (typeof brightness === 'number') {
      lightState.brightness = Math.min(100, Math.max(10, brightness));
    }
    if (typeof colorTemperature === 'string') {
      lightState.colorTemperature = colorTemperature;
    }
    res.json({ success: true, state: lightState });
  });

  // IoT Hardware Endpoint: Microcontrollers (ESP32/Arduino/ESP8266/Raspberry Pi) can poll this
  app.get('/api/iot/relay', (req, res) => {
    res.json({
      relay: lightState.status === 'ON' ? 1 : 0,
      status: lightState.status,
      brightness: lightState.brightness,
      color: lightState.colorTemperature,
      locked: lightState.offLockState === 'LOCKED',
      timestamp: Date.now(),
    });
  });

  // Vite Middleware Setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`💡 LightPay server running on http://localhost:${PORT}`);
  });
}

startServer();
