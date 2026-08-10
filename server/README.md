# FERROVIA Backend

Express + Oracle backend aligned with `../database/schema-current.sql`.

## Environment

```env
PORT=5000
CLIENT_ORIGIN=http://localhost:5173
ORACLE_USER=FERROVIA
ORACLE_PASSWORD=change_me
ORACLE_CONNECTION_STRING=localhost:1521/XEPDB1
ORACLE_POOL_MIN=1
ORACLE_POOL_MAX=10
ORACLE_POOL_INCREMENT=1
JWT_SECRET=replace_with_a_long_random_secret
AUTH_TOKEN_TTL_SECONDS=604800
```

## Architecture

```text
routes -> controllers -> services -> repositories -> Oracle
```

Operational rules and multi-table transactions live in services; SQL is kept in repositories.

## Public APIs

```text
GET /api/health
GET /api/stations
GET /api/trains
GET /api/trains/search?from=Dhaka&to=Chattogram&date=YYYY-MM-DD
GET /api/trains/:trainCode/status
GET /api/trips/:tripId/status
GET /api/trips/:tripId/stops
GET /api/bookings/classes?tripId=...&sourceStationId=...&destinationStationId=...
GET /api/bookings/seats?tripId=...&sourceStationId=...&destinationStationId=...&classId=...
```

## Authentication

```text
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
```

JWT header:

```text
Authorization: Bearer <token>
```

## Booking
Authenticated PASSENGER / OPERATOR / ADMIN accounts may book.

```text
POST /api/bookings
GET  /api/bookings/mine
GET  /api/bookings/:pnr
POST /api/bookings/:pnr/pay
POST /api/bookings/:pnr/cancel
```

`POST /api/bookings` validates the segment/class/seat combination, computes fare from route distance + `FARE_RULES`, and creates a 10-minute `HELD` reservation. Payment confirms the booking and creates `TICKETS` + a notification. Cancelling a confirmed booking creates `REFUNDS` rows with `REQUESTED` status and a cancellation notification.

## Notifications

```text
GET   /api/notifications
PATCH /api/notifications/read-all
PATCH /api/notifications/:notificationId/read
```

## Operator
Requires OPERATOR or ADMIN. ADMIN can see all trips for the selected date; normal operators see their assigned trips.

```text
GET  /api/operator/trips?date=YYYY-MM-DD
GET  /api/operator/trips/:tripId
POST /api/operator/trips/:tripId/stops/:tripStopId/arrive
POST /api/operator/trips/:tripId/stops/:tripStopId/depart
```

Actual times come only from Oracle `SYSTIMESTAMP`. `depart` calculates delay against the fixed station schedule and automatically reserves a destination spare when the service threshold is reached. Final destination `arrive` completes the trip and rotates trainset state.

## Admin
Requires ADMIN.

```text
GET   /api/admin/routes
GET   /api/admin/trainsets?trainId=...
GET   /api/admin/operators
GET   /api/admin/trips?date=YYYY-MM-DD
POST  /api/admin/trips
PATCH /api/admin/trips/:tripId/operator
```

Creating a trip materializes `TRIP_STOPS` from `ROUTE_STOPS` and `TRIP_SEATS` from the service coach/seat layout. An optional initial SPARE trainset may be reserved if it is standing at the route source terminal.
