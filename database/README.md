# FERROVIA Oracle Database

Run on a fresh Oracle schema:

1. `schema-current.sql`
2. `seed-demo.sql`

The schema contains 22 tables plus:
- `VW_LIVE_TRAIN_STATUS`
- `VW_TRAINSET_STATUS`

Core operational tables:
- `ROUTES`
- `ROUTE_STOPS`
- `TRAINSETS`
- `TRAINSET_ASSIGNMENTS`
- `TRIP_STOPS`
- `SEATS`
- `TRIP_SEATS`
- `SEAT_RESERVATIONS`

`ROUTE_STOPS` stores the fixed route timetable; `TRIP_STOPS` stores actual station events for each dated trip. No latitude/longitude/GPS table is required.

`VW_LIVE_TRAIN_STATUS` derives last station left, last departure timestamp, current delay, next station and spare-trigger state.

The demo seed creates Suborno Express with UP (Dhaka -> Chattogram) and DOWN (Chattogram -> Dhaka) route templates, three physical trainsets and an operator/admin account.
