# Google Play release kit: Quiet Marble

Everything needed to publish the Android app on Google Play: listing text,
graphics, answers for each **App content** form in Play Console, and the
release checklist. The app's package name is `com.quietmarblegames.quietmarble`
(permanent once published).

Items marked **Check** are ones I couldn't confirm from here. Compare them
with the linked Google page while you fill in the form.

---

## 1. Store listing (Play Console → Grow → Store presence → Main store listing)

**App name** (30 max): `Quiet Marble: Logic Puzzles`

**Short description** (80 max):

```text
Marble Solitaire, Lights Out and Sudoku. Calm puzzles, offline play, no account.
```

**Full description** (4,000 max):

```text
A little everyday focus.

Quiet Marble brings together three timeless logic puzzles in one calm, uncluttered app. No account, no timers nagging you, no noise. Just you, the board and your next good move.

MARBLE SOLITAIRE: THREE BOARDS
• English (33 holes): the classic cross. Jump a marble over its neighbour into an empty hole, and finish with just one.
• Triangle (15 holes): jump along any of the triangle's three lines.
• Mini Diamond (13 holes): a compact board where diagonal jumps are allowed.

LIGHTS OUT
Every tap switches a tile and its neighbours. Find the set of switches that leaves the whole 5 × 5 board dark.

SUDOKU STREAKS
Start at Easy, Medium, Hard or Expert. Each win moves you up a level. How many puzzles can you solve in a row?

PLAY YOUR WAY
• Hints show a winning next move when you're stuck (hinted rounds become practice).
• Undo and reset whenever you like.
• Play offline: every game works without a connection as practice.
• Light and dark themes, and gentle sounds you can switch off.

FRIENDLY LEADERBOARDS
When you're online, finish an unassisted round to join the top-100 leaderboard shared with quietmarblegames.com. Your score is checked by replaying your moves. A nickname is optional, and you can report inappropriate names.

PRIVACY FIRST
No sign-up and no personal details. Ads are suitable for all ages and are not personalised. Read our privacy policy at https://www.quietmarblegames.com/privacy.html
```

**App category:** Game → **Puzzle**. **Tags:** Puzzle, Board, Logic, Brain games, Sudoku (choose the closest Play offers).

