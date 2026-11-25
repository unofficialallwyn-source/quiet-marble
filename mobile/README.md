# Quiet Marble mobile app

The iOS and Android app, built with Expo (SDK 58), React Native and TypeScript.
It shares game logic with the website through `../shared` and uses the same
leaderboard API (`/api/game`) with app tokens instead of cookies.

Bundle ID / package: `com.quietmarblegames.quietmarble` (permanent once published).

## Layout

| Path | What it is |
| --- | --- |
| `src/app/` | Screens (Expo Router: each file is a route) |
| `src/components/ui.tsx` | Shared buttons, cards, text styles |
| `src/theme/colors.ts` | Light/dark colours matching the website |
| `src/lib/settings.tsx` | Sound on/off and appearance, saved on the device |
| `src/lib/sounds.tsx` | Game sounds (same CC0 samples as the website) |
| `src/lib/storage.ts` | Device storage; the leaderboard token goes in secure storage |
| `src/lib/games.ts` | The list of games and their rules |
| `assets/sounds/` | Sound files, credits and licences |
| `metro.config.js` | Lets the app import `../shared` |

## Checks

From this folder, with Node 22:

```bash
npm ci
```

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

CI runs these plus a bundle of both platforms on every push and pull request.

## Trying it on your phone

The quickest way, before any store builds, uses the free **Expo Go** app:

1. Install Expo Go from the App Store or Google Play.
2. On your computer, install Node.js 22, then in this folder run `npm ci` and
   `npx expo start --tunnel`.
3. Scan the QR code it shows: with the Camera app on iPhone, or from inside
   Expo Go on Android.

Real installable builds (Android APK, iOS TestFlight) are set up in a later
phase with Expo EAS, which builds iOS in the cloud, so no Mac is needed.

## Privacy notes for later store forms

- No microphone, background audio, camera, location, contacts or file access.
  Android permissions are limited to internet, vibration and audio settings
  (none show a prompt); the rest are removed in `app.json`.
- Game sounds follow the phone's silent switch and never pause other audio.
- Settings, nickname and personal results stay on the device. The only
  identifier is the anonymous leaderboard token, kept in secure storage.
