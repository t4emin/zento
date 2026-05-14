# Zento Project Status

## Overview

Zento is now a playable MVP for a QR ordering SaaS built with the Next.js App Router. The application supports the intended demo flow across login, dashboard management, table launch, customer ordering, and staff order review.

The current codebase is now backend-first. Dashboard and customer ordering flows read and write through backend APIs, staff access is protected by backend email/password authentication with a secure cookie session, and legacy localStorage fallback behavior has been removed.

## Current Project Structure

### Top-level structure

```text
app/
components/
docs/
prisma/
public/
styles/
package.json
next.config.mjs
jsconfig.json
eslint.config.mjs
.env.example
.env.production.example
AGENTS.md
```

### App Router structure

```text
app/
  layout.js
  page.js
  api/
    menu/route.js
    tables/route.js
    orders/route.js
    public/
      restaurants/[slug]/tables/[code]/menu/route.js
      restaurants/[slug]/tables/[code]/orders/route.js
  login/
    page.js
  dashboard/
    layout.js
    page.js
    menu/
      page.js
    orders/
      page.js
    tables/
      page.js
  r/
    [restaurantSlug]/
      table/
        [tableCode]/
          page.js
```

### Components

```text
components/
  layout/
    AppHeader.js
    AppSidebar.js
    DashboardShell.js
  dashboard/
    MenuManager.js
  customer/
    CustomerMenu.js
  orders/
    OrdersQueue.js
```

### Styles structure

```text
lib/
  prisma.js

prisma/
  schema.prisma
  seed.js
```

### Backend foundation

```text
styles/
  css/
    main.css
  less/
    main.less
    base/
      global.less
      reset.less
      variables.less
    components/
      button.less
      card.less
      form.less
    layout/
      dashboard.less
      header.less
      sidebar.less
    pages/
      customer.less
      dashboard.less
      home.less
      login.less
```

### Public/static files

```text
public/
  file.svg
  globe.svg
  next.svg
  vercel.svg
  window.svg
  static/
```

Notes:
- `public/static/` exists but is empty.
- No menu images, product assets, or QR demo assets exist yet.

## Existing App Routes

| Route | File | Current status |
| --- | --- | --- |
| `/` | `app/page.js` | Landing page with links to login and customer demo |
| `/login` | `app/login/page.js` | Real staff login backed by PostgreSQL users and a secure cookie session |
| `/dashboard` | `app/dashboard/page.js` | Functional dashboard home with admin entry cards |
| `/dashboard/menu` | `app/dashboard/menu/page.js` | Functional menu management screen |
| `/dashboard/orders` | `app/dashboard/orders/page.js` | Functional staff orders queue |
| `/dashboard/tables` | `app/dashboard/tables/page.js` | Functional demo tables launcher |
| `/r/[restaurantSlug]/table/[tableCode]` | `app/r/[restaurantSlug]/table/[tableCode]/page.js` | Functional customer ordering flow |

## Existing Components

### `components/layout/DashboardShell.js`

Purpose:
- Shared dashboard wrapper.
- Renders sidebar, header, and the dashboard content area.

Status:
- Valid layout shell.
- Static only.
- No state, no responsive behavior, no auth handling.

### `components/layout/AppSidebar.js`

Purpose:
- Renders dashboard navigation links.

Status:
- Links exist for Dashboard, Menu, Tables, Orders.
- No active link state.
- No restaurant context.

### `components/layout/AppHeader.js`

Purpose:
- Renders a static top bar for the dashboard.

Status:
- Pure placeholder.
- No session data, no demo controls, no page title context.

## Existing Styles Structure

### Intended styling direction

The intended project stack is:
- JavaScript only
- No TypeScript
- No Tailwind CSS
- Less compiled to CSS
- Global CSS imported from `@/styles/css/main.css`
- Mobile-first responsive UI

### Current styling reality

- Less is installed and wired in `package.json`.
- `styles/less/main.less` imports multiple Less partials.
- The Less partials now provide a basic visual foundation for the current scaffolded routes.
- `styles/css/main.css` is generated from the Less source tree.
- The root layout now imports `@/styles/css/main.css`.
- The previous manual `/static/css/main.css` link was removed.
- Unused starter CSS files from the default Next scaffold were removed.

## package.json Scripts

Current scripts:

