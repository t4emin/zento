# Zento Phase 2 Backend Plan

## Goal

Phase 2 moves Zento from a single-browser, localStorage-backed MVP into a backend-driven application with:

- persistent menu and order data
- real staff sessions
- shared state across devices
- a clean migration path that does not break the existing playable MVP too early

This plan assumes the current MVP remains the reference flow during migration:

1. `/login`
2. `/dashboard`
3. `/dashboard/menu`
4. `/dashboard/tables`
5. `/r/demo/table/T01`
6. customer submits order
7. `/dashboard/orders`

## Current localStorage data flow

## Current storage keys

The MVP currently stores browser-local demo state using:

```text
zento.demo.menu
zento.demo.orders
zento.demo.session
```

## Current menu flow

Current source files:
- `lib/demo-data.js`
- `lib/demo-storage.js`
- `components/dashboard/MenuManager.js`

Flow:
1. `seedDemoData()` provides starter menu data when storage is empty.
2. `MenuManager` reads menu items through `seedDemoData().menuItems`.
3. Add/edit/delete operations update local React state.
4. Updated menu arrays are persisted with `saveMenuItems(items)`.
5. Customer ordering later reads the same localStorage menu data.

Implication:
- Menu changes exist only in the current browser.
- Another device or browser will not see them.

## Current order flow

Current source files:
- `components/customer/CustomerMenu.js`
- `components/orders/OrdersQueue.js`
- `lib/demo-storage.js`

Flow:
1. Customer menu reads available items from localStorage.
2. Customer builds a client-side cart in component state.
3. On submit, the UI creates an order object with:
   - `id`
   - `restaurantSlug`
   - `tableCode`
   - `items`
   - `total`
   - `status`
   - `createdAt`
4. The order is appended to `zento.demo.orders` via `saveOrders(...)`.
5. `/dashboard/orders` reads all orders from localStorage with `getOrders()`.
6. Staff status changes update the stored order array in localStorage.

Implication:
- Orders are shared only inside the same browser storage context.
- There is no server source of truth.
- No concurrency handling exists.

## Current login flow

Current source files:
- `app/login/page.js`
- `lib/demo-storage.js`

Flow:
1. Login page seeds demo data.
2. Login page writes `zento.demo.session` to localStorage.
3. Login redirects to `/dashboard`.

Implication:
- There is no real authentication.
- Login state is client-only and trivially mutable.

## Proposed database schema

## Recommended database type

Use a relational database.

Why:
- restaurants, tables, menu items, orders, and order items are naturally relational
- staff access and restaurant scoping need clean foreign-key boundaries
- order history benefits from normalized storage plus snapshot fields

## Core tables

### `restaurants`

Fields:
- `id`
- `slug` unique
- `name`
- `created_at`
- `updated_at`

Purpose:
- top-level tenant container

### `users`

Fields:
- `id`
- `restaurant_id`
- `email` unique within auth provider scope
- `name`
- `role`
- `password_hash` if using credentials auth
- `created_at`
- `updated_at`

Suggested roles:
- `owner`
- `manager`
- `staff`

Purpose:
- staff login and restaurant-scoped access

### `tables`

Fields:
- `id`
- `restaurant_id`
- `code`
- `label`
- `is_active`
- `created_at`
- `updated_at`

Constraint:
- unique on `(restaurant_id, code)`

Purpose:
- customer ordering target

### `menu_items`

Fields:
- `id`
- `restaurant_id`
- `name`
- `description`
- `price`
- `category`
- `is_available`
- `sort_order` optional
- `created_at`
- `updated_at`

Purpose:
- admin-managed orderable menu

### `orders`

Fields:
- `id`
- `restaurant_id`
- `table_id`
- `status`
- `total_amount`
- `source`
- `created_at`
- `updated_at`

Suggested `source` values:
- `qr`
- `staff`

Suggested `status` values:
- `new`
- `preparing`
- `served`
- `cancelled`

Purpose:
- top-level order record

### `order_items`

Fields:
- `id`
- `order_id`
- `menu_item_id` nullable if item later deleted
- `item_name_snapshot`
- `unit_price_snapshot`
- `quantity`
- `line_total`

Purpose:
- immutable line items for historical accuracy

## Optional near-term tables

### `restaurant_settings`

Fields:
- `restaurant_id`
- `currency`
- `timezone`
- `created_at`
- `updated_at`

Purpose:
- later support for formatting and configuration

### `sessions`

Only if auth strategy requires database-backed sessions.

## API routes needed

Keep the first backend API small and aligned to the current MVP.

## Auth routes

