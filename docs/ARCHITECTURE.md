# Zento Architecture

## Overview

This document describes the current and recommended MVP architecture for Zento based on the current repository and the stated constraints:

- Next.js App Router
- JavaScript only
- No TypeScript
- No Tailwind CSS
- Less compiled to CSS
- Global CSS imported from `@/styles/css/main.css`
- Vanilla JS allowed for browser-side interactions
- Mobile-first responsive UI
- Playable MVP first
- No real database yet

## Routing Structure

## Current route map

```text
/
/login
/dashboard
/dashboard/menu
/dashboard/orders
/dashboard/tables
/r/[restaurantSlug]/table/[tableCode]
```

## Route responsibilities

### `/`

Purpose:
- Demo landing page
- Entry point to both staff and customer experiences

### `/login`

Purpose:
- Demo admin login entry
- Should redirect to `/dashboard`

### `/dashboard`

Purpose:
- Admin landing page
- Should become the operational hub for the MVP

### `/dashboard/menu`

Purpose:
- Menu management
- Add/edit/delete menu items

### `/dashboard/tables`

Purpose:
- Show available demo tables
- Link to customer demo routes

### `/dashboard/orders`

Purpose:
- Staff order queue
- Display submitted orders

### `/r/[restaurantSlug]/table/[tableCode]`

Purpose:
- Customer ordering route
- Mobile-first UI for browsing menu and submitting orders

## Recommended routing direction

Keep the existing route map. It already matches the MVP closely and does not need restructuring before implementation.

## Layout Structure

## Current layout structure

### Root layout

File:
- `app/layout.js`

Responsibility:
- HTML shell
- metadata
- global styles entry

Current issue:
- It currently injects a manual stylesheet link instead of importing `@/styles/css/main.css`.

### Dashboard layout

File:
- `app/dashboard/layout.js`

Responsibility:
- Wrap all dashboard pages in a common admin shell

Current status:
- Correct architectural direction
- Good place for shared navigation and dashboard framing

## Recommended layout direction

- Keep `app/layout.js` as the single global CSS import location.
- Keep `app/dashboard/layout.js` as the dashboard-specific wrapper.
- Avoid unnecessary additional layout layers until the MVP is complete.

## Component Structure

## Current component structure

```text
components/
  layout/
    AppHeader.js
    AppSidebar.js
    DashboardShell.js
```

Current state:
- Only layout components exist.
- No domain-level components exist yet.

## Recommended component structure for MVP

```text
components/
  layout/
    AppHeader.js
    AppSidebar.js
    DashboardShell.js
  dashboard/
    MenuManager.js
    MenuForm.js
    MenuList.js
  customer/
    CustomerMenu.js
    CartPanel.js
  orders/
    OrdersQueue.js
    OrderCard.js
```

## Component design guidance

- Keep route files thin.
- Put interactive browser behavior into client components.
- Keep layout concerns separate from menu/cart/order domain UI.
- Avoid premature abstraction until the MVP flow is working.

## Styling Architecture

## Current styling architecture

Current files:

```text
styles/css/main.css
styles/less/main.less
styles/less/base/*
styles/less/layout/*
styles/less/components/*
styles/less/pages/*
```

Current status:
- Less architecture exists
- Less partials are empty
- compiled CSS is empty
- root layout does not import compiled CSS correctly

## Intended styling architecture

The intended pattern is:

1. Author styles in Less under `styles/less/`
2. Compile to `styles/css/main.css`
3. Import the compiled CSS from `app/layout.js` using:

```js
import "@/styles/css/main.css";
```

## Recommended styling organization

### `styles/less/base/`

Use for:
- variables
- reset
- typography
- shared spacing primitives

### `styles/less/layout/`

Use for:
- dashboard shell
- header
- sidebar
- page framing

### `styles/less/components/`

Use for:
- buttons
- forms
- cards
- reusable UI pieces

### `styles/less/pages/`

Use for:
- home page
- login page
- customer ordering page
- dashboard sections

## Styling recommendations

- Do not add Tailwind CSS.
- Keep styling Less-first to match the intended stack.
- Make the customer route mobile-first.
- Use the dashboard layout styles as secondary priority after customer UX.

## State Management Approach

## Current state status

- No interactive state is implemented.
- No client components are currently defined.
- No storage mechanism exists.

## Recommended MVP state approach

Use a simple layered approach:

