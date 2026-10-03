# Deploy + run on mobile

## A. Put it online (GitHub → Vercel, free, ~10 minutes)

### 1. Before uploading (optional but recommended)
Run these on your laptop to refresh the data files, so the deployed app has them:

```bash
npm run fetch-stocks     # full NSE + SME company list → data/nse-equities.json
npm run fetch-sebi       # SEBI adviser list → data/sebi-registry.json
```

Also analyse your demo YouTube videos once in the app. The results are saved in `data/video-cache/`, and the live demo uses them without spending Gemini quota.

### 2. Upload to GitHub
1. Go to github.com → **New repository**, for example `sangyan-decision-guard`. Choose **Public** so judges can see it.
2. Click **"uploading an existing file"**. Drag in **everything inside this folder**.
3. **Do NOT upload** `node_modules`, `.next` or `.env.local`. Your Gemini key must never go on GitHub.
4. Click **Commit changes**.

### 3. Deploy on Vercel
1. Go to vercel.com → sign in with GitHub → **Add New → Project** → import the repo.
2. Open **Environment Variables** and add:
   - `SESSION_SECRET`: the **same** long random text as in your `.env.local`, so Login IDs keep working.
   - `GEMINI_API_KEY`: your key from aistudio.google.com/apikey.
3. Click **Deploy**. After about 2 minutes you get a link like `https://sangyan-decision-guard.vercel.app`.
4. To change the key later: Settings → Environment Variables → edit → **Deployments → Redeploy**.

### 4. QR code for judges / slides
```bash
npm run qr -- https://<your-app>.vercel.app/login
```
This saves `qr-code.png`, which you can put on your slide or poster.

### 5. Submit on the SANGYAN website
Put your **live link**, your **GitHub link** and the **demo logins** (`demo-loss / loss123`, `demo-profit / profit123`) in the submission form. Use `SUBMISSION.md` as the project description. It has the problem, solution, features, compliance notes and demo script. If the site asks for a file, upload `SANGYAN-DecisionGuard-submission.zip`.

---

## B. Run on a mobile phone

### Option 1: The Vercel link (best; works anywhere, any phone)
1. Open `https://<your-app>.vercel.app` in **Chrome** on Android or **Safari** on iPhone.
2. Install it like an app:
   - **Android (Chrome):** ⋮ menu → **Add to Home screen / Install app**.
   - **iPhone (Safari):** Share button → **Add to Home Screen**.
3. It now opens full-screen from its own icon.
4. **Share from WhatsApp (Android, after installing):** long-press a message → Share → **Decision Guard**. The tip opens straight in the check form.
5. Voice input and the microphone need HTTPS, which the Vercel link has.

### Option 2: Same Wi-Fi as your laptop (for testing before deploy)
1. On the laptop:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```
2. Find the laptop's IP address. On Windows, run `ipconfig` and look for **IPv4 Address**, for example `192.168.1.5`.
3. On the phone (same Wi-Fi), open `http://192.168.1.5:3000`.
4. If Windows asks about the firewall, click **Allow** for private networks.
5. Limits: this is plain http, so **voice input, Install and WhatsApp share won't work**. Use Option 1 for the full experience.

### Option 3: Chrome on the laptop pretending to be a phone (for screenshots/video)
Press F12 → click the phone icon (Toggle device toolbar) → pick "Pixel 7" or "iPhone 14".

---

## C. After deploying: 2-minute live check
`vercel.json` runs the server in **Mumbai (bom1)**, so SEBI, Yahoo and YouTube see an Indian visitor. Test these once on the live link:

| Test | Expected |
|---|---|
| Check a tip for **Reliance** | Company card shows today's price + 1-year range (Yahoo) |
| Learn → Alerts | Recent fraud headlines (SEBI RSS + Google News) |
| Profile/Check → search a small company | Results appear (NSE list / Yahoo search) |
| Tip with a SEBI number like `INH000000000` | "Checked on SEBI's website" (or a clear "couldn't reach SEBI") |
| A YouTube tip link | "Inside the video" card with timestamps (needs Gemini key) |
| Ask Saathi a question | AI answer (Gemini) |

If one source is down, the app says so on the result ("not checked") and still gives the other checks. It never shows a fake value.
