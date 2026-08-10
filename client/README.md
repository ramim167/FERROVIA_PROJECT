# FERROVIA React Client

React 19 + Vite frontend for the FERROVIA Oracle railway project.

## Run

```bash
npm install
npm run dev
```

Default URL: `http://localhost:5173`

The Vite development server proxies `/api` requests to `http://localhost:5000`, so start the Express backend separately.

## Main UI areas
- Home / Book Ticket
- Track Train
- Dashboard / My Tickets / Notifications
- Operator console for OPERATOR/ADMIN
- Admin operations for ADMIN

This client no longer uses mock train/booking/localStorage data for core flows. LocalStorage is used only for the JWT/user session cache and saved-train favorites.
