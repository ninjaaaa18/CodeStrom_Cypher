# SWIFTORA
### Rider App + Live Tracking
Deliver smarter. Track in real time.

## Overview
SWIFTORA is a browser-based rider experience for order fulfillment and customer visibility. Riders can go online, accept available deliveries, navigate to the store and customer location, and keep customers updated through a shared tracking link. The app is built as a polished frontend prototype with demo data and a lightweight live-update flow.

This repository focuses on the rider workflow and the public tracking state, making it easy to demo the end-to-end delivery journey in a single interface.

## Features
- Order offers and rider assignment flow
- Online/offline status toggle
- Delivery lifecycle management: accepted → picked_up → on_the_way → delivered
- Route visualization with Google Maps when a key is configured
- Fallback straight-line distance view when no map key is available
- Live customer tracking page with rider location updates
- Earnings and recent delivery summaries
- Local persistence through browser storage for demo data
- Demo route simulation for presentation without real GPS driving

## Screens and Modules
### Dashboard
The rider dashboard shows a quick summary of earnings, delivery count, distance covered, and the current active order. It also surfaces incoming offers and a clear call to action for navigation.

### Orders
The Orders screen lists available offers and the active delivery. Riders can accept an offer, progress through the status flow, and open the public customer tracking link from the same view.

### Navigation
The navigation screen shows the rider route, destination context, live progress, and the next action in the order lifecycle. It also includes a demo ride mode to simulate movement across the map.

### Customer Tracking
The public tracking page displays the rider's current status and route target, allowing the customer to follow the delivery without needing a rider dashboard.

### History and Earnings
The history and earnings sections summarize completed deliveries, payout totals, and weekly patterns for the rider.

## Live Tracking Flow
```text
Rider goes online
      ↓
Offer is accepted
      ↓
Navigate to store
      ↓
Confirm pickup
      ↓
Drive to customer
      ↓
Mark delivered
      ↓
Customer sees live status update
```

## Tech Stack
| Category | Stack |
| --- | --- |
| Frontend | React, TypeScript, Vite |
| Routing | React Router |
| Styling | CSS |
| UI Icons | Lucide React |
| Maps | Google Maps JavaScript API, @react-google-maps/api |
| Data storage | localStorage |
| Device APIs | Browser geolocation, WebRTC-style browser permission flow via geolocation-driven updates |

## Project Structure
```text
.
├── .env.example
├── README.md
├── index.html
├── package.json
├── package-lock.json
├── public/
├── src/
│   ├── App.tsx
│   ├── components/
│   │   └── shared/
│   │       ├── EarningsChart.tsx
│   │       ├── MapView.tsx
│   │       ├── NextAction.tsx
│   │       ├── OfferActions.tsx
│   │       ├── OnlineToggle.tsx
│   │       ├── OrderCard.tsx
│   │       ├── StatusBadge.tsx
│   │       └── Stepper.tsx
│   ├── hooks/
│   │   └── useLive.ts
│   ├── index.css
│   ├── layouts/
│   │   └── RiderLayout.tsx
│   ├── lib/
│   │   └── format.ts
│   ├── main.tsx
│   ├── pages/
│   │   ├── customer/
│   │   │   └── Tracking.tsx
│   │   └── rider/
│   │       ├── Dashboard.tsx
│   │       ├── Earnings.tsx
│   │       ├── History.tsx
│   │       ├── Navigation.tsx
│   │       └── Orders.tsx
│   ├── services/
│   │   ├── db.ts
│   │   ├── orders.ts
│   │   └── tracking.ts
│   └── types/
│       └── index.ts
├── tsconfig.json
├── vite.config.ts
└── .gitignore
```

## Application Routes
| Route | Purpose |
| --- | --- |
| `/` | Redirects to `/rider` |
| `/rider` | Rider dashboard |
| `/rider/orders` | Active delivery and available offers |
| `/rider/navigation` | Route planning and live movement |
| `/rider/history` | Past delivery history |
| `/rider/earnings` | Earnings and payout summary |
| `/track/:orderId` | Public customer tracking page |

## Getting Started
### Prerequisites
- Node.js LTS
- Git
- VS Code (recommended)

### Install and run locally
```bash
git clone https://github.com/ninjaaaa18/CodeStrom_Cypher.git
cd CodeStrom_Cypher
npm install
npm run dev
```
Then open the local Vite URL, usually `http://localhost:5173`.

### Google Maps setup
The app can run without a map key, but live Google Maps routing is enabled when you add one.

```bash
cp .env.example .env
```
Then add your key in `.env`:

```env
VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
```

## Available Scripts
| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run typecheck` | Run TypeScript checking |

## Privacy and Camera Notes
This project does not use the browser camera or any computer-vision pipeline. Rider position is sourced from the browser's geolocation APIs when available, and the app also includes a simulation mode to demonstrate movement without live driving. When no Google Maps API key is present, the app intentionally falls back to a straight-line distance preview instead of live routing.

## Current Limitations
- This is a hackathon-style prototype built around demo data and in-browser persistence.
- The app does not yet connect to a production backend, authentication flow, or persistent database.
- Order validation logic is implemented in the frontend demo layer rather than a server-enforced system.
- The map experience depends on a valid Google Maps key for live route rendering.

## Future Scope
- Real backend and live subscriptions for orders and rider location
- Authentication and role-based rider/customer access
- Payment and checkout integration for commerce workflows
- Inventory, order management, and dispatch dashboards
- ETA optimization and route intelligence
- Expanded analytics for rider productivity and customer experience

## Hackathon Value
This prototype demonstrates how a modern fulfillment workflow can combine rider operations, live status updates, and customer visibility in one interface. It is lightweight enough for rapid demos while still showing the core experience of accepting, navigating, and completing deliveries in real time.

## Team
CodeStorm
team members:
Sriniranjan 
Ponnanna O B
Hema S
Shivani S

## Repository
https://github.com/ninjaaaa18/CodeStrom_Cypher

## Closing
SWIFTORA
Deliver smarter. Track in real time.
