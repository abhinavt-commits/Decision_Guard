# SANGYAN Decision Guard

**Before you act, let's check. / कुछ करने से पहले, चलिए जाँच लें।**

> **Submission summary:** see [SUBMISSION.md](SUBMISSION.md) · **Deploy + mobile:** see [DEPLOY.md](DEPLOY.md)

A bilingual (Hindi/English), mobile-first web app for Tier-2/Tier-3 investors. Before they act on a share tip, it checks three things together:

1. **The message**: guaranteed returns, urgency, "insider" claims, payment requests, fake apps, OTP requests. Rules cover English, Hindi and Hinglish.
2. **Who sent it**:
   - SEBI registration numbers (INA/INH), checked against SEBI's registry, including whether the registered *name* matches the sender.
   - UPI IDs: is it a SEBI-validated `@valid` handle?
   - Suspicious links: look-alike domains, shortened links, `.apk` files, private group invites.
   - Popularity: view counts are shown as reach, never as proof.
3. **The user's own recent trades**:
   - Loss streaks and loss-chasing.
   - Overconfidence after wins (greed, not just fear).
   - Overtrading, going back into a stock that just lost money, and FOMO or herd behaviour.

It also adds **company facts** (typical daily move, 1-year range, recent news, demerger and rename notes) and compares a promised return with the stock's actual past moves. This is context only, never a prediction.

The result is 🟢 / 🟠 / 🔴 with the evidence behind every warning. It **never** says buy, sell or hold, and never gives a target price.

## Features

- Demo login with 2 accounts that have different trade histories, so the same tip gives a different behaviour analysis.
- English ⇄ हिंदी toggle on every screen. Tap any underlined word to get a simple explanation of the financial term.
- 3-step check form with large buttons: source tiles, then trade, then reason chips. Reason chips like "to recover a loss" also feed the behaviour check.
- Screenshot reading (OCR): Gemini if a key is set, otherwise on-device Tesseract (English + Hindi).
- Voice input (hi-IN / en-IN), plus a "Read aloud" button for results.
- **Share from WhatsApp**: install the app (Add to Home screen), then long-press a message, tap Share and pick Decision Guard. The text or screenshot opens straight in the check form (Android, via the PWA share target).
- **Share card**: a Hindi/English result image to send to family on WhatsApp.
- **Cool-off**: "Wait 15 minutes" or "Sleep on it" timers on the Home screen. A 7-day "How did it go?" follow-up and a count of how many times you paused.
- Decision journal with 4 questions, which you can speak or type.
- History, Learn (scam explainers and a glossary) and Profile. Profile lets you add past trades or import a broker tradebook CSV. The CSV is parsed on the phone; nothing is uploaded.
- **Ask Saathi (help chat):** questions about using the app, trading terms and scams, typed or spoken, in Hindi or English, with read-aloud answers.
  - Requests for advice or predictions ("Should I buy X?", "कौन सा शेयर लूँ?", "Will Reliance go up?") are refused by fixed rules **before** any AI is used.
  - Every AI answer is checked again by a no-advice filter. Answers come from the app's own help and glossary.
  - Without a Gemini key, it answers from the built-in help and glossary.
- **Fraud alerts (Learn → Alerts):**
  - "What the government is doing": @valid UPI and SEBI Check, the finfluencer rules, the SEBI registry, 1930, Sanchar Saathi and SCORES. This section always works offline.
  - Recent fraud cases from the SEBI RSS feed (official) and Google News, filtered to fraud keywords and known outlets. Each case is tagged by type (fake app, tip group, impersonation, deepfake, assured returns, govt action) with a "how to spot it" tip and a link to the source. Gemini only translates headlines; it adds nothing.
  - The latest alert also appears on Home, and a result shows "Similar frauds in the news" that match its warnings.
- Helplines: 1930, cybercrime.gov.in, SEBI SCORES, SEBI Check, Sanchar Saathi.
- Offline-friendly PWA shell, no web fonts, small JavaScript bundle.

