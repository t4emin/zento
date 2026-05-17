# Zento Project Status

## Overview

Zento is now a playable MVP for a QR ordering SaaS built with the Next.js App Router. The application supports the intended flow across restaurant signup, login, dashboard management, table launch, customer ordering, and staff order review.

The current codebase is now backend-first. Dashboard and customer ordering flows read and write through backend APIs, staff access is protected by backend email/password authentication with a secure cookie session, and legacy localStorage fallback behavior has been removed.

The ordering model now supports both permanent table QR and optional per-session QR. This keeps the original table QR flow for normal restaurants while adding staff-controlled session links for buffet-style service.

Menu items now support configurable option groups and option items. Restaurants can keep simple items with no options, or define structured choices such as soup type, noodle type, protein, and toppings with server-side pricing and order-item option snapshots.

Restaurant-scoped RBAC is now implemented for staff dashboard behavior. Staff APIs use the signed session as the source of truth for `restaurantId`, role permissions are enforced on backend routes, and dashboard navigation only exposes pages the current role can access.

Customer ordering now supports optional order notes, a visible checkout summary, and restaurant type-aware QR guidance. Orders also track payment status, and staff can open a printable electronic receipt page from the dashboard order queue.

Buffet-style table management now supports a configurable dining duration, session countdown behavior, printable QR sheets, and restaurant-type-specific QR guidance for normal and buffet restaurants.

## Current Project Structure

### Top-level structure

```text
app/
components/
docs/
locales/
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
    auth/
      login/route.js
      logout/route.js
      session/route.js
      signup/route.js
    menu/route.js
    settings/route.js
    tables/route.js
    tables/[tableCode]/sessions/route.js
    orders/route.js
    orders/[id]/route.js
    sessions/[code]/route.js
    public/
      restaurants/[slug]/tables/[code]/menu/route.js
      restaurants/[slug]/tables/[code]/orders/route.js
      restaurants/[slug]/sessions/[code]/menu/route.js
      restaurants/[slug]/sessions/[code]/orders/route.js
  login/
    page.js
  signup/
    page.js
  dashboard/
    layout.js
    page.js
    menu/
      page.js
    orders/
      page.js
      [id]/
        receipt/
          page.js
    staff/
      page.js
    tables/
      page.js
      print/
        page.js
  r/
    [restaurantSlug]/
      table/
        [tableCode]/
          page.js
      session/
        [sessionCode]/
          page.js
```

### Components

```text
components/
  auth/
    LoginForm.js
  layout/
    AppHeader.js
    AppSidebar.js
    DashboardShell.js
  providers/
    DashboardSessionProvider.js
    I18nProvider.js
  dashboard/
    ForbiddenState.js
    MenuManager.js
    ReceiptPrintButton.js
    StaffManager.js
    TableQrPrintSheet.js
    TablesLauncher.js
  customer/
    CustomerMenu.js
  orders/
    OrdersQueue.js
```

### Styles structure