**Contact details:** email `support@quietmarblegames.com` (the one on the
website's contact page), website `https://www.quietmarblegames.com`.

**Graphics** (in this folder):

| Play asset | File | Size |
| --- | --- | --- |
| App icon | `graphics/app-icon-512.png` | 512 × 512 PNG |
| Feature graphic | `graphics/feature-graphic-1024x500.png` | 1024 × 500 PNG |
| Phone screenshots | `screenshots/1-home.png` … `6-settings-dark.png` | 1080 × 1920 PNG |

The screenshots come from the app's web build at phone size. Before
launch, consider replacing them with screenshots from your phone. They will
match exactly and can show the ad banner area. To regenerate the artwork, run
`npm run render:art`; for screenshots, see the steps in
`../art/screenshots.cjs`.

---

## 2. App content (Play Console → Policy → App content)

### Privacy policy
`https://www.quietmarblegames.com/privacy.html` (updated for the app in Phase 4).

### App access
**All functionality is available without special access.** There's no login.

### Ads
**Yes, my app contains ads.** These are AdMob banners below the game area.

### Content rating (IARC questionnaire)
- Email: your contact email. Category: **Game**.
- Violence, fear, sexuality, language, controlled substances, crude humour: **No** to all.
- Gambling or simulated gambling: **No**.
- **Do users interact or share content?** Answer **Yes**. The only user content is an optional nickname shown on public leaderboards. Names are filtered by the server, players can report them, and reported names are hidden. There is no chat or messaging.
- Shares the user's current location: **No**. Digital purchases: **No**. Unrestricted web access: **No**.
- Expected result: **Everyone / PEGI 3 / USK 0**, possibly with a "Users Interact" notice. **Check** the summary before submitting.

### Target audience and content
Our plan is a **general audience that includes children**. In Play this means
selecting age groups that include under-13s, for example **9–12, 13–15, 16–17
and 18+**, or also 5 and under / 6–8 if you want. Selecting any under-13 group
puts the app under Google's **Families policy**. The app is already built for it:
- AdMob is a Families self-certified ads SDK, and every request is child-directed and under the age of consent, capped at G, and non-personalised.
- The Android advertising-ID permission is removed, and there's no cross-app tracking.
- User nicknames are filtered, reportable and hidden after reports.
- A privacy policy is in place, and there's no account or personal data entry.

Answer **No** to "Could your store listing unintentionally appeal to children?"
only if you don't select under-13 groups. If you do select them, the listing
already appeals to all ages. Families review can take longer. If you'd rather
launch faster and add children later, select **13+** groups only for now.
That's your call; the app doesn't need changes either way.

### Data safety
Everything is **encrypted in transit** (HTTPS). Users **can't create an
account**, so no account-deletion URL is needed. Data deletion requests go
through the contact page.

**Data the app itself sends to our server** (quietmarblegames.com):

| Play data type | Collected | Shared | Optional? | Purpose |
| --- | --- | --- | --- | --- |
| Personal info → **Name** (the optional nickname) | Yes | No | Optional | App functionality (shown on leaderboards) |
| Device or other IDs (anonymous player ID created by our server) | Yes | No | Required for ranked play | App functionality, Fraud prevention, security and compliance |
| App activity → **App interactions** (game moves, scores and times for ranked rounds; name reports) | Yes | No | Optional (offline/practice play sends nothing) | App functionality, Fraud prevention, security and compliance |

Not collected by the app: location, contacts, photos, files, audio,
messages, health, financial info, email address, web history.

**Data the Google Mobile Ads SDK (AdMob) collects. Check this section.**
Google publishes the exact answers at
<https://developers.google.com/admob/android/privacy/play-data-disclosure>.
Copy them from there; I couldn't open that page from here. As far as I
know, it lists IP address (approximate location), device and other
identifiers (not the advertising ID here, because it's removed), app
interactions with ads, and app diagnostics, for Advertising, Analytics and
Fraud prevention. Add those rows to the form exactly as Google's page
describes them, including whether Google treats each as "shared".

### Other declarations
Government app: **No**. Financial features: **None**. Health: **None**.
News app: **No**. COVID-19 app: **No**. Advertising ID: **No, the app does not
use advertising ID**. The permission is removed in `app.json`. Data deletion: no
accounts. Data is removed by the 24-hour and top-100 cleanup, or on request via
the contact page.

---

## 3. Release checklist

### One-time setup
1. **Google Play Console** developer account (one-time US$25). New *personal*
   accounts must run a **closed test with at least 12 testers for 14 days**
   before production access. Plan for this, for example friends and family on
   Android.
2. **Expo account** (free) at expo.dev.
3. **AdMob account**: follow "Ads" in `mobile/README.md`. Until then the app
   shows Google's test ads, which is fine for testing.

### Build a test APK and try it on your phone
From `mobile/` on any computer with Node 22 (Windows is fine):

```bash
npm ci
```

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

`init` links the project to your Expo account and adds `extra.eas.projectId`
to `app.json`. Commit that change through a PR.

```bash
npm run build:android:preview
```

EAS builds in the cloud and gives you a link/QR code to an installable APK. On
the phone, allow installing from your browser when asked.

**Phone test checklist:**
- [ ] Icon, name and splash screen look right (light and dark mode).
- [ ] All five games play; hints, undo, reset and sounds work; mute works; the silent switch mutes sounds.
- [ ] A ranked Lights Out round saves, and the score appears on the website leaderboard too.
- [ ] Airplane mode: games play as "Offline practice"; the leaderboard says it needs a connection.
- [ ] Sudoku streak resumes after closing and reopening the app.
- [ ] A nickname like `sh1t` is refused; Report on another player's name asks first.
- [ ] A **test ad** banner appears below the game area (labelled "Test Ad"), not on home/settings.
- [ ] Settings links open the privacy policy and contact pages.

### Production release
1. Put your real AdMob App ID and banner unit ID in `app.json` (see
   `mobile/README.md`) through a PR.
2. `npm run build:android:production` builds a signed **AAB**. EAS creates and
   keeps the upload key. Version codes increase automatically.
3. In Play Console, create the app (name, default language, **Game**, **Free**),
   complete every **App content** form above, and fill in the store listing.
4. **Testing → Closed testing**: upload the AAB, add your testers, and roll out.
   The first upload must be done in the browser. After 14 days with 12+ testers,
   apply for production access.
5. **Production**: create a release with the same or a newer AAB, choose
   countries, and send for review.
6. Later uploads can use `npx eas-cli@latest submit -p android` (needs a Google
   service account key; see `eas.json`, submit profile `production`).
