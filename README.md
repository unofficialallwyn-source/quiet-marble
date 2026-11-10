# Quiet Marble — Azure edition

Marble Solitaire and Lights Out, without player login. Includes rules, objectives, reset, real CC0 marble/switch sounds, local personal history, and a shared leaderboard validated by replaying moves on the server.

## Status

Prepared from the existing Quiet Marble source on 9 November 2026. Five automated tests, frontend production build, and Azure Functions TypeScript build pass. SQL tests use an in-memory store; Azure SQL connectivity and actual Azure hosting still require deployment verification. Local checks ran on Node 24; GitHub Actions uses the deployment target Node 22.

This package has not been published to Azure. The current public site is unchanged. No paid resources were provisioned. AdSense remains disabled.

## Architecture

Vite/React static frontend → same-origin `/api/game` Azure Functions → Azure SQL.

A signed HttpOnly anonymous cookie links ranked rounds in one browser. Personal history and sound preferences are stored locally. Clearing cookies changes player identity; there is no cross-device recovery. Changing to an Azure domain creates a new browser identity and history. Existing Cloudflare leaderboard records are not imported by this package.

The fixed Lights Out puzzle has a known solution; this is a friendly leaderboard, not competition-grade anti-cheat. Bots can solve it. Hints/undo are excluded from ranking by the interface, not cryptographically proven. Per-player start throttling helps accidental retries but is not a global abuse control.

## Run checks

Install Node.js 22, then from this directory:

```sh
npm ci
npm ci --prefix api
npm test
npm run build
npm run check:api
```

`npm run dev` runs the frontend only; without the API, use practice play. To run the backend locally install Azure Functions Core Tools v4, build the API, and supply local settings (never commit secrets). Use the SWA CLI or another same-origin proxy for full-stack local testing.

## Azure setup — beta first

1. The code is in `unofficialallwyn-source/quiet-marble` on `main`. Do not commit `node_modules`, build output, credentials, or local settings. CI runs on pushes and pull requests; deployment is manual.
2. In Azure Portal create a dedicated resource group, for example `quiet-marble-rg`.
3. Create **Static Web App**, **Free** plan, deployment source **Other**. Azure supplies a public HTTPS `azurestaticapps.net` address; no purchased domain is needed. Record its exact HTTPS origin (no trailing slash).
4. Create an Azure SQL Database using the **free database offer**, where eligible. Select **auto-pause when the free monthly limit is exhausted**, not continued paid usage. Verify the review page explicitly shows the free offer. If unavailable, stop and decide a budget before choosing a paid database. A free capped database can pause and temporarily prevent ranked games. Free services are suitable for this beta; review paid production plans before a revenue launch.
5. Create a SQL logical server, retaining its administrator login securely. Enable encrypted SQL connections. For the simple public-endpoint beta, allow the deployment machine IP temporarily for migration. The managed Functions API also needs network access: the SQL setting “Allow Azure services and resources to access this server” is a broad Azure-wide firewall exception (SQL authentication is still required). Enable it only if acceptable; otherwise use a separately designed private-network backend. Remove the temporary migration IP after setup.
6. From a trusted machine with Node 22, export `SQL_SERVER` (full `name.database.windows.net`), `SQL_DATABASE`, `SQL_USER` (administrator for migration), and `SQL_PASSWORD`. Set `APP_SQL_PASSWORD` to a new strong secret of at least 24 characters. Run `npm --prefix api run db:migrate`. This creates the schema and a contained `qm_app` user limited to SELECT, INSERT, UPDATE and DELETE on the rounds table. An existing qm_app password is not changed on rerun. Do not put the admin account into the website settings.
7. In Static Web App → Configuration/Application settings, add the values in the table below. Settings are for the server API, not Vite build variables.
8. Copy the Static Web App deployment token from Azure into GitHub → repository Settings → Environments → `production` → secret named `AZURE_STATIC_WEB_APPS_API_TOKEN`. Never paste it into chat or a source file.
9. Open GitHub Actions → **Deploy Azure beta** → **Run workflow**, on `main`. It tests and builds both components, prunes API development dependencies, and uploads prebuilt frontend/API packages.
10. Complete the smoke checks below before sharing the new Azure URL.