Suggested:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/session
```

Responsibilities:
- authenticate staff
- return restaurant-scoped staff session
- support dashboard gating

## Menu routes

Suggested:

```text
GET    /api/menu
POST   /api/menu
PATCH  /api/menu/[id]
DELETE /api/menu/[id]
```

Responsibilities:
- list menu items for dashboard and customer routes
- create menu items
- update menu items
- delete menu items

Notes:
- `GET /api/menu` should support filtering by restaurant and optionally `availableOnly=true`

## Table routes

Suggested:

```text
GET /api/tables
GET /api/tables/[code]
```

Responsibilities:
- provide dashboard table list
- validate that a table exists for a restaurant

## Order routes

Suggested:

```text
GET   /api/orders
POST  /api/orders
PATCH /api/orders/[id]
```

Responsibilities:
- list staff-visible orders, newest first
- create customer orders
- update order status

Notes:
- `GET /api/orders` should be staff-only
- `POST /api/orders` should be public for customer table ordering, but restaurant/table scoped

## Public customer routes support

Customer pages should eventually fetch:

```text
GET /api/public/restaurants/[slug]/tables/[code]/menu
POST /api/public/restaurants/[slug]/tables/[code]/orders
```

Reason:
- keep public QR traffic separate from staff-admin API routes
- reduce accidental exposure of admin-only resources

## Auth approach

## Recommended Phase 2 auth

Add real staff authentication for dashboard routes only.

Do not require customer auth for QR ordering.

## Suggested auth model

Phase 2 recommendation:
- email + password for staff
- session cookie authentication
- restaurant-scoped session payload

Session should minimally include:
- `userId`
- `restaurantId`
- `role`

## Route protection

Protect:
- `/dashboard`
- `/dashboard/menu`
- `/dashboard/tables`
- `/dashboard/orders`
- all staff/admin API routes

Do not protect:
- `/`
- `/r/[restaurantSlug]/table/[tableCode]`
- public order submission route

## Auth migration note

The current `zento.demo.session` localStorage flag should not survive into real auth.

Instead:
- use server-verified session state
- treat current localStorage login only as a temporary MVP convenience

## Migration steps from localStorage to backend

The safest migration is staged, not all-at-once.

## Stage 1: Introduce backend read models

Goal:
- add database and API routes without immediately removing localStorage code

Steps:
1. add schema and migrations
2. seed one restaurant (`demo`) and tables (`T01`, `T02`, `T03`)
3. seed starter menu items in the database
4. create menu/table/order API routes
5. keep current UI untouched while backend is validated

## Stage 2: Migrate dashboard reads

Goal:
- make dashboard pages read from backend first

Steps:
1. update `/dashboard/menu` to fetch menu items from API
2. update `/dashboard/tables` to fetch tables from API
3. update `/dashboard/orders` to fetch orders from API
4. keep local mutations disabled or behind a fallback until writes are ready

Why:
- reads are lower risk than writes
- easier to verify data shape parity

## Stage 3: Migrate dashboard writes

Goal:
- move menu CRUD and order status updates off localStorage

Steps:
1. replace `saveMenuItems()` usage in dashboard with API calls
2. replace order status persistence with `PATCH /api/orders/[id]`
3. keep optimistic UI only after server response handling is stable

## Stage 4: Migrate customer ordering writes

Goal:
- move order submission to backend

Steps:
1. fetch available menu items from public API route
2. replace `saveOrders()` order append with `POST /api/public/.../orders`
3. keep cart local in client state; only submitted orders need server persistence

## Stage 5: Add real staff auth

Goal:
- protect dashboard and admin routes

Steps:
1. implement login API and session handling
2. replace localStorage demo login on `/login`
3. gate dashboard routes by session
4. gate admin API routes by restaurant-scoped user session

## Stage 6: Remove localStorage as source of truth

Goal:
- localStorage becomes optional UI cache only, or is removed

Steps:
1. delete demo menu/order persistence helpers or restrict them to development-only fallback
2. remove `zento.demo.session` auth behavior
3. update docs and tests to reflect backend-first flow

## Risk list

## 1. Data model mismatch risk

Current order shape is client-defined and lightweight.

Risk:
- backend schema may diverge from current UI assumptions

Mitigation:
- define explicit request/response contracts before changing UI fetch/save logic

## 2. LocalStorage-to-database parity risk

Current menu and order flows assume array replacement semantics.

Risk:
- backend operations are record-level and asynchronous

Mitigation:
- migrate reads first, then writes
- keep helper adapters during transition

## 3. Auth sequencing risk

Adding auth too early can slow backend migration.

Risk:
- route protection blocks ongoing MVP verification

Mitigation:
- add backend data routes first
- add real auth after core data flow is stable

## 4. Public order submission risk

Customer order submission must remain easy, but not expose admin APIs.

Risk:
- using the same admin routes for public QR traffic increases security risk

Mitigation:
- separate public order endpoints from staff/admin endpoints

## 5. Restaurant scoping risk

The current MVP is hard-coded to `demo`.

Risk:
- backend work may accidentally omit restaurant scoping and create future multi-tenant leaks

Mitigation:
- include `restaurant_id` in every relevant table from day one
- enforce restaurant scoping in queries and sessions

## 6. Real-time expectation risk

Today the queue works because localStorage is synchronous in one browser.

Risk:
- once backend-backed, staff may expect instant updates across devices

Mitigation:
- first ship refresh-based or poll-based updates
- defer realtime sockets/events until after correctness is proven

## 7. Historical order integrity risk

Menu items can change after orders are placed.

Risk:
- old orders become inaccurate if they depend on live menu item records

Mitigation:
- store name and price snapshots in `order_items`

## Implementation order

Recommended order:

1. Add database schema and migrations
2. Seed demo restaurant, tables, and starter menu into the database
3. Add backend menu/table/order read APIs
4. Switch dashboard pages to backend reads
5. Add backend write APIs for menu CRUD and order status
6. Switch dashboard writes from localStorage to API
7. Add public customer order submission API
8. Switch customer order submission from localStorage to API
9. Add real staff login/session auth
10. Protect dashboard routes and admin APIs
11. Remove localStorage as source of truth
12. Add polling or realtime enhancements only after the backend flow is stable

## Recommended acceptance criteria for Phase 2

Phase 2 is complete when:

- menu data is stored in the database
- orders are stored in the database
- staff sessions are server-authenticated
- dashboard routes are protected
- customer order submission writes to backend
- staff order status changes persist to backend
- the app no longer depends on browser-localStorage as the main source of truth

## Non-goals for the first backend migration

Do not treat these as Phase 2 blockers:

- payments
- kitchen printer integration
- advanced analytics
- multi-restaurant admin UI
- websocket realtime
- role/permission granularity beyond basic staff access
