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
| `src/games/` | Game logic hooks and screens (Marble Solitaire, Lights Out, Sudoku) |
| `src/components/boards.tsx` | Marble boards (English, Triangle, Mini Diamond) and the Lights Out grid |
| `src/components/game-parts.tsx` | Nickname field, stats, leaderboard with Report, share, finish banner |
| `src/lib/api.ts` | Leaderboard API client (app token, offline detection) |
| `src/lib/player.ts` | Nickname, personal results and personal best on the phone |
| `assets/sounds/` | Sound files, credits and licences |
| `metro.config.js` | Lets the app import `../shared` |

## How play works

The games follow the website's rules exactly, using the same `shared/` code:

- **Ranked rounds:** the first move (or Start game) asks the server for a ranked
  round. Finishing and tapping **Save to leaderboard** sends the moves, which the
  server replays to verify. Hints or undo turn a round into practice.
- **Offline:** if the server can't be reached, the round is a practice round
  (marked *Offline practice*). It plays normally and is saved on the phone only.
  Sudoku does the same with a practice streak generated on the phone.
- **Leaderboards** are the website's top-100 boards. Other players' custom
  names have a ⋯ button to report them; anonymous labels and your own name don't.
- **Nicknames** are checked on the phone with the same rules as the server, and
  remembered on the phone. Personal results (last 100) stay on the phone.
- **Sudoku** streaks are saved on the phone and resumed when the app reopens.
- **Hints** on the English marble board search a smaller number of positions than
  the website (phones have no background worker here), so very unusual positions
  may report "No winning route found within the hint search limit".

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