| Azure application setting | Value |
| --- | --- |
| SQL_SERVER | Full Azure SQL hostname |
| SQL_DATABASE | Database name |
| SQL_USER | qm_app |
| SQL_PASSWORD | The APP_SQL_PASSWORD used during migration |
| SESSION_SECRET | A securely generated random secret of at least 32 characters |
| ALLOWED_ORIGIN | Exact public HTTPS site origin, without trailing slash |

Generate secrets in a password manager or a trusted terminal (for example `openssl rand -hex 32`). Keep the session secret stable: changing it invalidates all anonymous identities. Do not add these secrets with a `VITE_` prefix or otherwise embed them in frontend code.

## Live smoke checks

- Open the Azure URL in a normal browser and a private window. No player login should be required.
- Start Marble Solitaire, make a move, reset: 32 marbles, zero moves, idle timer, Start game button. Reset must work even when the API is unavailable.
- Switch to Lights Out and repeat reset. Verify sound starts only after interaction, mute works, and the mute preference survives refresh.
- Start a ranked Lights Out round; click zero-based row-major cells 0, 3, 6, 9, 12, 17, 21. Save: the leaderboard should update once and remain after refresh. A second browser should see the shared score.
- Try submitting the same round twice: the API must return 409. Invalid move sequences must return 400. Server/database errors must not expose credentials.
- Verify GET `/api/game?game=lights` returns JSON rather than the SPA HTML. If it returns 503, check app settings, SQL firewall, schema and database resume status. Free SQL resume may require a retry.
- Check mobile layout, keyboard interaction, game rules and objective visibility.

## Operations and monetization

The existing rounds table retains at most 100 finished results per game, one per anonymous player. Worse and superseded scores are deleted in the same transaction as submission. Ties use the earlier round start, then round ID. Each player can have one unfinished round per game; starting another replaces it. Unfinished rounds expire after 24 hours. Cleanup runs on leaderboard reads, starts, and submissions; when the site is idle, expired rows remain until the next such request. Azure backups may retain deleted data until backup retention expires. There is no permanent player directory or full game history. Review Azure cost alerts (alerts are not spending caps), security, abuse controls and service availability before a commercial launch. GitHub Actions private-repository minutes have separate allowances.

The existing public website remains the fallback while Azure is verified. To roll back Azure code, revert the Git commit and manually run deployment again; do not delete the database. Keep SQL backups and test restore before relying on leaderboard history.

AdSense is not activated here. Resolve the deactivated account with Google and obtain site approval separately. Add operator contact details, appropriate privacy/consent handling, and compliant ad placements before enabling any ad scripts. Azure hosting alone does not provide AdSense approval.

## Sources

- https://learn.microsoft.com/azure/static-web-apps/plans
- https://learn.microsoft.com/azure/static-web-apps/build-configuration
- https://learn.microsoft.com/azure/static-web-apps/application-settings
- https://learn.microsoft.com/azure/static-web-apps/apis-overview
- https://learn.microsoft.com/azure/azure-sql/database/free-tier?view=azuresql

Sound licenses and attribution are included under `public/sounds`.

## Updating an existing database

Run `npm --prefix api run db:migrate` as the database administrator before deploying this version. No new tables are needed. The migration grants the existing `qm_app` user DELETE on `dbo.rounds` for retention cleanup, even when APP_SQL_PASSWORD is omitted. The first leaderboard read/start/submission prunes old completed results to the top 100 per game; this intentionally removes nonqualifying history.

SQL integration tests run in CI against an isolated SQL Server database and exercise actual retention queries, concurrent submissions, duplicate saves and expiry. They never connect to the production database. Azure connectivity and gameplay still require the live smoke checks above before code freeze.

