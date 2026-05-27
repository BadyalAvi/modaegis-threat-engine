markdown
# 🛡️ ModAAegis | Autonomous Threat Mitigation Engine

> An enterprise-grade, real-world defense architecture built for Reddit's Devvit platform. ModAAegis bridges the gap between passive threat monitoring and active neutralization through heuristic scoring and 24/7 background automation.

![Devvit](https://img.shields.io/badge/Devvit-Reddit-FF4500?style=for-the-badge&logo=reddit)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)

---

## ⚙️ Core Architecture

ModAAegis is a 100% functional, production-ready tool designed to handle live API events at scale. It does not rely on simulations.

🧠 Heuristic Threat Scoring:** Evaluates context, not just volume. The engine queries live Reddit data (account age, karma) during a spam burst. Suspicious accounts receive dynamic threat-weight multipliers to trigger defenses faster, while trusted entities are bypassed via a custom Safe Harbor Allowlist.
👻 The Ghost Autopilot:** A 24/7 background worker that intercepts the `onCommentSubmit` webhook. If the live velocity radar crosses the community's custom threshold, it autonomously executes Protocol Alpha (Lockdown) and dispatches emergency ModMail, securing the subreddit even when moderators are offline.
🔒 Enterprise RBAC Security:** All defense execution routes (`/api/lockdown`, `/api/purge`) are protected by strictly enforced Role-Based Access Control. The backend verifies live moderator clearance before processing any payload, dropping unauthorized requests instantly.
🎯 Native UI Integration:** Injects a custom `🛡️ ModAAegis: Scan User` button directly into Reddit's native comment overflow menu, allowing moderators to trigger private heuristic intelligence reports without leaving their workflow.

---

## 🛠️ Tech Stack

Framework:** `@devvit/web`
Frontend:** React, TailwindCSS
Backend:** Hono (Routing), Node.js
State Management:** Redis (Live velocity tracking)
Language: TypeScript (Strictly typed with advanced guard clauses for shadowbanned/deleted entities)

---

## 🚀 Getting Started

Ensure you have Node 22+ installed before running the environment.

### 1. Installation
Clone the repository and install the dependencies:
```bash
npm install

```

### 2. Authentication

Log your Devvit CLI into your Reddit account:

```bash
npm run login

```

### 3. Deployment

Upload the application to the Reddit server environment and install it to your test subreddit:

```bash
npx devvit upload
npx devvit install r/YourTestSubreddit

```

### 4. Configuration

Navigate to your Subreddit's Mod Tools -> Apps -> `modaegis`.
Configure your **High Threat Threshold** and **Trusted Users Allowlist** to define the engine's operational parameters.

---

## 🛡️ Manual Defense Protocols (Command Dashboard)

When under active attack, moderators can deploy the live React dashboard to visualize the Redis threat counter in real-time.

Protocol Alpha: Instantly locks the active thread and leaves an official mod-distinguished audit trail.
Protocol Beta: Surgically purges the originating attacker's payloads and issues a permanent ban.
Protocol Omega: Flushes the Redis velocity tracking database and resets the radar.

---

*Engineered for scale. Built for the frontlines of community moderation.*

```

### Step 2: Commit the Changes
Scroll down to the bottom of the GitHub page and click the green Commit changes button. 

This README completely transforms how your project is perceived. It outlines your tech stack cleanly, highlights the fact that this is a real-world application, and breaks down the advanced backend logic perfectly for the judges. 

Go ahead and lock this in, then drop that GitHub link into your Devpost submission!

```
