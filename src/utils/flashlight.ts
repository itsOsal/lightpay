/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Utility to control the mobile device's physical camera LED flashlight / torch
// and provide screen-torch fallback when hardware torch is unavailable (e.g. iOS Safari).

class FlashlightController {
  private mediaStream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private isHardwareTorchOn = false;
  private isSupported = false;

  constructor() {
    this.checkSupport();
  }

  private checkSupport(): boolean {
    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    ) {
      this.isSupported = true;
      return true;
    }
    this.isSupported = false;
    return false;
  }

  /**
   * Attempts multiple methods to activate the mobile rear camera LED torch.
   */
  public async turnOn(): Promise<{ success: boolean; mode: 'HARDWARE' | 'SCREEN'; message: string }> {
    if (!this.checkSupport()) {
      return {
        success: true,
        mode: 'SCREEN',
        message: 'Camera API unavailable in this browser. Screen torch activated.',
      };
    }

    // Stop any stale track first
    await this.turnOff();

    // Strategy 1: Request environment/rear camera with ideal facingMode
    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
    } catch (err1) {
      console.warn('Strategy 1 failed, trying fallback video constraints:', err1);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
      } catch (err2) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch (err3) {
          console.warn('All getUserMedia requests failed:', err3);
          return {
            success: true,
            mode: 'SCREEN',
            message: 'Camera permission denied or unavailable. Screen torch active.',
          };
        }
      }
    }

    if (!stream) {
      return {
        success: true,
        mode: 'SCREEN',
        message: 'No video stream available. Screen torch active.',
      };
    }

    this.mediaStream = stream;
    const track = stream.getVideoTracks()[0];
    this.videoTrack = track;

    if (!track) {
      return {
        success: true,
        mode: 'SCREEN',
        message: 'No video track found. Screen torch active.',
      };
    }

    // Wait 50ms for hardware sensor initialization on mobile devices
    await new Promise((resolve) => setTimeout(resolve, 60));

    // Try to engage the hardware torch
    try {
      // 1. Direct track constraint
      await (track as any).applyConstraints({
        advanced: [{ torch: true }],
      });
      this.isHardwareTorchOn = true;
      return {
        success: true,
        mode: 'HARDWARE',
        message: 'Mobile LED Flashlight turned ON!',
      };
    } catch (torchErr) {
      console.warn('Direct torch constraint attempt 1 error:', torchErr);
      
      // 2. Check capabilities if supported
      try {
        const capabilities = (track.getCapabilities ? track.getCapabilities() : {}) as any;
        if (capabilities && capabilities.torch) {
          await (track as any).applyConstraints({
            advanced: [{ torch: true }],
          });
          this.isHardwareTorchOn = true;
          return {
            success: true,
            mode: 'HARDWARE',
            message: 'Mobile LED Flashlight turned ON!',
          };
        }
      } catch (e) {
        console.warn('Capabilities check failed:', e);
      }

      // 3. Fallback for iOS Safari (Apple restricts LED torch in WebRTC) or devices without flash
      return {
        success: true,
        mode: 'SCREEN',
        message: 'Screen Torch mode active (iOS / non-flash devices).',
      };
    }
  }

  public async turnOff(): Promise<void> {
    try {
      if (this.videoTrack) {
        try {
          await (this.videoTrack as any).applyConstraints({
            advanced: [{ torch: false }],
          });
        } catch {
          // Ignore
        }
        this.videoTrack.stop();
        this.videoTrack = null;
      }

      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((t) => t.stop());
        this.mediaStream = null;
      }
    } catch (err) {
      console.error('Error turning off flashlight:', err);
    } finally {
      this.isHardwareTorchOn = false;
    }
  }

  public isOn(): boolean {
    return this.isHardwareTorchOn;
  }
}

export const flashlight = new FlashlightController();

