import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

const native = Capacitor.isNativePlatform();
let enabled = true;

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
}

function vibrate(pattern: number | number[]): void {
  if (enabled && 'vibrate' in navigator) navigator.vibrate(pattern);
}

export const haptics = {
  tap(): void {
    if (!enabled) return;
    if (native) void Haptics.impact({ style: ImpactStyle.Light });
    else vibrate(8);
  },
  tick(): void {
    if (!enabled) return;
    if (native) void Haptics.impact({ style: ImpactStyle.Light });
  },
  heavy(): void {
    if (!enabled) return;
    if (native) void Haptics.impact({ style: ImpactStyle.Heavy });
    else vibrate(30);
  },
  success(): void {
    if (!enabled) return;
    if (native) void Haptics.notification({ type: NotificationType.Success });
    else vibrate([20, 40, 20]);
  },
  error(): void {
    if (!enabled) return;
    if (native) void Haptics.notification({ type: NotificationType.Error });
    else vibrate([60, 50, 60]);
  },
};