## Session player names

Players can enter an optional nickname before starting (up to 24 characters). The browser remembers it in sessionStorage for the tab session; it is locked for the current round. The API validates and stores it with that round and displays it only if the score qualifies. Names do not replace the anonymous cookie identity, are not unique or verified, and changing the name does not create another leaderboard slot. A previous best score retains the name used when it was earned until a better score replaces it. Existing scores use the Player label. No account or permanent profile is created.

Before deploying this change, run `infra/schema.sql` in Azure Query Editor on quiet-marble-db (or run the migration as administrator). This adds one nullable `display_name` column without changing existing results. Then deploy. Verify a nickname survives refresh in the same tab, reset allows editing, and a qualifying score shows the chosen name.

## Custom domain and AdSense

Production: https://www.quietmarblegames.com (the root domain forwards here). Set
`ALLOWED_ORIGIN=https://www.quietmarblegames.com` in the Azure app settings.

The publisher script is in `index.html`; `public/ads.txt` authorizes publisher
`pub-7714642237091483`. Public disclosures are at `/privacy.html` and `/contact.html`.
The public support email is maintained only in `public/contact.html`; replace it
before cancelling the mailbox, test receipt and replies, and redeploy.

Before requesting AdSense review:
- Deploy and check the homepage script, `/privacy.html`, `/contact.html`, and
  `/ads.txt`. Confirm `https://quietmarblegames.com/ads.txt` redirects to the actual
  text file at the www host, not to the homepage.
- Check both leaderboard APIs return JSON successfully and ranked play works.
- In AdSense Sites, verify `quietmarblegames.com` and request review.
- Keep Auto ads off during setup. Configure and publish Google's certified CMP
  under Privacy & messaging for applicable regions before enabling advertising.
  The script alone is not a consent implementation.
- After approval, configure a manual responsive unit below the rules, away from
  game controls. No ad slot or manual ad request is added by this change.

If APIs return 503, check Azure SQL availability/firewall and the existing
`SQL_SERVER`, `SQL_DATABASE`, `SQL_USER`, `SQL_PASSWORD`, `SESSION_SECRET` and
`ALLOWED_ORIGIN` app settings. Do not expose their values in issues or logs.

### Investigating intermittent API 503s

Unexpected failures now return a random `requestId` (also `X-Request-ID`) and log
`game_api_failure` through the invocation's Azure logger. Logs contain only the
operation, elapsed application time, allowlisted driver error type/code, and SQL
error number when available. They omit error messages/stacks, SQL, credentials,
cookies, nicknames and request payloads. No automatic retry or database-setting
change is made: a failed score write must not be replayed blindly.

In Static Web Apps > Application Insights, check whether monitoring is enabled.
Enable it if needed to collect server logs (Azure monitoring has separate usage
pricing). No browser analytics SDK is required. After deploying, reproduce a
failure and use Application Insights > Logs:

```kusto
traces
| where timestamp > ago(24h)
| where message contains "game_api_failure"
| project timestamp, message, operation_Id
| order by timestamp desc
```

Match `requestId` to the failed response. `ETIMEOUT` identifies a timeout but does
not by itself identify its cause; `sqlNumber=40613` means database unavailable
(and can occur during serverless resume). Authentication/firewall/query errors
need their corresponding SQL number checked. Inspect SQL Activity log and
Compute + storage settings before blaming auto-pause: an Online snapshot does
not establish its prior state. Response timing measured externally also includes
network overhead and is not a measurement of SQL execution time.

This is a diagnostic change, not a confirmed fix for the intermittent outage.

## Recent player counter

The counter estimates anonymous browsers active across both games in the last
five minutes, including the current player. It never uses a fabricated default.
Zero shows "Be the first to play"; errors show "Activity unavailable".

