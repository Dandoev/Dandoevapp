# Plan 001: Make bottom navigation transitions feel intentional

## Context

DandoEv Ride uses `ebike-mobile/src/components/BottomNavBar.tsx` for the highest-frequency navigation surface. The active tab currently changes by replacing `backgroundColor` and text/icon colors immediately. There is no motion on selection, so the active pill jumps between tabs and the content below changes without a visual relationship.

## Goal

Add a short, interruptible active-state transition that communicates the selected destination without delaying navigation.

## Files

- `C:\Users\DELL\Downloads\Ebike\ebike-mobile\src\components\BottomNavBar.tsx`
- If a shared helper is created: `C:\Users\DELL\Downloads\Ebike\ebike-mobile\src\motion\motion.ts`

## Implementation

1. Keep `onSelectTab` synchronous and preserve the existing tab order, labels, accessibility role, and selected state.
2. Add an `Animated.Value` per tab for active progress. When `currentTab` changes, animate the selected tab to `1` and all other tabs to `0` with `Animated.timing`, `duration: 180`, and `useNativeDriver: false` because the active background color and text color need interpolation. Stop or replace a running animation when a second tab is selected.
3. Interpolate the active pill background from `#0A154F` to `#2E3192`. Interpolate the icon and label colors from `#B6C6DC` to `#FFFFFF`. Preserve the current border radius and layout so the animation does not move surrounding tabs.
4. Add a subtle selected icon scale from `1` to `1.04` using a separate native-driver transform animation. Keep the scale at or below `1.04`; this is a state cue, not a bounce.
5. Respect reduced motion. On iOS use `AccessibilityInfo.isReduceMotionEnabled`; on Android use the corresponding accessibility setting exposed by React Native. When enabled, set values immediately and skip timing animations.
6. Do not animate the entire tab bar, use layout animations, or add a delay before rendering the destination screen.

## Verification

- Tap tabs rapidly in sequence and confirm the active state always ends on the last tapped tab.
- Confirm the pill and colors transition in under 200 ms and never overshoot.
- Confirm VoiceOver/TalkBack still reports one selected tab.
- Enable reduced motion on an iOS simulator and Android emulator; selection should update immediately.
- Run the mobile TypeScript check and open the app on a real device to confirm no frame drop while swiping or tapping.