```text
lib/
  i18n.js
  menu-options.js
  public-url.js
  prisma.js
  restaurants.js

locales/
  th.js
  en.js

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
| `/` | `app/page.js` | Landing page with links to login, signup, and customer demo |
| `/login` | `app/login/page.js` | Real staff login backed by PostgreSQL users and a secure cookie session |
| `/signup` | `app/signup/page.js` | Public restaurant onboarding flow that creates the restaurant, owner account, and starter tables |
| `/dashboard` | `app/dashboard/page.js` | Functional dashboard home with admin entry cards |
| `/dashboard/menu` | `app/dashboard/menu/page.js` | Functional menu management screen |
| `/dashboard/orders` | `app/dashboard/orders/page.js` | Functional staff orders queue |
| `/dashboard/orders/[id]/receipt` | `app/dashboard/orders/[id]/receipt/page.js` | Printable electronic receipt page |
| `/dashboard/staff` | `app/dashboard/staff/page.js` | Restaurant owner staff and role management screen |
| `/dashboard/tables` | `app/dashboard/tables/page.js` | Functional restaurant tables screen with permanent table QR plus staff-controlled order sessions |
| `/dashboard/tables/print` | `app/dashboard/tables/print/page.js` | Printable QR sheet for table or session QR cards |
| `/r/[restaurantSlug]/table/[tableCode]` | `app/r/[restaurantSlug]/table/[tableCode]/page.js` | Functional customer ordering flow |
| `/r/[restaurantSlug]/session/[sessionCode]` | `app/r/[restaurantSlug]/session/[sessionCode]/page.js` | Customer ordering flow that requires an active session QR |

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
- Uses the lightweight dictionary helper for translated labels.

Status:
- Links are shown or hidden based on the signed-in user's role.
- Owners can access Staff Management.
- Managers do not see Staff Management.
- Staff only see the pages they can access.
- Thai/English text now updates dynamically through the shared locale provider.

### `components/layout/AppHeader.js`

Purpose:
- Renders the dashboard top bar.
- Hosts the lightweight TH / EN language switcher.

Status:
- Uses the shared locale provider.
- Shows signed-in user identity and role.
- Includes dashboard logout behavior.
- Persists the selected locale in `localStorage` under `zento_locale`.
- Updates translated UI immediately without a full page reload.

## RBAC Status

- `owner` can manage menu, tables, orders, sessions, and staff users.
- `manager` can manage menu, tables, orders, and sessions, but cannot manage staff.
- `staff` can read orders and update order status, but cannot manage menu, tables, sessions, or staff.
- Staff APIs now scope reads and writes to the authenticated user's `restaurantId` from the signed cookie session.
- Public customer routes still use `restaurantSlug` because they are restaurant-facing URLs, not staff dashboard APIs.

## Staff Management Status

- `/dashboard/staff` exists and is visible only to owners.
- Owners can list users for their restaurant, create staff accounts, change names and roles, reset passwords, and delete users.
- Staff management APIs validate role values, hash passwords with `bcrypt`, and block owners from deleting themselves.
- Cross-restaurant access is blocked by restaurant-scoped ownership checks on every staff management mutation.

## Ordering and Payment Status

- Orders now support an optional customer note captured during checkout.
- Customer checkout shows a cost summary with item total, option total, and grand total.
- Orders now track `paymentStatus` with `unpaid`, `pending_review`, and `paid`.
- Staff can update payment status directly from the dashboard orders queue.
- Staff can open `/dashboard/orders/[id]/receipt` for a printable HTML receipt that includes restaurant, table/session, items, options, note, payment status, total, and timestamp.

## Restaurant Type Status

- `restaurants.type` is now the primary domain field for table QR behavior.
- Signup exposes only `normal` and `buffet` restaurant types.
- `restaurant_settings.buffet_duration_minutes` controls the default dining session lifetime for buffet restaurants and defaults to 90 minutes when not configured.
- The dashboard tables page now follows the restaurant type automatically instead of asking staff to choose a mode there.
- `normal` uses permanent table QR as the primary customer flow.
- `buffet` uses dining session QR as the primary customer flow.
- Existing `restaurant_settings.mode` remains in the schema for backward compatibility, but it is no longer the main source of truth for dashboard UX.

## Buffet Session Status

- Opening a new session for a table closes any previous active session for that table first.
- New buffet sessions automatically receive an `expiresAt` timestamp based on the restaurant's buffet duration setting unless an explicit future expiry is provided.
- Public session menu and order APIs treat expired sessions as unusable and return a clear expiration error.
- Dashboard tables and customer session views now show remaining time countdowns for active dining sessions.
- Existing restaurants previously marked as `hybrid` are migrated to `buffet` at the restaurant type level.

## Table QR Print Sheet Status

- `/dashboard/tables/print` now renders a print-friendly QR sheet.
- Normal restaurants print one permanent table QR per table.
- Buffet restaurants print one active session QR per table when active sessions exist.
- The QR payload uses the configured public app URL when available, so printed QR sheets work outside the dashboard browser session.

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
- UI copy now lives in `locales/th.js` and `locales/en.js` and is consumed through `lib/i18n.js`.
- Thai is the default locale, with a lightweight client-side locale provider and persisted language preference.

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
- Prisma schema now includes `order_sessions` plus nullable `orders.order_session_id` for session-scoped ordering.
- Prisma schema now also includes `menu_option_groups`, `menu_option_items`, and `order_items.selected_options_snapshot` for customizable menu items.

## Current Working Features

### Working route and layout scaffolding

- Root App Router layout exists.
- Dashboard has a nested layout.
- Dashboard pages render inside a shared shell.
- Homepage links to both staff and customer demo routes.
- Customer dynamic route resolves URL params and renders basic content.
- Session dynamic route resolves URL params and renders the same customer ordering UI in session mode.
- The app has a lightweight bilingual dictionary system with Thai default and English secondary support.

### Working session-based ordering flow

- Staff can open a new active order session per table from `/dashboard/tables`.
- Opening a new session generates a unique session QR URL and closes any previous active session on that table.
- Staff can view and close the active session from the same tables dashboard.
- Session QR routes validate the restaurant, session code, active status, and expiration before loading menu data.
- Orders submitted through a session QR are stored with `orders.order_session_id`.
- Permanent table QR routes remain active and unchanged for restaurants that do not use session-based ordering.

### Working menu option flow

- Staff menu APIs now support creating, reading, and replacing option groups and option items per menu item.
- Public menu APIs return only orderable option data for customers.
- Customer ordering now supports required single-choice and multiple-choice option groups.
- Cart lines remain separate when the same menu item is chosen with different option combinations.
- Order submission validates option ownership and availability server-side and stores `selected_options_snapshot` on each order item.
- Locale preference persists in `localStorage` and updates translated components immediately from the header switcher.

### Working static UI pieces

- Login page authenticates against PostgreSQL and redirects into the dashboard.
- Signup page creates a restaurant, owner account, restaurant settings, and initial tables through the backend API.
- Dashboard sidebar and header render.
- Basic route navigation can be exercised because route files exist.
- Dashboard home now shows useful admin entry cards for Menu Management, Tables, and Orders.
- Dashboard menu now reads and writes through backend APIs only.
- Dashboard tables now reads through backend APIs only and renders customer ordering URLs plus QR download actions.
- Customer ordering now loads available menu data from the backend public API, keeps cart state locally in the component, and submits new orders to PostgreSQL.
- Dashboard orders now reads backend order data only.
- Dashboard orders status updates now use the backend API only, including server-side transition validation.
- Prisma schema, seed script, and singleton client helper are now in place for Phase 2 backend work.
- Public backend APIs now exist for customer menu reads and customer order creation.
- Real staff auth APIs now exist for login, logout, and session checks.
- A public auth signup API now exists for owner onboarding.
- Dashboard routes now require an authenticated staff session.
- Staff menu, tables, and orders APIs now require an authenticated session and enforce restaurant scoping.
- API routes now return a consistent JSON success/error shape.
- Production deployment helpers now exist for env validation and deploy-time Prisma workflows.
- A lightweight bilingual i18n layer now exists with Thai as the default locale and English as the secondary dictionary.

### Working project setup pieces

- Path alias `@/*` is configured in `jsconfig.json`.
- Next.js 16 and React 19 are installed.
- Less compilation tooling is installed.
- The root layout imports the compiled global CSS from `@/styles/css/main.css`.
- Remote Google font fetching has been removed from the root layout, which makes local builds more reliable.
- Prisma-backed read APIs now exist for menu, tables, orders, and the public customer menu path.
- UI text for the main dashboard and customer flow is now sourced from locale dictionaries instead of being hardcoded inline.

## Broken Or Incomplete Features

### Restaurant signup is functional

Current status:
- `/signup` posts restaurant onboarding data to `POST /api/auth/signup`.
- The signup API validates slug format, restaurant type, owner email uniqueness, password length, and table count range.
- Owners choose `normal` or `buffet` during onboarding.
- Successful signup creates the restaurant, owner user, starter tables (`T01`, `T02`, ...), the restaurant type, and default restaurant settings in one Prisma transaction.
- Signup redirects to `/login` instead of auto-creating a staff session.

Remaining gap:
- There is no email verification, invite flow, or abuse/rate-limit protection yet.

### Staff login is functional

Current status:
- `/login` now submits email/password to the backend auth API.
- Valid staff credentials create a secure HTTP-only session cookie and redirect to `/dashboard`.
- Staff login is backed by the PostgreSQL `users` table.
- The seed script now provisions `demo@zento.dev` / `demo1234` as the demo owner account.
- After signup, `/login` can prefill the owner email from the redirect query string.

### Dashboard tables are functional for self-service onboarding

Current status:
- `/dashboard/tables` loads the logged-in restaurant's tables from `GET /api/tables`.
- Each table now follows the logged-in restaurant's `restaurants.type` automatically.
- Normal restaurants show permanent customer ordering URLs and QR codes prominently.
- Buffet restaurants show dining session tools and countdown behavior prominently.
- Staff can copy the customer URL, open the customer screen, and download the QR code as a PNG.
- Absolute customer URLs use `NEXT_PUBLIC_APP_URL` or `APP_URL` when available, and fall back to `window.location.origin` on the client.

Remaining gap:
- There is no print-optimized QR sheet or bulk export yet.

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

The current playable MVP target is now implemented. Remaining gaps are post-MVP concerns rather than blockers for the restaurant-scoped production flow.

## Remaining Limitations

- There is no audit log yet for staff role changes, password resets, or destructive admin actions.
- There is no invitation-by-email workflow yet; owners create staff users directly in the dashboard.
- Fine-grained custom permissions do not exist yet beyond the built-in `owner`, `manager`, and `staff` role sets.
- Receipts are printable HTML only; there is no PDF or background receipt generation yet.
- Bulk QR export is print-sheet based; there is no ZIP bundle or server-side QR asset generation yet.

### Staff-side flow

- Role-based authorization
- Better operational states and error recovery
- Owner/staff management beyond the initial owner account

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
- A simple translation helper now sits beside the existing app code instead of introducing a heavy i18n framework.

### Data architecture

- PostgreSQL via Prisma is now the application source of truth for restaurants, users, tables, menu items, orders, and order items.
- The app is no longer using browser localStorage as an active persistence layer.

### State architecture

- Interactive client state exists in menu management, customer cart behavior, and staff queue updates.
- Client components are used where browser-only interactions are needed.
- Client state is now transient UI state only; persistent application data flows through backend APIs.
- Locale selection is currently static and defaults to Thai through the lightweight i18n helper.

## Technical Risks

### High risk

- Public order creation currently depends on API validation only, with no anti-abuse protections.
- Role-based authorization is not implemented yet beyond a valid staff session.
- Public signup is not rate-limited and does not yet verify email ownership.

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
- Self-service restaurant onboarding is functional.
- Customer ordering UI is functional and mobile-first.
- Menu CRUD, cart behavior, order submission, order status updates, and table QR generation all exist.

Assessment:
- Frontend MVP is functional.
- Remaining frontend work is post-MVP polish and backend/auth hardening.

## Backend/API Status

Current backend/API status:
- PostgreSQL + Prisma are installed and seeded.
- Staff auth uses PostgreSQL user lookup plus bcrypt password verification.
- Staff sessions use a signed HTTP-only cookie.
- Backend read APIs exist for menu, tables, orders, and public customer menu access.
- Backend write APIs exist for signup, menu CRUD, order status updates, and public customer order creation.
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
- a functional self-service restaurant signup screen
- a functional menu management MVP screen
- a functional restaurant tables and QR management screen
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
