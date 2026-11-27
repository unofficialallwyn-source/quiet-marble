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
| `src/theme/colors.ts` | Colour themes (Sage, Mint, Lavender, Dusky pink, Sky blue), each light and dark |
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

## Ads (Google AdMob)

One banner, **below the game area only** (after the board, controls and Share
button), on the Marble, Lights Out and Sudoku screens. No ads on the home or
settings screens, and no full-screen ads. `src/lib/ads.tsx` sets this up:

- Every request is tagged **child-directed** and **under the age of consent**,
  with ad content capped at **G**, and asks for **non-personalised** ads only.
- No App Tracking Transparency prompt on iOS; the Android advertising-ID
  permission is removed in `app.json`.
- Google's consent message (UMP) runs before ads load where the law requires
  it; **Settings → Ad privacy choices** appears when Google says it's needed.
- If consent isn't given, or no ad loads, nothing is shown and no space is left.
- Ads are off in Expo Go and on the web (the native module isn't there), so
  ads only appear in real builds (Phase 5).

**Test IDs until approval.** `app.json` currently uses Google's sample AdMob
app IDs, and banners use Google's test unit. To switch to real ads after your
AdMob apps are approved:

1. In AdMob, add two apps (Android and iOS) named Quiet Marble, then create one
   **Banner** ad unit in each.
2. In `app.json`, replace `androidAppId` and `iosAppId` under the
   `react-native-google-mobile-ads` plugin with your App IDs (`ca-app-pub-…~…`).
3. Set `extra.admob.androidBannerId` and `extra.admob.iosBannerId` to your banner
   unit IDs (`ca-app-pub-…/…`). Development builds always use test ads.
4. In AdMob, for each app: **App settings → Child-directed treatment: tag all
   requests**, and **Blocking controls → Content → Maximum ad content rating: G**.
5. In AdMob **Privacy & messaging**, create a **European regulations (GDPR)**
   message for both apps and publish it.
6. AdMob will ask for an `app-ads.txt` file on the website listed in the stores.
   Copy the line AdMob gives you into `public/app-ads.txt` (website repo root),
   then redeploy the site.

Never click your own live ads; test on devices with test ads.

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

Expo Go can't show ads (they need the native module), so ads appear only in
real builds.

## Builds and Google Play

Builds run in the cloud with Expo EAS (`eas.json`):

- `npm run build:android:preview` builds an **APK** to install directly on a phone.
- `npm run build:android:production` builds a signed **AAB** for Google Play
  (version code increases automatically).

The full Google Play kit (listing text, graphics, screenshots, answers for each
App content form and the release checklist) is in
[`store/google-play/README.md`](store/google-play/README.md). Icons and the
splash screen are generated from `store/art/icon.svg` with `npm run render:art`.

iOS is configured (bundle ID `com.quietmarblegames.quietmarble`) but not yet
prepared for the App Store.

## Privacy notes for later store forms

- No microphone, background audio, camera, location, contacts or file access.
  Android permissions are limited to internet, vibration and audio settings
  (none show a prompt); the rest are removed in `app.json`.
- Game sounds never pause other audio. On iPhone they follow the silent switch;
  on Android they follow the media volume (Android's ringer and vibrate modes
  don't mute game sounds, as in other Android games).
- Settings, nickname and personal results stay on the device. The only
  identifier is the anonymous leaderboard token, kept in secure storage.