```json
{
  "dev": "npm-run-all --parallel dev:next dev:less",
  "dev:next": "next dev",
  "dev:less": "node scripts/watch-less.js",
  "build": "lessc styles/less/main.less styles/css/main.css && next build",
  "postinstall": "prisma generate",
  "start": "next start",
  "lint": "eslint app components eslint.config.mjs next.config.mjs",
  "env:check": "node scripts/validate-env.js",
  "prisma:generate": "prisma generate",
  "prisma:migrate": "prisma migrate dev",
  "prisma:migrate:deploy": "prisma migrate deploy",
  "prisma:validate": "prisma validate",
  "prisma:seed": "prisma db seed"
}
```

Observations:
- The Less build command is present and compiles `styles/less/main.less` into `styles/css/main.css`.
- Development uses a local JS watcher script to keep compiled CSS updated while `next dev` runs.
- The lint command now uses the ESLint CLI workflow instead of `next lint`.
- The build compiles Less before running `next build`.
- Prisma and PostgreSQL foundation scripts now exist and are actively wired into the UI.
- Production env examples and env validation tooling now exist.

## Current Working Features

### Working route and layout scaffolding

- Root App Router layout exists.
- Dashboard has a nested layout.
- Dashboard pages render inside a shared shell.
- Homepage links to both staff and customer demo routes.
- Customer dynamic route resolves URL params and renders basic content.

### Working static UI pieces

- Login page authenticates against PostgreSQL and redirects into the dashboard.
- Dashboard sidebar and header render.
- Basic route navigation can be exercised because route files exist.
- Dashboard home now shows useful admin entry cards for Menu Management, Tables, and Orders.
- Dashboard menu now reads and writes through backend APIs only.
- Dashboard tables now reads through backend APIs only.
- Customer ordering now loads available menu data from the backend public API, keeps cart state locally in the component, and submits new orders to PostgreSQL.
- Dashboard orders now reads backend order data only.
- Dashboard orders status updates now use the backend API only, including server-side transition validation.
- Prisma schema, seed script, and singleton client helper are now in place for Phase 2 backend work.
- Public backend APIs now exist for customer menu reads and customer order creation.
- Real staff auth APIs now exist for login, logout, and session checks.
- Dashboard routes now require an authenticated staff session.
- Staff menu, tables, and orders APIs now require an authenticated session and enforce restaurant scoping.
- API routes now return a consistent JSON success/error shape.
- Production deployment helpers now exist for env validation and deploy-time Prisma workflows.

### Working project setup pieces

- Path alias `@/*` is configured in `jsconfig.json`.
- Next.js 16 and React 19 are installed.
- Less compilation tooling is installed.
- The root layout imports the compiled global CSS from `@/styles/css/main.css`.
- Remote Google font fetching has been removed from the root layout, which makes local builds more reliable.
- Prisma-backed read APIs now exist for menu, tables, orders, and the public customer menu path.

## Broken Or Incomplete Features

### Staff login is functional

Current status:
- `/login` now submits email/password to the backend auth API.
- Valid staff credentials create a secure HTTP-only session cookie and redirect to `/dashboard`.
- Staff login is backed by the PostgreSQL `users` table.
- The seed script now provisions `demo@zento.dev` / `demo1234` as the demo owner account.

### Staff orders queue is now functional for the MVP

Current status:
- `/dashboard/orders` loads orders from PostgreSQL through the backend API.
- Orders are shown newest first.
- Staff can change status between `new`, `preparing`, `served`, and `cancelled`.
- Status changes persist to PostgreSQL for backend-backed orders.
- Invalid status transitions are rejected by the backend.

Remaining gap:
- There is still no role-based authorization split beyond "valid staff session".

### Customer ordering is now functional and feeds the staff queue

File:
- `app/r/[restaurantSlug]/table/[tableCode]/page.js`

Current status:
- Customer pages load available menu items from `GET /api/public/restaurants/[slug]/tables/[code]/menu`.
- Only available items are shown.
- Customers can add, update, and remove cart items.
- Cart state stays local in component state only.
- Orders are created through `POST /api/public/restaurants/[slug]/tables/[code]/orders`.
- Totals are calculated server-side and persisted as PostgreSQL `orders` and `order_items` records.

Remaining gap:
- There is still no real customer session, rate limiting, or production-grade validation boundary.

### Phase 2 backend foundation is active

Current status:
- Prisma is installed with a PostgreSQL schema under `prisma/schema.prisma`.
- A seed script exists for the demo restaurant, tables, menu items, and one staff user.
- `lib/prisma.js` provides a singleton Prisma client helper.
- Read APIs exist in `app/api/` for menu, tables, orders, and public customer menu access.
- Backend write APIs now exist for menu CRUD, customer order creation, and order status updates.

