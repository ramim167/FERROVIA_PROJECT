# FERROVIA / Railway Nexus

Full-stack railway e-ticketing + operational tracking semester project.

## Stack
- **Frontend:** React 19 + Vite (`client/`)
- **Backend:** Node.js + Express (`server/`)
- **Database:** Oracle (`database/`)

The latest frontend design from `Railway_us_2.zip` is preserved and is now connected to the Express/Oracle backend.

## Core model
- `TRAINS` = public service, e.g. **Suborno Express**
- `TRAINSETS` = physical rakes, e.g. **SUB-01 / SUB-02 / SUB-03**
- `ROUTES` = UP/DOWN route templates
- `TRIPS` = one dated run
- `ROUTE_STOPS` = fixed public timetable template
- `TRIP_STOPS` = actual dated station events
- `SEAT_RESERVATIONS` = segment-wise seat occupancy/holds

## Live tracking (no GPS)
An assigned operator uses the web Operator console and presses **Arrived** / **Departed**. The backend stores Oracle `SYSTIMESTAMP`. Passenger Track Train then shows:
- last station left
- actual departure time
- current delay at that last departed station
- next station
- original scheduled time
- whether spare rotation was triggered

The public timetable is never shifted because of delay.

## 60-minute spare rotation
Demo service threshold is 60 minutes.
1. Current trainset continues its current journey even after threshold.
2. When any marked departure reaches threshold, the destination-terminal SPARE is reserved for the next opposite trip.
3. The delayed train finishes at the destination and becomes the new SPARE there.
4. The previously spare trainset becomes ACTIVE when the next trip departs.
5. If threshold is never reached, the current trainset is normally reserved for the next opposite trip.

Recommended demo fleet for one two-terminal service: one operating trainset + one spare at each terminal (3 total).

## Database setup
Run in a **fresh FERROVIA Oracle schema**:

```text
database/schema-current.sql
database/seed-demo.sql
```

The seed creates Suborno Express UP/DOWN, three trainsets, stations, classes, fares, seats and current demo trips.

Demo accounts:

```text
Operator: operator@ferrovia.local / Operator123!
Admin:    admin@ferrovia.local    / Admin123!
```

Passengers register from the website.

## Backend

```bash
cd server
npm install
```

Create `.env` from `.env.example`, set Oracle connection details and JWT secret, then:

```bash
npm run dev
```

Backend: `http://localhost:5000`
Health: `http://localhost:5000/api/health`

## Frontend

Open a second terminal:

```bash
cd client
npm install
npm run dev
```

Frontend: `http://localhost:5173`

Vite proxies `/api` to `http://localhost:5000`, so both processes must be running.

## Implemented frontend flows
- Oracle station dropdowns
- real dated train search
- UP/DOWN determined by route, not passenger input
- class availability + backend fare calculation
- segment-aware seat availability
- 10-minute database seat hold
- real passenger registration/login
- demo payment -> confirmed booking -> tickets
- My Tickets, cancellation and refund-request visibility
- database notifications
- Track Train by train code or numeric Trip ID
- Operator Arrived/Departed console
- live delay + last-station-left view
- automatic 60-minute spare reservation/rotation
- Admin route/trainset/trip/operator workspace

See `server/README.md` and `database/README.md` for details.
