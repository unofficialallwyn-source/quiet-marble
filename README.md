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
