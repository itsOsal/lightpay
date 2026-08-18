/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Mobile Screen Flashlight & Wake-Lock Controller
// No webcam or camera access required — turns the mobile display into a bright torch
// and prevents the phone screen from sleeping while the light is active.

class FlashlightController {
  private wakeLockSentinel: any = null;

  public async turnOn(): Promise<{ success: boolean; mode: 'SCREEN'; message: string }> {
    // Acquire screen wake lock so the phone doesn't sleep while light is active
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      } catch (e) {
        console.warn('Wake Lock request error:', e);
      }
    }

    return {
      success: true,
      mode: 'SCREEN',
      message: 'Mobile Flashlight active (Screen Torch)',
    };
  }

  public async turnOff(): Promise<void> {
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch {
        // ignore
      }
      this.wakeLockSentinel = null;
    }
  }

  public isOn(): boolean {
    return this.wakeLockSentinel !== null;
  }
}

export const flashlight = new FlashlightController();


