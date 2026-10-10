# Can I Take the Car? 🚗

A private two-person app: Hashim **requests** the car, Kiran **approves**, **rejects**, or **suggests another time**.

> **Going live as an APK with a free cloud server and push notifications: see [DEPLOY.md](DEPLOY.md).**

```
D:\CarReq
├── server/   Node + Express + libSQL/SQLite (Turso in the cloud) + Socket.IO + Expo Push
└── app/      Expo SDK 57 (React Native, TypeScript, Expo Router)            ← runs on your phone in Expo Go
```

## Run it locally

You need Node 22+ on the PC and **Expo Go** on both phones. The PC and both phones must be on the **same Wi‑Fi**.

**1. Set the two accounts** — edit `server/.env` (copied from `.env.example`) and change both passwords. The usernames and display names are set there too. No sign-up exists; these are the only two accounts. If you edit `.env`, restart the server and it syncs the accounts.

**2. Start the backend** (terminal 1):

```bash
cd server
npm install
npm start
```

It prints a `Network:` URL like `http://192.168.x.x:4000`. If Windows Firewall asks, allow Node on **private networks**.

**3. Start the app** (terminal 2):

```bash
cd app
npm install
npx expo start
```

Scan the QR code with the iPhone Camera app or with Expo Go on Android. The app finds the backend on its own: it uses the same PC address Expo Go loaded the app from, on port 4000. Don't use `--tunnel`. To point the app at a different server, set `EXPO_PUBLIC_API_URL=http://<host>:4000`.

**4. Sign in.** Sign in as the requester on one phone and the approver on the other. The app shows the correct interface for each role, and the role is enforced by the server.

## Useful commands

| Where | Command | What it does |
|---|---|---|
| server | `npm test` | Runs the full request lifecycle against a throwaway database, including auth, roles, validation, duplicates, idempotent retry, and realtime |
| server | `npm run reset-db` | Deletes all requests but keeps the two accounts |
| app | `npm run typecheck` | Runs the TypeScript check |

## How it works

- **Auth:** bcrypt-hashed passwords and a JWT kept in the phone's SecureStore, so you stay signed in. The server takes your role from the database on every call and every socket connection.
- **Authorization:** each endpoint checks the caller's role and that they're a party to the request. Every state change is a guarded transition (for example, `approve` works only `WHERE status = 'PENDING'`). The client gets no generic database access.
- **History:** `requested_date`, `requested_start_time`, and `requested_end_time` are written once and never changed. Alternative and final times live in their own columns.
- **No duplicates:** each submit carries a `clientRequestId`, so a retry after a dropped connection returns the original request instead of creating a new one. The server also rejects a second open request for the same date and exact time.
- **Realtime:** Socket.IO pushes every change to both users at once. When the app reconnects or comes back to the foreground, it re-syncs.

## Notifications: Expo Go vs a development build

Starting with SDK 53, **Expo Go can't receive remote push notifications** on Android or iOS. That's a platform limit, not something this app can fix. So the app works in two modes:

| | In Expo Go (now) | In a development build (later) |
|---|---|---|
| App open | Notification banner shown instantly through the realtime socket | Real push |
| App in background or closed | Shown the next time the app opens, as missed-change notifications | **Real push**, even when the app is closed |
| Tap a notification | Opens that request | Opens that request |

The server already sends real Expo pushes to any registered device. To turn on background push later:

```bash
cd app
npx eas-cli@latest init
npx eas-cli@latest build --profile development
```

`eas init` adds the `projectId` the app needs to get a push token. Install the build on the phones. For a dev build on Android that talks to a plain `http://` server, also add `expo-build-properties` with `android.usesCleartextTraffic: true`, or put the server behind HTTPS once it's in the cloud.

## Moving to the cloud later

- Deploy `server/` anywhere that runs Node 22. Keep `server/data/` on a persistent disk, or swap SQLite for Postgres; all the SQL is in `server/src/db.js` and `server/src/requests.js`.
- Set `JWT_SECRET` and the account passwords as environment variables.
- Build the app with `EXPO_PUBLIC_API_URL=https://your-server`.