## Demo accounts (for judges)

| Account | Username | Password | Story |
|---|---|---|---|
| Ramesh (recent losses) | `demo-loss` | `loss123` | 3 losses in a row this week, trading more often, lost on Tata Motors recently |
| Sunita (recent profits) | `demo-profit` | `profit123` | Steady weekly investor, 3 wins in a row |

The login page also has one-tap buttons for both accounts.

### New users ("Create account")
Anyone can create their own account on the login screen with a **name + 4-digit PIN**. They get a **Login ID** like `arnav-e35h` and use it with their PIN to log in again on any phone. The account starts empty (no demo data); past trades can be added in Profile.

There is no database: the last 4 characters of the Login ID are a signature of name + PIN, made with `SESSION_SECRET`. So:
- Use the **same `SESSION_SECRET`** on your laptop and on Vercel, and **don't change it** after people have created accounts, or their Login IDs will stop working.
- A forgotten Login ID or PIN can't be recovered. The app tells the user to write it down.
- Checks and trades stay in that phone's browser. Logging in on another phone works, but starts with an empty history there.

### Demo script (2 minutes)

1. Log in as **Ramesh**, then tap **Check a decision**.
2. Source: **YouTube**. Paste:
   `🚀 Tata Motors will give 40% return in 30 days! GUARANTEED profit. Buy now, last chance! Join our VIP group, pay ₹999 to rahul.tips@ybl`
   Use any YouTube link. Views: `10 lakh`.
3. Choose **Tata Motors Passenger Vehicles**, Buy, 100 shares, then tap **Someone recommended it** and **Check now**.
   - The result is 🔴 **Pause**. Top 3: guaranteed profit · payment to a non-@valid UPI ID · bigger trade soon after a loss.
   - "10 lakh views — popular, but that is not proof."
   - Tata Motors split into TMPV and TMCV, so "Tata Motors" in a tip is ambiguous.
4. Switch to **हिंदी**, tap **सुनें** (read aloud), then **परिवार को भेजें** (WhatsApp card).
5. Tap **Wait 15 minutes** and show the timer on Home.
6. Log out, log in as **Sunita**, and run the same check. The message part is the same, but the behaviour part is different: **"Trade size jumps to 2.1× your usual after 3 wins"** (overconfidence) instead of loss-chasing.

This shows the result comes from analysing real inputs, not from hard-coding "Tata Motors = red".

## Deploy to Vercel (about 5 minutes)

1. Push this folder to a new GitHub repository:
   `git init && git add . && git commit -m "Decision Guard" && git branch -M main && git remote add origin <your-repo-url> && git push -u origin main`
