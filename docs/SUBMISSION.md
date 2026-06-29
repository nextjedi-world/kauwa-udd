# Kauwa Udd — Devpost Submission Copy

Paste-ready content for the H0 submission form. Live app: **https://kauwa-udd.vercel.app**

---

## Elevator pitch (tagline)
**Hold. Release. React. — the childhood game "Kauwa Udd" reborn as a real-time, multiplayer, globally-localized party game on Vercel + Amazon DynamoDB.**

(Alt: *Digitizing the world's childhood games — starting with Kauwa Udd, a real-time reaction game built to scale to millions of players.*)

---

## Which database did you use?
**Amazon DynamoDB** — single-table design, connected to Vercel via the AWS Databases integration using **OIDC (no stored keys)**, with a GSI for leaderboards.

---

## Published Vercel link
https://kauwa-udd.vercel.app

## Vercel Team ID
`team_k8bQ2AVEblmydFTZjvprpfuA`

---

## Built with
`next.js` `react` `typescript` `tailwindcss` `shadcn-ui` `framer-motion` `vercel` `v0` `vercel-workflow` `vercel-oidc` `amazon-dynamodb` `aws-sdk` `ably` `auth.js` `web-audio-api` `web-speech-api` `pwa`

---

## About the project (Markdown)

### 🐦 Inspiration
**"Kauwa udd! Kabootar udd! ... Sher udd!"** Every kid who grew up in India knows this game — a caller shouts out things, you raise a finger for anything that flies (crow, pigeon), and you're out if you get tricked into raising for something that can't (a lion!). It's pure, joyful, instant reaction.

We wanted to **digitize and globalize the world's childhood games** — starting with Kauwa Udd — so anyone, anywhere, can play the games we grew up with, in their own language, with friends across the room or across the planet.

### 🎮 What it does
Kauwa Udd is a real-time multiplayer reaction game:
- **Hold. Release. React.** — everyone holds a button; each round an object is announced (by AI voice or image). **Release if it flies, keep holding if it can't.** 3-second window. Fastest correct reactions score; wrong moves get penalized.
- **Rooms** — create a room, share a link, friends join from any device. A synchronized **hold-to-ready** countdown starts everyone together.
- **Solo vs AI** — practice mode with configurable rounds, language, and announce style.
- **Localized** — every object is translated across languages; play in your own language, or pick a foreign one to *learn vocabulary while you play*.
- **Leaderboards** — global daily/weekly plus a **public per-room leaderboard** you can share.
- **Modes** — Classic (points) and Elimination.

### 🏗️ How we built it
- **Frontend:** scaffolded with **Vercel v0**, then built out as a **Next.js 16 / React 19** PWA (Tailwind 4, shadcn/ui, Framer Motion), deployed on **Vercel**.
- **Database:** **Amazon DynamoDB**, single-table design, connected through the **Vercel ↔ AWS integration** using **OIDC** — the app assumes an IAM role at runtime, so **no AWS keys are ever stored**. A GSI powers top-N leaderboards.
- **Authoritative game loop:** a **Vercel Workflow (durable function)** runs *per room* — it picks objects, opens the 3-second window, collects reactions, ranks 1st/2nd/3rd, applies scoring/elimination, and is crash-safe across the whole match.
- **Realtime:** **Ably** channels + presence push round events and live scores to every player; reactions are recorded server-side for authoritative, cheat-resistant scoring.
- **Auth:** **Auth.js** with guest play (zero-friction, no login needed to play).
- **Polish:** synthesized **Web Audio** sound effects (license-free), **Web Speech** TTS for voice announcements, full PWA.

### 📈 Architecture & scale ("million-scale global app")
The architecture is **sharded by room**: each live game is *one independent Vercel Workflow + one Ably channel + one DynamoDB partition*. There is no central bottleneck — millions of concurrent players simply means millions of independent rooms. DynamoDB's serverless, single-digit-millisecond, horizontally-scaling model (with Global Tables for multi-region) makes this the same architecture at 5 players or 5 million. (A roadmap layer adds Aurora DSQL for exact-rank analytics.)

### 🧗 Challenges we ran into
- **Server-authoritative realtime on serverless:** keeping scoring fair and crash-safe without a stateful server — solved with a durable **Vercel Workflow per room** + DynamoDB as the reaction buffer.
- **Ably auth:** a subtle `clientId`/token-encoding bug stopped realtime from connecting; fixed by hardening the token endpoint and connection.
- **DynamoDB without stored keys:** wiring **OIDC** so production assumes an IAM role — secure and key-free.
- **The hold/release feel:** making a physical playground mechanic intuitive on a touchscreen, with a synchronized hold-to-ready start so everyone reacts at the same instant.

### 🎓 What we learned
Durable workflows make "stateful" real-time game logic possible on serverless; DynamoDB single-table + OIDC is a genuinely production-grade, key-free data layer; and a tiny, focused mechanic (one button) plus localization can turn a local folk game into something globally playable.

### ▶️ What's next
More childhood games as content packs, native mobile share, ranked seasons, and exact-rank analytics on Aurora DSQL.

---

## Testing Instructions for Judges (not public)
**No login required — guest play by default.**
1. Open **https://kauwa-udd.vercel.app**.
2. **Solo:** tap **Play Solo** → adjust settings → Start → press & **hold** the button; **release** when the object flies, keep holding if it can't.
3. **Multiplayer:** tap **Create Room** → use **Copy/Share** to send the link → open it in a second browser/device (or incognito) → both **Hold to get ready** → play together; scores sync live.
4. **Leaderboards:** tap **Ranks** (global) or open a room's public leaderboard via the share link.
5. Try **Voice vs Visual** announce mode and different **languages** in settings.

AWS database: **Amazon DynamoDB** (see architecture diagram + Storage/console screenshot).