### 1. Local component state

Use React local state for:
- login form state
- menu form fields
- edit mode state
- cart state
- submission feedback

Tools:
- `useState`
- `useEffect` where actually needed

### 2. localStorage-backed demo persistence

Use localStorage for:
- demo login flag
- menu items
- submitted orders
- optional per-table cart draft

Why:
- Matches the stated MVP goal of no real database yet
- Works well enough for a single-browser playable demo
- Keeps implementation small

### 3. Route-to-component boundary

Recommended pattern:
- Keep route files as server entry points or thin wrappers
- Put localStorage and browser interactions inside `"use client"` components only

## localStorage Demo Approach

## Purpose

Use localStorage as the temporary MVP persistence layer until a real backend is added later.

## Recommended storage keys

Suggested keys:

```text
zento.demo.session
zento.demo.menu
zento.demo.orders
zento.demo.cart.demo.T01
```

Examples:
- `zento.demo.session` for fake login state
- `zento.demo.menu` for current menu items
- `zento.demo.orders` for submitted orders
- `zento.demo.cart.demo.T01` for an optional table-specific cart draft

## Recommended behavior

- On first load, seed menu data if no menu exists yet.
- Store menu changes immediately after add/edit/delete.
- Store orders immediately after customer submission.
- Read orders from the same browser storage on `/dashboard/orders`.
- Optionally clear cart after successful submission.

## Important limitations

- localStorage is browser-local.
- Data will not automatically sync between different browsers or devices.
- The playable MVP should therefore be demonstrated in one browser context unless a real API is added later.

## Future API Structure

## Current API status

- No API routes exist.
- No server actions exist.

## Recommended future API shape after MVP

When the project moves beyond localStorage, a minimal API layer could look like:

```text
GET    /api/menu
POST   /api/menu
PUT    /api/menu/[id]
DELETE /api/menu/[id]

GET    /api/orders
POST   /api/orders
PATCH  /api/orders/[id]
```

## Recommended API responsibilities

- `GET /api/menu`
  - fetch active menu items

- `POST /api/menu`
  - create menu items

- `PUT /api/menu/[id]`
  - update menu items

- `DELETE /api/menu/[id]`
  - delete menu items

- `GET /api/orders`
  - fetch submitted orders

- `POST /api/orders`
  - create new customer orders

- `PATCH /api/orders/[id]`
  - update order statuses

## Future Database Recommendation

## Current recommendation

Do not add a real database for the current playable MVP.

## Recommended next-stage database model

When the project is ready to move past localStorage, a relational model is the best fit.

## Suggested tables

### `restaurants`

Fields:
- `id`
- `slug`
- `name`
- `created_at`
- `updated_at`

### `tables`

Fields:
- `id`
- `restaurant_id`
- `code`
- `label`
- `created_at`
- `updated_at`

### `menu_items`

Fields:
- `id`
- `restaurant_id`
- `name`
- `description`
- `price`
- `category`
- `is_available`
- `created_at`
- `updated_at`

### `orders`

Fields:
- `id`
- `restaurant_id`
- `table_code`
- `status`
- `total_amount`
- `created_at`
- `updated_at`

### `order_items`

Fields:
- `id`
- `order_id`
- `menu_item_id`
- `item_name_snapshot`
- `unit_price_snapshot`
- `quantity`
- `line_total`

## Database notes

- Snapshot fields on `order_items` are important so old orders remain accurate even if menu items change later.
- `table_code` is enough for the MVP, but a normalized `table_id` is better once a real schema is introduced.
- `status` should be an explicit finite set such as `new`, `preparing`, `served`.

## Folder Organization Recommendation

## Recommended MVP-oriented structure

```text
app/
  dashboard/
  login/
  r/

components/
  layout/
  dashboard/
  customer/
  orders/

lib/
  demo-data.js
  demo-storage.js
  menu-helpers.js
  order-helpers.js

styles/
  css/
  less/
    base/
    components/
    layout/
    pages/
```

## Summary

The current architecture is a good shell for the MVP:
- route structure is already aligned with the product
- dashboard layout exists
- Less structure exists

What is still missing is the functional layer:
- client components
- localStorage-backed demo persistence
- menu/cart/order domain modules
- proper global CSS import

The correct next step is not a rewrite. It is to implement the MVP behavior on top of the existing route structure using a small localStorage-based architecture.
