# Railway Ticket Platform

Professional React/Vite railway e-ticket semester-project demo with an Express/Oracle-ready backend skeleton.

## Implemented in the frontend
- Responsive landing page and train search
- Train result cards and class selection
- Interactive seat selection with seat limits
- Multiple passenger forms
- Demo payment flow and fare summary
- Generated PNR and printable ticket
- My Tickets with persistent localStorage data
- Ticket cancellation status
- Sign-in/register demo modal
- Support/FAQ form

## Run frontend
```bash
cd client
npm install
npm run dev
```
Open the local URL shown by Vite.

## Run backend skeleton
```bash
cd server
npm install
copy .env.example .env
npm run dev
```

## Oracle integration note
The UI is fully functional with mock/local data. Real authentication, live seat locking, payments, refunds and Oracle persistence require the backend routes to be connected to your Oracle database credentials and final schema. Keep API responses stable so future tables can be added without rewriting the UI.

## Railway Nexus UI/UX Renewal

The renewed client includes:
- Premium navy/emerald visual system with warm signal accents
- Floating glass navigation and responsive mobile menu
- New personal travel dashboard with booking metrics and next-journey focus
- Refined homepage hero, search surfaces, cards, motion and accessibility states
- Existing search, class selection, seat selection, passenger, payment and ticket flows preserved
- Browser-local demo persistence for users, favorites and bookings

### Run the renewed client
```bash
cd client
npm install
npm run dev
```
