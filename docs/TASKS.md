# Zento MVP Tasks

## Priority Legend

- `P0`: critical for playable MVP
- `P1`: important but not a first blocker
- `P2`: polish or cleanup

## Complexity Legend

- `Low`: small, localized change
- `Medium`: touches multiple files or interactive behavior
- `High`: cross-route behavior or shared persistence

## Task 1

**Title:** Fix global CSS import path  
**Goal:** Make the root layout use the intended global CSS import pattern from `@/styles/css/main.css`.  
**Affected files:** `app/layout.js`, `styles/css/main.css`  
**Dependencies:** None  
**Priority:** `P0`  
**Estimated complexity:** `Low`

## Task 2

**Title:** Activate the Less styling foundation  
**Goal:** Turn the empty Less structure into a real base/layout/page styling foundation for the MVP.  
**Affected files:** `styles/less/main.less`, `styles/less/base/*`, `styles/less/layout/*`, `styles/less/pages/*`, `styles/css/main.css`  
**Dependencies:** Task 1  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Task 3

**Title:** Update lint workflow for Next.js 16  
**Goal:** Replace the outdated `next lint` script with the current ESLint CLI workflow.  
**Affected files:** `package.json`, possibly `eslint.config.mjs`  
**Dependencies:** None  
**Priority:** `P1`  
**Estimated complexity:** `Low`

## Task 4

**Title:** Reduce build fragility from remote fonts  
**Goal:** Remove or mitigate the reliance on `next/font/google` for a local MVP workflow.  
**Affected files:** `app/layout.js`  
**Dependencies:** None  
**Priority:** `P1`  
**Estimated complexity:** `Low`

## Task 5

**Title:** Define demo data models  
**Goal:** Create the JavaScript data shapes for restaurant, table, menu item, cart item, order, and order line.  
**Affected files:** `lib/demo-data.js` or equivalent new files  
**Dependencies:** None  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Task 6

**Title:** Create localStorage helpers  
**Goal:** Add browser-safe helpers to read and write demo menu, cart, orders, and optional login state.  
**Affected files:** `lib/demo-storage.js` or equivalent new files  
**Dependencies:** Task 5  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Task 7

**Title:** Seed default demo restaurant and menu  
**Goal:** Ensure `/r/demo/table/T01` has starter content without requiring admin setup first.  
**Affected files:** `lib/demo-data.js`, `lib/demo-storage.js`  
**Dependencies:** Task 5, Task 6  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Task 8

**Title:** Implement demo login redirect  
**Goal:** Make `/login` act as a demo entry and redirect to `/dashboard`.  
**Affected files:** `app/login/page.js`, optional auth demo helper files  
**Dependencies:** Task 6 if login persistence is stored, otherwise none  
**Priority:** `P0`  
**Estimated complexity:** `Low`

## Task 9

**Title:** Build dashboard home  
**Goal:** Turn `/dashboard` into a useful admin landing page with clear links to menu, tables, and orders.  
**Affected files:** `app/dashboard/page.js`, related Less files  
**Dependencies:** Task 2  
**Priority:** `P1`  
**Estimated complexity:** `Medium`

## Task 10

**Title:** Create menu management UI shell  
**Goal:** Build the base structure for `/dashboard/menu`, including list area and form area.  
**Affected files:** `app/dashboard/menu/page.js`, `components/dashboard/MenuManager.js`, related Less files  
**Dependencies:** Task 2, Task 5  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Task 11

**Title:** Implement add menu item flow  
**Goal:** Allow admin users to create menu items and persist them in localStorage.  
**Affected files:** `app/dashboard/menu/page.js`, `components/dashboard/MenuManager.js`, `lib/demo-storage.js`  
**Dependencies:** Task 10, Task 6  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Task 12

**Title:** Implement edit menu item flow  
**Goal:** Allow admin users to update existing menu items.  
**Affected files:** `app/dashboard/menu/page.js`, `components/dashboard/MenuManager.js`, `lib/demo-storage.js`  
**Dependencies:** Task 10, Task 6  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Task 13

**Title:** Implement delete menu item flow  
**Goal:** Allow admin users to delete menu items.  
**Affected files:** `app/dashboard/menu/page.js`, `components/dashboard/MenuManager.js`, `lib/demo-storage.js`  
**Dependencies:** Task 10, Task 6  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Task 14

**Title:** Build dashboard tables page  
**Goal:** Make `/dashboard/tables` show demo tables and expose links into customer table routes.  
**Affected files:** `app/dashboard/tables/page.js`, related Less files  
**Dependencies:** Task 2, Task 7  
**Priority:** `P1`  
**Estimated complexity:** `Low`

