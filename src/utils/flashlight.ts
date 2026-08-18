/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Mobile Physical Back Hardware LED Torch Controller
// Directly commands the phone's physical rear LED flashlight via MediaStream / ImageCapture Torch API.

class FlashlightController {
  private mediaStream: MediaStream | null = null;
  private videoTrack: MediaStreamTrack | null = null;
  private hiddenVideo: HTMLVideoElement | null = null;
  private wakeLockSentinel: any = null;

  /**
   * Turns on the phone's physical back LED flashlight.
   */
  public async turnOn(): Promise<{
    success: boolean;
    mode: 'HARDWARE' | 'SCREEN';
    message: string;
  }> {
    // 1. Acquire screen wake lock so display does not sleep
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      } catch (e) {
        console.warn('WakeLock request error:', e);
      }
    }

    // If already turned on, return current status
    if (this.videoTrack && this.videoTrack.readyState === 'live') {
      try {
        await this.videoTrack.applyConstraints({
          advanced: [{ torch: true } as any],
        });
        return {
          success: true,
          mode: 'HARDWARE',
          message: 'Phone Back LED Flashlight is ON',
        };
      } catch {
        // continue to attempt fresh stream
      }
    }

    // 2. Activate physical back camera LED torch
    if (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function'
    ) {
      try {
        let stream: MediaStream | null = null;

        // Try candidate constraints in order of specificity for rear camera
        const constraintCandidates: MediaStreamConstraints[] = [
          {
            video: {
              facingMode: { exact: 'environment' },
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
          },
          {
            video: {
              facingMode: { ideal: 'environment' },
            },
          },
          {
            video: {
              facingMode: 'environment',
            },
          },
        ];

        for (const constraints of constraintCandidates) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (stream) break;
          } catch {
            // try next candidate
          }
        }

        // If generic facingMode failed, attempt device enumeration for back cameras
        if (!stream && typeof navigator.mediaDevices.enumerateDevices === 'function') {
          try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter((d) => d.kind === 'videoinput');
            const backCamera = videoDevices.find(
              (d) =>
                d.label.toLowerCase().includes('back') ||
                d.label.toLowerCase().includes('rear') ||
                d.label.toLowerCase().includes('environment')
            ) || videoDevices[videoDevices.length - 1]; // rear camera is typically last in list

            if (backCamera && backCamera.deviceId) {
              stream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: backCamera.deviceId } },
              });
            }
          } catch {
            // ignore
          }
        }

        // Fallback to any video input if specific rear constraints failed
        if (!stream) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          } catch {
            // camera permission denied or unavailable
          }
        }

        if (stream) {
          const track = stream.getVideoTracks()[0];
          if (track) {
            this.mediaStream = stream;
            this.videoTrack = track;

            // Many mobile browsers (Android Chrome/Samsung Internet) require a playing video element
            // to activate the camera hardware pipeline and allow the LED torch to ignite.
            if (typeof document !== 'undefined') {
              if (!this.hiddenVideo) {
                const videoEl = document.createElement('video');
                videoEl.setAttribute('playsinline', 'true');
                videoEl.setAttribute('autoplay', 'true');
                videoEl.muted = true;
                videoEl.style.position = 'fixed';
                videoEl.style.top = '-9999px';
                videoEl.style.left = '-9999px';
                videoEl.style.width = '1px';
                videoEl.style.height = '1px';
                videoEl.style.opacity = '0';
                videoEl.style.pointerEvents = 'none';
                document.body.appendChild(videoEl);
                this.hiddenVideo = videoEl;
              }
              this.hiddenVideo.srcObject = stream;
              try {
                await this.hiddenVideo.play();
              } catch {
                // Autoplay may be restricted; ignore
              }
            }

            // Apply the hardware LED Torch constraint
            let torchApplied = false;

            // Check track capabilities
            const capabilities: any =
              typeof track.getCapabilities === 'function' ? track.getCapabilities() : {};

            if (capabilities.torch || 'torch' in capabilities) {
              try {
                await track.applyConstraints({
                  advanced: [{ torch: true } as any],
                });
                torchApplied = true;
              } catch (err) {
                console.warn('Error applying torch constraint with capability detected:', err);
              }
            }

            // If capability wasn't reported or failed, try direct applyConstraints
            if (!torchApplied) {
              try {
                await track.applyConstraints({
                  advanced: [{ torch: true } as any],
                });
                torchApplied = true;
              } catch (err) {
                console.warn('Direct torch constraint application failed:', err);
              }
            }

            // ImageCapture fallback if available
            if (!torchApplied && typeof window !== 'undefined' && 'ImageCapture' in window) {
              try {
                const imageCapture = new (window as any).ImageCapture(track);
                if (imageCapture) {
                  await track.applyConstraints({
                    advanced: [{ torch: true } as any],
                  });
                  torchApplied = true;
                }
              } catch {
                // ignore
              }
            }

            if (torchApplied) {
              return {
                success: true,
                mode: 'HARDWARE',
                message: 'Phone Back LED Flashlight is ON',
              };
            }
          }
        }
      } catch (err) {
        console.warn('Could not turn on phone back flashlight:', err);
      }
    }

    return {
      success: true,
      mode: 'SCREEN',
      message: 'Screen illumination & wake lock active',
    };
  }

  /**
   * Turns off the phone's physical back LED flashlight and releases hardware.
   */
  public async turnOff(): Promise<void> {
    // 1. Turn off physical hardware LED torch
    if (this.videoTrack) {
      try {
        await this.videoTrack.applyConstraints({
          advanced: [{ torch: false } as any],
        });
      } catch {
        // ignore
      }
      try {
        this.videoTrack.stop();
      } catch {
        // ignore
      }
      this.videoTrack = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore
      }
      this.mediaStream = null;
    }

    if (this.hiddenVideo) {
      try {
        this.hiddenVideo.pause();
        this.hiddenVideo.srcObject = null;
        if (this.hiddenVideo.parentNode) {
          this.hiddenVideo.parentNode.removeChild(this.hiddenVideo);
        }
      } catch {
        // ignore
      }
      this.hiddenVideo = null;
    }

    // 2. Release wake lock
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch {
        // ignore
      }
      this.wakeLockSentinel = null;
    }
  }

  public isHardwareTorchOn(): boolean {
    return this.videoTrack !== null && this.videoTrack.readyState === 'live';
  }

  public isOn(): boolean {
    return this.wakeLockSentinel !== null || this.videoTrack !== null;
  }
}

export const flashlight = new FlashlightController();


