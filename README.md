# QueueQuest

A crowd-sourced busyness tracker for Kingston University's Penryn Road campus. Students search for places nearby and report live crowd levels — Empty, Quiet, Busy, or Chaos.

Built with Expo (React Native), Expo Router, Convex, and Better Auth.

---

## Prerequisites

- Node.js 18+
- A Convex account and project (for the backend)
- For iOS simulator: Xcode installed
- For Android emulator: Android Studio installed
- For physical device: the **Expo Go** app ([iOS](https://apps.apple.com/app/expo-go/id982107779) / [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

> **Version note:** The project is pinned to `react-native@0.83.1` to match the Expo Go SDK 55 native runtime. Do not upgrade React Native without also updating the Expo Go app.

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env.local` file in the project root:

```
CONVEX_DEPLOYMENT=<your-convex-deployment-slug>
EXPO_PUBLIC_CONVEX_URL=<your-convex-deployment-url>
EXPO_PUBLIC_CONVEX_SITE_URL=<your-convex-site-url>
```

note that you can skip this by just running `npx convex dev` in the next step, which will automatically create a `.env.local` file with the correct values.you need a convex account to do this.

You can find these values in the [Convex dashboard](https://dashboard.convex.dev) after creating a project.

### 3. Start the Convex backend

In a separate terminal, run:

```bash
npx convex dev
```

Keep this running while developing — it syncs your backend functions and regenerates types.

---

## Running the app

Start the Expo dev server:

```bash
npx expo start --clear
```

Then choose how to open it:

### iOS Simulator (Mac only)

Press `i` in the terminal after the server starts, or run:

```bash
npx expo start --ios
```

Requires Xcode and the iOS Simulator app installed.

### Android Emulator

Press `a` in the terminal, or run:

```bash
npx expo start --android
```

Requires Android Studio with a virtual device configured.

### Expo Go (physical device)

1. Install **Expo Go** on your phone:
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Make sure your phone and computer are on the **same Wi-Fi network**
3. Run `npx expo start --clear`
4. Scan the QR code shown in the terminal with:
   - **iOS**: the built-in Camera app
   - **Android**: the Expo Go app directly

> The app is pinned to Expo SDK 55 / React Native 0.83.1. Make sure your Expo Go app is **SDK 55** — check the version in the app's settings screen. Mismatched versions will show a "React Native version mismatch" error.

---

## Project structure

```
convex/          # Backend — Convex functions, schema, auth config
src/
  app/
    _layout.tsx          # Root layout: auth guard, theme, fonts
    (auth)/              # Onboarding, login, signup screens
    (app)/               # Main tab screens (home, map, profile)
      place/
        add.tsx          # Add a new place
        [id]/index.tsx   # Place detail: vibe reports, ratings, photos
        [id]/edit.tsx    # Edit a place (owner only)
  constants/theme.ts     # Design tokens: colors, spacing, typography
  contexts/              # Theme context (dark/light/system toggle)
  hooks/                 # useTheme, useColorScheme
  lib/auth-client.ts     # Better Auth client setup
```

---

## Troubleshooting

**"React Native version mismatch"**
Your Expo Go app's native runtime doesn't match the JS bundle. Make sure your Expo Go app is SDK 55. Alternatively, clear caches:
```bash
watchman watch-del-all && npx expo start --clear
```

**Convex LSP errors in `convex/*.ts`**
These are stale generated types and resolve automatically when `npx convex dev` is running. Ignore them in the editor.

**Metro bundler issues**
```bash
npx expo start --clear
```