2. Go to [vercel.com](https://vercel.com), choose **Add New → Project**, and import the repo. The framework is detected as Next.js.
3. Under **Environment Variables**, add:
   - `SESSION_SECRET`: any long random string (required).
   - `GEMINI_API_KEY`: from https://aistudio.google.com/apikey (optional; enables AI screenshot reading, reading inside YouTube videos, and summaries).
   - `YOUTUBE_API_KEY`: optional; adds view counts and descriptions.
4. Click **Deploy**. You get a URL like `https://decision-guard.vercel.app`.
5. Make the QR code for your slides: `npm run qr -- https://decision-guard.vercel.app/login`. This writes `qr-code.png`.

> **Before the demo, on a computer in India:** run `npm run fetch-sebi`, then commit and push. It downloads SEBI's full lists of registered advisers and research analysts (about 3,300 entries) into `data/sebi-registry.json`. Without it, the app uses a small seed list and tries SEBI's website live for each number. If neither can confirm a number, the app says "could not verify". It never says "fake" without evidence.

## How old is the tip? (freshness)

Share prices and news change fast, and old videos are often forwarded as new. Each check now looks for when the tip was **published**:
- the YouTube upload date (read from the public video page, no key needed),
- a date in the link (e.g. `/2025/03/14/`),
- a date written in the message.

It also asks the user **when they got the tip** (today / this week / this month / older). From these it shows:
- a 🕒 **"Published …"** label under the verdict,
- **Old tip** warnings: over 30 days old is orange; up to 30 days is an info note,
- **"Old content shared as if new"** when the user got it today or this week but it is more than 3 months old,
- **"Since it was published, the share has moved +X%"**, using 2 years of daily prices,
- **"The tip's price (₹120) is far from today's price"** when an entry price in the tip ("buy @ 120", "CMP 450") is 15% or more away from the live price.

These are past facts, never forecasts.

## Companies covered

- **Every NSE-listed company** (main board and the SME platform, about 2,800+) once you run **`npm run fetch-stocks`** on a computer in India. It downloads NSE's public lists into `data/nse-equities.json`.
- **Without that file**, company search falls back to Yahoo Finance's public search, which covers NSE and BSE.
- **11 popular shares** keep hand-written Hindi names and notes (e.g. the Tata Motors split).
- **Extra warnings that come from the list:**
  - **SME platform** shares, which are easier to manipulate.
  - **Restricted trade-for-trade categories** (BE/BZ).
  - **Penny stocks** under ₹20, using the live price.

## How YouTube videos are checked

1. **Title and channel:** from YouTube oEmbed, which needs no key. Views and description need `YOUTUBE_API_KEY`.
2. **Inside the video:** Gemini watches the **first 15 minutes** of a **public** video, at low resolution to keep it quick (about 20–60 s).
   - It reads both what is said and what is shown on screen.
   - It returns claims with timestamps, any SEBI numbers shown, links/groups/UPI IDs mentioned, and whether a risk disclaimer was given.
   - Everything it finds goes through the **same fixed rules** as a typed message. The result shows an "Inside the video" card where each timestamp links to that moment.
3. If the video can't be watched, the reason is listed under "What we could not check": no key, private/unlisted video, timeout, or free quota used up. Terminal lines starting with `[gemini]` give the technical detail.
4. **Gemini model:** the app tries `GEMINI_MODEL` (if set), then `gemini-flash-latest`, then `gemini-2.5-flash`, and remembers the first that works.

## How SEBI registration is checked

SEBI has no list of "finfluencers". Anyone who gives stock recommendations or advice as a service must be a **SEBI-registered Research Analyst (INH…) or Investment Adviser (INA…)**. The app checks:

1. **A number in the message or the video** (INH/INA/INZ + 9 digits):
   - It is looked up in the downloaded SEBI list (`npm run fetch-sebi`), and live on sebi.gov.in if it isn't in that list.
   - If found, the app checks that the **registered name matches** the channel or speaker, because copied numbers are a common trick.
   - If SEBI has no record of it, the result is red. If SEBI can't be reached, the result is "could not verify", never "fake".
2. **"SEBI registered" with no number shown:** orange. Ask them for the number.
3. **Tips given but no registration mentioned:** orange.
4. **Name search, for creators who don't show a number.** You can type the person's or channel's name in the check form, or ask Saathi "Is <name> SEBI registered?". The name is searched in three places:
   - SEBI's downloaded list. This is instant and works offline after `npm run fetch-sebi`.
   - SEBI's live search on sebi.gov.in.
   - A web search (Gemini + Google Search), if the AI is on. Any registration number found on the web is **re-checked against SEBI** before the app calls it registered. SEBI orders or warnings that mention the name are shown with a note that different people can share a name.
   - To test SEBI search from your laptop: `npm run fetch-sebi -- --test "parag thakur"`. If it fails, add `--debug` and share `data/sebi-debug.html`.
5. **How the name search results read:** the channel or speaker name is searched in SEBI's adviser and analyst lists.
   - A similar name gives an info note: "this does NOT prove it's the same person".
   - No match gives a cautious note, since creators may be registered under a legal name.

## UI kit (Tailwind + shadcn structure)

- **Tailwind CSS v4** is set up (`postcss.config.mjs`, `@import` in `app/globals.css`) **without Tailwind's reset**, so the existing styles look the same.
- **shadcn layout:** `components.json`, `lib/utils.ts` (`cn()`), and reusable UI parts in **`components/ui/`**. `npx shadcn@latest add <component>` drops new components there.
- `components/ui/gradient-menu.tsx` drives the bottom bar (Home, History, Ask, Learn, Profile):
  - The current page shows as an expanded brand-blue pill with its name.
  - Other items are white circles that expand on hover.
  - Icons come from `react-icons`.
- **One colour theme:** the brand blue gradient (`#1749c9 → #3d7bff`) is defined once as Tailwind tokens (`brand`, `brand-2`) and as `--brand-gradient`.
  - Every button, chip and toggle uses the same gradient-reveal and glow animation.
  - Selected chips and toggles use the same gradient as the active menu item.
  - Red, orange and green are kept only for the verdict meaning.
  - Animations switch off for users who turn on "reduce motion".

## Run locally

```bash
npm install
cp .env.example .env.local   # add keys if you have them
npm run dev                  # http://localhost:3000
npm run eval                 # rule test-set + no-advice guardrail tests
```

## How the verdict is decided (transparent rules)

Every signal is 🔴 red, 🟠 orange, ℹ️ info or ✅ ok, and each one shows *what we found*, *why it matters*, *what to check*, and a glossary link.

- 🔴 **Pause**: 2 or more red signals, or 1 red + 2 orange, or a score of 6 or more (red = 3, orange = 1).
- 🟠 **Review**: any red or orange signal.
- 🟢 **No major warning signs**: neither. The screen still says this is *not* a good-investment signal.

AI (Gemini) is used only to **read** content: screenshots, what's said in a video, and a neutral summary. **The colour always comes from the fixed rules.** Any AI text is passed through a no-advice filter (`lib/engine/guardrail.ts`) before it is shown.

## Test results (`npm run eval`)

- 42 labelled messages: 12 scams, 10 hype/pressure, 12 legitimate, plus 8 held-out cases written after tuning.
- Current: 42/42 match. **0 scams marked green, 0 legitimate messages marked red.**
- On the 8 held-out cases *before* the last rule fixes: 5/8 exact, and the 3 misses were scams shown as 🟠 rather than 🔴 (none was missed).
- Guardrail: blocks 5/5 advice texts, allows 2/2 neutral summaries, detects 3/3 "should I buy?" questions.

Add your own cases to `scripts/eval-cases.ts`. Unseen messages are the honest measure.

## Project map

```
app/                 screens (login, home, check, result, journal, history, learn, profile) + API routes
lib/engine/          analysis: claims.ts, source.ts, sebi.ts, market.ts, behaviour.ts, gemini.ts, guardrail.ts, index.ts
lib/ui-strings.ts    all interface text in English and Hindi (rename the app here: APP_NAME)
lib/glossary.ts      simple explanations of terms, scam explainers, helplines
lib/demo-accounts.ts the two demo histories (dates are relative to today)
data/                SEBI registry list
public/              PWA manifest, service worker (share target + offline shell), icons
scripts/             eval, fetch-sebi, qr
```

## Data sources

- SEBI intermediary registry (sebi.gov.in) and SEBI Check (validated UPI).
- Prices: Yahoo Finance chart API (free, no key). Context only, no predictions.
- News: Google News RSS (last 14 days).
- YouTube: oEmbed (no key), or the YouTube Data API if a key is set.

All of these fail gracefully. Anything that couldn't be checked is listed under **"What we could not check"**.

## Privacy

There is no broker or bank connection, and no Aadhaar or PAN. Checks, journal notes and added trades are stored only in the user's browser. Demo trade data is fictional.

*Not investment advice. This tool checks for warning signs; it never tells anyone to buy, sell or hold.*