## Task 15

**Title:** Modernize customer route params handling  
**Goal:** Align the dynamic customer page with current App Router expectations before adding more logic.  
**Affected files:** `app/r/[restaurantSlug]/table/[tableCode]/page.js`  
**Dependencies:** None  
**Priority:** `P1`  
**Estimated complexity:** `Low`

## Task 16

**Title:** Build customer menu page shell  
**Goal:** Render menu items and table context on `/r/demo/table/T01`.  
**Affected files:** `app/r/[restaurantSlug]/table/[tableCode]/page.js`, `components/customer/CustomerMenu.js`, related Less files  
**Dependencies:** Task 7, Task 15  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Task 17

**Title:** Implement customer cart behavior  
**Goal:** Allow customers to add items, update quantities, remove items, and see totals.  
**Affected files:** `components/customer/CustomerMenu.js`, optional cart helpers, `lib/demo-storage.js`  
**Dependencies:** Task 16, Task 6  
**Priority:** `P0`  
**Estimated complexity:** `High`

## Task 18

**Title:** Implement order submission  
**Goal:** Convert cart state into a submitted order stored in localStorage and reset the cart afterward.  
**Affected files:** `components/customer/CustomerMenu.js`, `lib/demo-storage.js`, order helper files  
**Dependencies:** Task 17  
**Priority:** `P0`  
**Estimated complexity:** `High`

## Task 19

**Title:** Build staff orders queue page  
**Goal:** Show submitted orders on `/dashboard/orders`.  
**Affected files:** `app/dashboard/orders/page.js`, `components/orders/OrdersQueue.js`, `lib/demo-storage.js`, related Less files  
**Dependencies:** Task 18, Task 2  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Task 20

**Title:** Add simple order statuses  
**Goal:** Represent at least a `new` order state, with room for later status changes.  
**Affected files:** order helpers, `app/dashboard/orders/page.js`, `components/orders/OrdersQueue.js`  
**Dependencies:** Task 19  
**Priority:** `P1`  
**Estimated complexity:** `Medium`

## Task 21

**Title:** Add mobile-first customer styling  
**Goal:** Make the customer menu and cart usable on phone-sized screens first.  
**Affected files:** `styles/less/pages/customer.less`, supporting Less files  
**Dependencies:** Task 16, Task 17, Task 18  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Task 22

**Title:** Add dashboard page styling  
**Goal:** Make dashboard, menu, tables, and orders views readable and usable for the demo.  
**Affected files:** `styles/less/pages/dashboard.less`, `styles/less/layout/dashboard.less`, other related Less files  
**Dependencies:** Task 9, Task 10, Task 14, Task 19  
**Priority:** `P1`  
**Estimated complexity:** `Medium`

## Task 23

**Title:** Add empty and success states  
**Goal:** Improve clarity when no menu items exist, no orders exist, cart is empty, or an order is submitted successfully.  
**Affected files:** dashboard pages, customer page, new components, Less files  
**Dependencies:** Task 11, Task 16, Task 18, Task 19  
**Priority:** `P1`  
**Estimated complexity:** `Medium`

## Task 24

**Title:** Reconcile unused starter CSS files  
**Goal:** Decide how to handle `app/globals.css` and `app/page.module.css` so they do not conflict with the intended Less architecture.  
**Affected files:** `app/globals.css`, `app/page.module.css`, `app/layout.js`  
**Dependencies:** Task 1, Task 2  
**Priority:** `P2`  
**Estimated complexity:** `Low`

## Task 25

**Title:** Validate the full playable MVP flow  
**Goal:** Confirm the full round trip from login to order visibility works in one browser context.  
**Affected files:** No mandatory code files, but may expose follow-up fixes across the app  
**Dependencies:** Tasks 8 through 23  
**Priority:** `P0`  
**Estimated complexity:** `Medium`

## Suggested Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 7
8. Task 8
9. Task 9
10. Task 10
11. Task 11
12. Task 12
13. Task 13
14. Task 14
15. Task 15
16. Task 16
17. Task 17
18. Task 18
19. Task 19
20. Task 20
21. Task 21
22. Task 22
23. Task 23
24. Task 24
25. Task 25

## Validation Notes

Completed foundation and MVP tasks:
- Task 1 through Task 25 are implemented for the current playable demo flow.

Task 24 result:
- Unused starter CSS files `app/globals.css` and `app/page.module.css` were removed because the app uses the compiled Less CSS imported from `@/styles/css/main.css`.

Task 25 result:
- The playable MVP flow was validated through lint/build checks, route checks against the running app, and localStorage/demo helper verification for menu, order, and status persistence behavior.
