# SWIFTORA – Rider App + Live Tracking (Ponnanna)

React + TypeScript + Vite. Runs on its own with demo data, and is built to plug into the team's shared database.

## 1. Run it on your laptop
1. Install **Node.js (LTS)** from nodejs.org and **Git** from git-scm.com. Open this folder in **VS Code**.
2. Open the VS Code terminal (Ctrl + `) and run:
   ```
   npm install
   npm run dev
   ```
3. Open the link it prints (http://localhost:5173). It redirects to `/rider`.
4. Try it: toggle **Online** → accept an order → **Confirm pickup** → **Start delivery** → **Mark delivered**.
   On the Navigate page press **Start demo ride** to move the rider. Open the **Customer tracking link**
   (from the Orders page) in a second tab to see it update live.

## 2. Google Maps key (needed for the real map)
1. Go to console.cloud.google.com → create a project → **APIs & Services → Library**.
2. Enable **Maps JavaScript API** and **Directions API**. Create an API key under **Credentials**
   (billing must be enabled; Google gives free monthly credit).
3. Copy `.env.example` to `.env` and paste the key after `VITE_GOOGLE_MAPS_API_KEY=`. Restart `npm run dev`.
Without a key the app still works and shows a placeholder with straight-line distance.

## 3. GitHub, step by step (first time)
**One-time setup**
```
git config --global user.name  "Your Name"
git config --global user.email "you@example.com"
```
**Get the team repo** (Person 4 / team lead shares the URL)
```
git clone https://github.com/TEAM/REPO.git
cd REPO
git checkout -b feature/rider-app
```
**Add this rider code** – copy the contents of `src/` from this project into the repo's `src/`
(keep the folders `pages/rider`, `components/shared`, `layouts/RiderLayout.tsx`, `services/orders.ts`,
`services/tracking.ts`, `services/db.ts`, `hooks`, `lib`). If `App.tsx`, `types/index.ts` or `index.css`
already exist, DON'T overwrite them: merge the rider routes / types / styles into the existing ones,
and install the extra packages:
```
npm install react-router-dom @react-google-maps/api lucide-react
npm install -D @types/google.maps
```
**Save your work (do this often)**
```
git status                      # see what changed
git add .
git commit -m "feat: rider dashboard and live tracking"
git push -u origin feature/rider-app     # first push; later just: git push
```
**Open a Pull Request**: on github.com open the repo → yellow banner "Compare & pull request" →
set base to the `integration` branch (or `main` if told) → Create pull request. Person 4 reviews and merges.

**Get teammates' latest changes**
```
git checkout main
git pull
git checkout feature/rider-app
git merge main
```
If Git reports a conflict, open the file in VS Code, choose **Accept Current / Incoming / Both**, save,
then `git add .` and `git commit`. Never work directly on `main`.

## 4. Connecting to the real database (hand-off to Person 4)
Only two files talk to storage: `src/services/orders.ts` and `src/services/tracking.ts`
(demo storage lives in `db.ts`). Keep the function names and replace the bodies with Supabase calls:
`getOrders`, `getOffers`, `acceptOrder`, `updateOrderStatus`, `getRider`, `setOnline`, `updateRiderLocation`.
The `useLive` hook should then subscribe to Supabase real-time instead of the browser storage events.
Status rules (rider may only go accepted → picked_up → on_the_way → delivered) must also be enforced server-side.