Current limitation:
- Public customer APIs remain intentionally unauthenticated.
- Authorization is still minimal and does not yet differentiate owner/manager/staff capabilities.
- There is no database-backed session revocation model yet.

### Tooling foundation is in good shape

Current status:
- Lint now uses the ESLint CLI instead of `next lint`.
- Remote Google font fetching was removed from the root layout.
- The Less foundation compiles and is imported through `@/styles/css/main.css`.
- `postinstall` runs `prisma generate`.
- `npm run env:check` validates production-critical env vars.

## Missing MVP Features

The current playable MVP target is now implemented. Remaining gaps are post-MVP concerns rather than blockers for the demo flow.

### Staff-side flow

- Role-based authorization
- Better operational states and error recovery

### Customer-side flow

- Persistent cart draft across tabs or devices
- Customer-side order history
- Production-grade validation and error handling

### Shared demo behavior

- Cross-device consistency for login/session state
- Role-based authorization
- Operational monitoring and rate limiting

## Architecture Observations

### Route architecture

- The route map is already close to the target MVP flow.
- The dashboard section is correctly grouped behind its own layout.
- The customer route is correctly modeled as a dynamic table-based route.

### Component architecture

- The repository now has domain components for menu, customer ordering, and staff orders.
- The route files remain relatively thin, which is appropriate for the current MVP.

### Data architecture

- PostgreSQL via Prisma is now the application source of truth for restaurants, users, tables, menu items, orders, and order items.
- The app is no longer using browser localStorage as an active persistence layer.

### State architecture

- Interactive client state exists in menu management, customer cart behavior, and staff queue updates.
- Client components are used where browser-only interactions are needed.
- Client state is now transient UI state only; persistent application data flows through backend APIs.

## Technical Risks

### High risk

- Public order creation currently depends on API validation only, with no anti-abuse protections.
- Role-based authorization is not implemented yet beyond a valid staff session.

### Medium risk

- Build and runtime correctness now depend on a valid PostgreSQL connection whenever backend-backed flows are exercised.
- Session cookies are signed and scoped, but there is no server-side session revocation table yet.
- Production rollout still depends on correct migration sequencing.

### Low risk

- Placeholder function names are repetitive and unclear, but not a major blocker.
- `public/static/` exists but is unused.

## Frontend Status

Current frontend status:
- Shared dashboard shell exists.
- Staff dashboard pages are functional.
- Customer ordering UI is functional and mobile-first.
- Menu CRUD, cart behavior, order submission, and order status updates all exist.

Assessment:
- Frontend MVP is functional.
- Remaining frontend work is post-MVP polish and backend/auth hardening.

## Backend/API Status

Current backend/API status:
- PostgreSQL + Prisma are installed and seeded.
- Staff auth uses PostgreSQL user lookup plus bcrypt password verification.
- Staff sessions use a signed HTTP-only cookie.
- Backend read APIs exist for menu, tables, orders, and public customer menu access.
- Backend write APIs exist for menu CRUD, order status updates, and public customer order creation.
- Dashboard and customer flows now rely on backend APIs as the only persistent data path.
- Env validation and deployment-oriented Prisma scripts are now in place.

## Styling/Less Status

Current styling status:
- Less dependency installed
- Less compile scripts configured
- Less file structure created
- Compiled CSS target exists and is generated from Less
- Basic base/layout/page Less styles are now present
- Intended import path is implemented in `app/layout.js`
- No Tailwind CSS present, which matches the desired stack

Assessment:
- The styling architecture direction is correct in concept.
- The foundation is now active, but feature-level styling remains to be built.

## Next.js App Router Issues Found

### 1. `params` usage is outdated in the dynamic page

This issue has already been fixed. The customer page and route handlers now await promise-based `params`, which aligns with current App Router guidance.

### 2. Starter CSS files still exist beside the Less architecture

This issue has already been resolved. The starter CSS files were removed and the active styling path is the compiled Less CSS imported from `@/styles/css/main.css`.

## Summary

Zento currently has:
- a working playable MVP across staff and customer flows
- a valid dashboard shell
- a valid customer route shell
- a working Less-based styling foundation
- a functional dashboard home entry screen
- a functional menu management MVP screen
- a functional demo tables screen
- a functional customer ordering MVP screen
- a functional staff orders queue MVP screen
- a PostgreSQL + Prisma backend foundation with active read/write APIs
- real staff authentication and dashboard/API protection

Zento does not yet have:
- authorization
- production-grade backend protections

Overall assessment:
- Playable MVP is working
- Backend-first architecture is now stabilized
- Correct next step after this stage is deployment hardening and finer-grained authorization, not UI rewrites