Before deploying this change, run the updated `infra/schema.sql` as the database
administrator (or use `npm --prefix api run db:migrate` with admin credentials).
This adds `dbo.player_activity(player, last_seen)` and grants `qm_app` its CRUD
permissions. Existing rounds and leaderboard results are preserved. No app
setting is added. A missing migration affects the counter, not game startup.

The browser polls once per minute while visible. Only a visible, unfinished
round with a start/move/undo in the last minute sends a heartbeat. A passive open
tab does not keep a player counted. Heartbeats require the signed player cookie,
a matching same-origin request, and an owned unfinished round less than 24 hours
old. Updates within 30 seconds do not write the timestamp again. Multiple tabs
sharing the cookie count once. There are no names, IP addresses, or activity
history in the presence table. Old rows stop counting after five minutes and are
physically removed after 24 hours of inactivity on the next activity read/heartbeat. When there is no traffic,
expired rows can remain until then. This is an estimate of browser identities,
not verified people; blocked cookies or multiple browsers affect accuracy.

`GET /api/game?action=activity` returns `{count,total}`; authenticated
`POST /api/game` with `{action:"heartbeat",id:<round ID>}` refreshes activity and
returns the count. Activity failures use the existing sanitized diagnostics.
SQL CI covers duplicate tabs, concurrent updates, expiry, invalid ownership and
finished/expired rounds; API tests cover identity, origin and failure handling.

### Sudoku streaks

Sudoku has a separate top-100 leaderboard: one best streak per anonymous player,
ordered by consecutive wins descending, then total server-measured solving seconds
ascending. Starting difficulty is displayed alongside the score; all levels share
one leaderboard. The dropdown selects the starting level. Wins progress through
Easy, Medium, Hard and Expert, then continue with new Expert puzzles. Levels target
44, 38, 32 and 28 clues, preserving a unique solution; these are clue-based challenge
levels, not a formal human-technique difficulty rating.

Each correct submission is checked against the original givens and Sudoku rules on
the server and saves the streak automatically. The timer begins on the first entry,
includes breaks during an unfinished puzzle, and stops on accepted submission.
Waiting between puzzles is excluded. Incorrect answers can be corrected without
losing the streak. New streak/difficulty replaces current progress, preserving any
qualifying best score. Refresh resumes the current tab's entries. One live Sudoku
streak is supported per anonymous browser identity; starting in another tab replaces
it. Inactive streaks expire after 24 hours; cleanup runs on Sudoku writes/leaderboard
reads. As with the existing games, anonymous play cannot prove human play.

**Deploying the Sudoku update:** before deploying the new code, run the updated
`infra/schema.sql` in the `quiet-marble-db` SQL query editor using the database admin,
or run the existing migration script with admin credentials. It is additive and
repeatable: it creates `dbo.sudoku_sessions` and `dbo.sudoku_scores` and grants the
existing `qm_app` user CRUD permissions. No changes to existing scores, app settings,
Azure resources or packages are required. Then run the Azure deployment workflow on
`main`. Do not deploy the new API before this migration: activity queries also use
the new session table.

### Website visitor counter

The game-page counter includes all visible visitors, not only active players. A
separate signed `qm_visitor` cookie (one day) avoids changing leaderboard identity.
The browser confirms cookie acceptance before a row is counted, then reports every
minute while visible. Hidden/closed tabs age out after five minutes. The existing
`player_activity` table stores the identifier, last-seen time and a deduplication flag.
The cumulative visits feature below requires the schema update before deployment.
The active count remains an approximate browser count, separate from total visits.

### Deployment notices for active rounds

Active players see a dismissible notice when the production workflow publishes an
update warning. The workflow waits 90 seconds before uploading to Azure, then clears
the notice on completion/failure. Clients poll every 15 seconds while visible and
never refresh the page automatically. This describes a website update, not a promise
of a server restart or guaranteed interruption. Notices expire after 30 minutes if
cleanup cannot run. Cleanup only clears its own workflow run/attempt.

One-time setup before deploying this feature:

