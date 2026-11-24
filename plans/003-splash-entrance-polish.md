# Plan 003: Refine the splash entrance and logo breathing loop

## Context

`ebike-mobile/src/screens/SplashScreen.tsx` currently combines a 900 ms opacity fade, a spring from scale `0.85` to `1`, and an infinite logo pulse from `1` to `1.04` and back every 2 seconds. The app also holds the splash for 2200 ms in `App.tsx`. The pulse is continuous even when the user is waiting for session restoration, and the combined scale can make the logo feel like it is breathing while it is also settling.

## Goal

Make the first impression calm and intentional while avoiding unnecessary continuous motion.

## Files

- `C:\Users\DELL\Downloads\Ebike\ebike-mobile\src\screens\SplashScreen.tsx`
- `C:\Users\DELL\Downloads\Ebike\ebike-mobile\App.tsx`

## Implementation

1. Replace the combined spring and pulse scale with a single entrance sequence: opacity `0 → 1` over `220 ms`, then scale `0.96 → 1` over `260 ms`, both using `Easing.out(Easing.cubic)` and native-driver transforms/opacity.
2. Remove the infinite pulse loop. A static logo after entrance is clearer during session restoration and avoids spending frames on a non-interactive element.
3. Keep the splash visible until both the minimum branded display time and session restoration complete. Preserve the current `2200 ms` minimum only if product requires it; otherwise use a maximum `1200 ms` branded hold so returning riders reach the app sooner.
4. Add reduced-motion handling. If reduced motion is enabled, render opacity `1` and scale `1` immediately and skip the entrance sequence.
5. Ensure the effect cleanup stops all animation handles. Do not introduce a timer that can call state updates after unmount.

## Verification

- Cold launch, returning session, signed-out launch, and slow backend session restoration.
- Capture the first 2 seconds on iOS and Android at normal speed and 0.25x speed; there should be one settle and no bounce.
- Enable reduced motion and confirm the logo is immediately stable.
- Confirm the splash never blocks the rider indefinitely when session restoration fails.
- Run the mobile TypeScript check and verify startup on a physical iPhone and Android device.
