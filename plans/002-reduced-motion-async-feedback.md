# Plan 002: Add reduced-motion-safe feedback for async rider states

## Context

Async UI currently relies mainly on `ActivityIndicator` and alert dialogs. Important rider actions such as sign-in, wallet funding, notifications refresh, and bike fault submission change state abruptly. The app has no shared reduced-motion policy, so future animated feedback can become inconsistent.

## Goal

Create a small motion policy and apply it to high-value async states without hiding errors or slowing completion.

## Files

- `C:\Users\DELL\Downloads\Ebike\ebike-mobile\src\lib\api.ts`
- `C:\Users\DELL\Downloads\Ebike\ebike-mobile\src\screens\SignInScreen.tsx`
- `C:\Users\DELL\Downloads\Ebike\ebike-mobile\src\screens\FundWalletScreen.tsx`
- `C:\Users\DELL\Downloads\Ebike\ebike-mobile\src\screens\ReportFaultScreen.tsx`
- `C:\Users\DELL\Downloads\Ebike\ebike-mobile\src\screens\NotificationsScreen.tsx`
- Suggested helper: `C:\Users\DELL\Downloads\Ebike\ebike-mobile\src\motion\motion.ts`

## Implementation

1. Add a shared `useReducedMotion` hook that subscribes to React Native `AccessibilityInfo` and cleans up the listener. Default to reduced motion until the first platform value is available so startup never forces motion on a user who has requested less motion.
2. Define only these interaction values: enter/feedback opacity `0 → 1` over `160 ms`, small confirmation scale `0.98 → 1` over `180 ms`, and error/status fade `160 ms`. Use `Easing.out(Easing.cubic)` for the timing curves. For reduced motion, render the final state immediately.
3. Apply the policy to inline success and error feedback in the listed screens. Keep the existing `ActivityIndicator` while a request is active; animate only the appearance of the result, not the spinner itself.
4. Keep alerts for actions that require explicit acknowledgement. Do not replace authentication, payment, or fault-report errors with animation-only feedback.
5. Make all async result animations interruptible: a new request or unmount must stop the animation and release listeners.
6. Add `accessibilityLiveRegion="polite"` to non-critical status text where supported, and use assertive announcement only for payment failure or a safety-critical bike fault.

## Verification

- Test sign-in failure, wallet funding failure, successful fault submission, and notification refresh.
- Trigger a second request before the first feedback animation finishes; the UI must show only the latest state.
- Enable reduced motion on iOS and Android and confirm no visible fade or scale occurs.
- Confirm payment and fault errors remain readable with animations disabled.
- Run the mobile TypeScript check and exercise these flows on a device rather than only web.