1. Run the updated `infra/schema.sql` as database admin. It creates the single-row
   `deployment_notice` table and grants the existing `qm_app` user SELECT/UPDATE.
2. Generate a random secret of at least 32 characters (for example, locally with
   `openssl rand -hex 32`). Do not commit it or share it in chat.
3. Add the same value as `DEPLOYMENT_NOTICE_TOKEN` in both Azure Static Web App
   production environment variables and GitHub's **production environment secrets**.
4. Deploy the feature through the manual workflow. The first deployment may see a
   404 because the old API has no notice endpoint; it proceeds without a warning.
   Warnings work for later deployments, in browsers that have loaded this version.

If the GitHub secret is absent, deployment still proceeds but notices are disabled.
If configured notification publishing fails (other than bootstrap 404), upload is
stopped so a deployment does not silently bypass a broken warning configuration.
An expired notice disappears even if a cancelled workflow cannot clean it up.

### Recovering the deployment-notice header update

Static Web Apps can overwrite the standard Authorization header on requests to
managed Functions (Azure/static-web-apps issue #158). The notice helper and API use
`X-QM-Deployment-Token` instead, keeping the existing constant-time secret check.
Existing Azure/GitHub `DEPLOYMENT_NOTICE_TOKEN` values and SQL schema are unchanged.

To install this fix when the old endpoint rejects requests: after merging, start a
**new** Deploy Azure beta run on main and check **skip_deployment_notice** once. This
explicit recovery option skips only the pre-upload warning. The post-upload cleanup
still authenticates against the newly deployed API and must succeed. Leave this
option unchecked for normal future deployments. Re-running an old failed run uses
the old code and will not install the fix.


### Cumulative total visits

Before deploying this version, re-run `infra/schema.sql` against `quiet-marble-db`.
It adds `player_activity.counted` and a single `site_totals` row initialized to zero.
The migration is repeatable and never resets an existing total. No historical
visits are backfilled. The runtime user receives SELECT/UPDATE on the new table.

The page displays total visits separately from five-minute active visitors. One
confirmed `qm_visitor` cookie counts once during its 24-hour lifetime; refreshes,
extra tabs, polling and game changes do not add visits. After cookie expiry a new
visit can count. This is not a unique-person metric and blocked cookies do not
count. The increment and deduplication update share the activity transaction and
lock, so retries/concurrent requests cannot count the same visitor twice. Legacy
round heartbeats do not increment the total. Activity rows stop counting as active
after five minutes but remain for deduplication until 24 hours of inactivity.
Deleting them never decrements the singleton total. No permanent visitor list is
kept. A deployment/restart does not reset the SQL total.

`POST /api/game` with `{action:"visit"}` and the activity GET both include `total`.
The UI retains the last known total through temporary failures and ignores a lower
poll response. The SQL integration suite checks concurrent increments, expiry,
new store instances and repeat migration. Deploy only after the schema update.

### Marble board variants

The dropdown offers English (33 holes), Triangle (15 holes, top vacancy), and
Mini Diamond (13 holes, centre vacancy). English permits orthogonal jumps;
Triangle permits jumps along its three lattice axes; Mini Diamond also permits
diagonal jumps. Every opening has a tested complete one-marble solution used by
practice hints. Hints from arbitrary positions retain the bounded search behavior.
Reset before changing a board during a round. Rules, counters, personal results
and public top-100 rankings follow the selected board.

Re-run `infra/schema.sql` before deployment. It replaces the rounds game CHECK
constraint to permit `triangle` and `diamond`. Existing English results retain the
`marble` key and remain intact. The existing retention SQL already partitions by
game, so each new board has its own 100-player limit without new score tables.
The server determines the board from the stored round, never the score request.

`src/RecentlyAdded.tsx` holds the explicit release date for this feature. The
Recently added badges and New dropdown labels expire after 30 days. For future
features, use their own release date; do not extend old badges indefinitely.
