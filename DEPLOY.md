# Going live (free) — APK + cloud server

```
 Hashim's phone (APK) ──HTTPS / websocket──▶  Render (free)  ──▶  Turso (free DB)
        ▲                                         │
        └──── push notification ◀── Expo Push ◀───┘──▶ push ──▶ Kiran's phone (APK)
                                     (uses Firebase FCM, free)
```

Everything here is on a **free plan, no credit card**:

| Service | Used for | Free plan |
|---|---|---|
| [Turso](https://turso.tech) | Database | 5 GB, 100 databases |
| [Render](https://render.com) | Backend server | 750 h/month web service; sleeps after 15 min idle |
| [Firebase](https://console.firebase.google.com) | Android push delivery (FCM) | free |
| [Expo / EAS](https://expo.dev) | Builds the APK, sends pushes | 15 Android builds/month |
| [GitHub](https://github.com) | Hosts the code so Render can deploy it | free private repo |
| [cron-job.org](https://cron-job.org) *(optional)* | Keeps the server awake | free |

Plan on about 45 minutes the first time. The sections below go in order.

---

## 1. Database: Turso

1. Sign up at **turso.tech**. Signing in with GitHub is easiest.
2. **Create Database** → name it `carreq` → pick the region closest to you (for example *AWS ap-south-1 Mumbai*).
3. On the database page, copy:
   - the **URL**, which looks like `libsql://carreq-<you>.turso.io`
   - a new **token**: **Create Token** → *Read & Write* → copy it.

Keep both values; you'll paste them into Render in step 3.

## 2. Put the code on GitHub

Create a **private**, empty repo on github.com (for example `carreq`). Then, from `D:\CarReq`:

```bash
git init -b main
```
```bash
git add .
```
```bash
git commit -m "Can I Take the Car? app + server"
```
```bash
git remote add origin https://github.com/<your-username>/carreq.git
```
```bash
git push -u origin main
```

`server/.env`, the local database and Firebase private keys are git-ignored, so no passwords get uploaded.

## 3. Server: Render

1. Sign up at **render.com** with GitHub.
2. **New + → Blueprint** → choose the `carreq` repo. Render reads `render.yaml`.
3. It asks for the secret values:
   - `TURSO_DATABASE_URL` → the `libsql://…` URL from step 1
   - `TURSO_AUTH_TOKEN` → the token from step 1
   - `REQUESTER_PASSWORD` → Hashim's password
   - `APPROVER_PASSWORD` → Kiran's password
4. **Apply**. When the deploy goes green, open `https://<service>.onrender.com/health`. It should show `{"ok":true}`.

The service is named `carreq-server`, so its URL is usually `https://carreq-server.onrender.com`. **If Render gives it a different URL**, put that URL in `app/eas.json` under `EXPO_PUBLIC_API_URL`.

### Optional: keep it awake

On the free plan Render sleeps after 15 minutes without traffic. The first action after that takes up to a minute, and the app shows "Waking up the server…" while it waits. To avoid the wait, create a free job at **cron-job.org** that opens `https://carreq-server.onrender.com/health` **every 10 minutes**. One always-on service uses about 744 of the 750 free hours a month.

Push notifications are delivered by Expo and Firebase, so they don't depend on the server being awake. A request does wake the server up.

## 4. Push: Firebase

1. **console.firebase.google.com** → **Add project** → `carreq` (Analytics not needed).
2. **Add app → Android**:
   - Package name: **`com.family.canitakethecar`** (it must match exactly)
   - **Download `google-services.json`** → put it in **`D:\CarReq\app\google-services.json`**
3. **Project settings → Service accounts → Generate new private key**. Save the JSON file somewhere *outside* the repo (for example your Downloads folder). You'll upload it to Expo in step 5. Don't commit it.

## 5. Build the APK: Expo EAS

Create a free account at **expo.dev**, then from `D:\CarReq\app`:

```bash
npx eas-cli@latest login
```
```bash
npx eas-cli@latest init
```

`init` links the project and adds its `projectId` to `app.json`. The app needs that ID to get a push token.

Upload the Firebase key from step 4.3:

```bash
npx eas-cli@latest credentials -p android
```

Choose the **preview** profile → **Google Service Account** → **Manage your Google Service Account Key for Push Notifications (FCM V1)** → **Set up** → select the JSON file. (Or upload it on expo.dev → Project → Credentials → Android → FCM V1 service account key.)

Build:

```bash
npx eas-cli@latest build -p android --profile preview
```

Say **yes** when it offers to generate an Android keystore. The build runs in the cloud, usually 10–20 minutes on the free queue. When it finishes you get a **link and QR code to download the `.apk`**.

## 6. Install on both phones

1. Open the build link on each Android phone and download the APK.
2. When Android asks, allow your browser or file manager to **install unknown apps**.
3. Open **Can I Take the Car?** and sign in: Hashim on his phone, Kiran on his.
4. When asked, **allow notifications**. That registers the phone for push.

Test it: send a request from Hashim's phone with Kiran's app closed. Kiran gets a push, and Hashim gets one back when Kiran responds.

---

## Updating later

| Change | What to do |
|---|---|
| Server code | `git push`, and Render redeploys automatically |
| Passwords / names | Change them in Render → Environment; the server re-syncs the accounts on restart |
| App code | Run the `eas build … --profile preview` command again and install the new APK over the old one (sign-in is kept) |

## Notes

- **Android only.** An APK can't be installed on an iPhone. iPhone builds need a paid Apple developer account.
- **Timezone.** "Today" and "past date" are judged in `Asia/Karachi` (`TZ` in `render.yaml`). Change it there if needed.
- **Local development still works.** Without `TURSO_DATABASE_URL` the server uses a local SQLite file, and `npx expo start` with Expo Go talks to your PC as before.
