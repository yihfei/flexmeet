// A short haptic tick, best effort. Used once when a hold turns into a drag, so the finger
// feels the moment selection starts.
//
// - Android (Chrome, Firefox): the Vibration API.
// - iPhone: Safari has no Vibration API, but toggling a switch-style checkbox plays the system
//   haptic on iOS 18 and later, so a hidden one is toggled instead.
// - Anywhere else it does nothing.

let iosSwitch: HTMLLabelElement | null = null;

export function hapticTick() {
  if (typeof navigator.vibrate === 'function') {
    navigator.vibrate(10);
    return;
  }
  if (!iosSwitch) {
    iosSwitch = document.createElement('label');
    iosSwitch.setAttribute('aria-hidden', 'true');
    iosSwitch.style.cssText =
      'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.tabIndex = -1;
    input.setAttribute('switch', '');
    iosSwitch.append(input);
    document.body.append(iosSwitch);
  }
  iosSwitch.click();
}
