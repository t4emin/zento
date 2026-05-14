# Zento MVP Roadmap

## Goal

Reach a playable MVP demo with this flow:

1. `/login`
2. `/dashboard`
3. `/dashboard/menu`
4. `/dashboard/tables`
5. `/dashboard/orders`
6. `/r/demo/table/T01`
7. Customer cart and order submission
8. Staff order queue visibility

## MVP Principles

- Do not add a real database yet.
- Do not add real authentication yet.
- Use JavaScript only.
- Use the existing App Router structure.
- Use Less compiled to CSS.
- Import global CSS from `@/styles/css/main.css`.
- Use mobile-first UI, especially for the customer route.
- Prefer localStorage for the first playable demo.

## Phase 1: Stabilize The Foundation

### Step 1. Fix global CSS wiring

Target:
- Root layout imports `@/styles/css/main.css`
- Broken manual stylesheet link is removed

Why first:
- Every route depends on a working global style entry.

### Step 2. Make the Less pipeline meaningful

Target:
- Less partials begin to contain actual base/layout/page styles
- `styles/css/main.css` becomes a real compiled output

Why now:
- MVP screens need structure and spacing immediately.

### Step 3. Align tooling with current Next.js

Target:
- Lint script uses the correct ESLint CLI workflow
- App Router issues are documented before feature work begins

## Phase 2: Establish Demo Data And Browser Persistence

### Step 4. Define demo data shapes

Need to define:
- Restaurant
- Table
- Menu item
- Cart item
- Order
- Order line

Target:
- Shared data structure for all staff and customer pages

### Step 5. Add localStorage demo persistence

Target:
- Menu items persist in the browser for the MVP
- Submitted orders persist in the browser for the MVP
- Demo login state can persist in the browser if needed

Important limitation:
- localStorage is browser-local, so the same demo is best tested in the same browser context

### Step 6. Seed the demo state

Target:
- `demo` restaurant slug exists conceptually
- `T01` table is supported
- A starter menu is available without manual setup

## Phase 3: Staff Entry And Dashboard

### Step 7. Implement login redirect demo

Target:
- `/login` behaves like a demo entry point
- Clicking login takes the user to `/dashboard`

### Step 8. Make `/dashboard` useful

Target:
- Dashboard home shows clear entry points into menu, tables, and orders
- It should work as the demo control center

## Phase 4: Menu Management

### Step 9. Build `/dashboard/menu` list view

Target:
- Show current menu items
- Show empty state if none exist

### Step 10. Add create menu item flow

Target:
- Admin can add a menu item with basic fields

Suggested fields:
- name
- description
- price
- category
- availability

### Step 11. Add edit menu item flow

Target:
- Admin can update existing menu items

### Step 12. Add delete menu item flow

Target:
- Admin can remove menu items

### Step 13. Verify menu persistence

Target:
- Changes survive page reload in the same browser via localStorage

## Phase 5: Tables View

### Step 14. Build `/dashboard/tables`

Target:
- Show demo tables
- Include the customer demo route path for `T01`
- Help staff navigate to the table experience

Suggested MVP use:
- a simple list of demo table links
- a visible link to `/r/demo/table/T01`

## Phase 6: Customer Ordering Flow

### Step 15. Build customer menu screen at `/r/demo/table/T01`

Target:
- Show restaurant/table header
- Show available menu items from demo storage

### Step 16. Add customer cart behavior

Target:
- Add item to cart
- Adjust quantity
- Remove item
- Show totals

### Step 17. Add order submission flow

Target:
- Submit the current cart as a new order
- Store the order in localStorage
- Clear the cart after successful submission

### Step 18. Add success and empty states

Target:
- Clear UX when no menu items exist
- Clear UX when cart is empty
- Clear UX after successful order submission

## Phase 7: Staff Orders Queue

### Step 19. Build `/dashboard/orders`

Target:
- Show submitted orders from localStorage
- Include table code, items, totals, and timestamp

### Step 20. Add simple order statuses

Target:
- Support at least a default `new` status
- Optionally allow simple status changes for demo purposes

### Step 21. Verify full round trip

Target:
- Menu created in admin appears in customer route
- Order submitted by customer appears in staff orders page

## Phase 8: Mobile-First Demo Polish

### Step 22. Style the customer flow first

Priority:
- menu cards
- add-to-cart controls
- sticky cart area
- submit action

### Step 23. Style staff pages second

Priority:
- dashboard overview
- menu form/list layout
- orders queue readability
- tables page clarity

### Step 24. Cleanup and consistency pass

Target:
- consistent labels
- consistent empty states
- consistent spacing and button styles

## Recommended Implementation Order

1. Fix CSS import and Less wiring
2. Fix lint/tooling mismatch
3. Define demo data shapes
4. Add localStorage storage helpers
5. Seed demo restaurant/table/menu
6. Implement login redirect
7. Build dashboard home
8. Build menu CRUD
9. Build tables page
10. Build customer menu page
11. Build cart behavior
12. Build order submission
13. Build staff orders page
14. Add mobile-first styling polish
15. Validate the full demo flow

## Playable MVP Completion Criteria

The MVP is playable when all of the following are true:

- `/login` redirects to `/dashboard`
- `/dashboard` acts as a usable entry point
- `/dashboard/menu` supports add, edit, and delete
- `/dashboard/tables` exposes the demo table flow
- `/r/demo/table/T01` shows menu data
- Customer can add items to cart
- Customer can submit an order
- `/dashboard/orders` shows submitted orders
- Menu and orders survive reload in the same browser using localStorage
- The customer flow works at mobile width

## Explicit Non-Goals For This MVP

Do not add yet:
- real authentication
- database integration
- production API architecture
- multi-user synchronization
- payment
- kitchen printing
- multi-restaurant admin tooling
- advanced permissions
