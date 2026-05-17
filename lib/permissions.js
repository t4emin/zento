export const PERMISSIONS = {
  MENU_READ: "menu:read",
  MENU_WRITE: "menu:write",
  TABLES_READ: "tables:read",
  TABLES_WRITE: "tables:write",
  ORDERS_READ: "orders:read",
  ORDERS_WRITE: "orders:write",
  SESSIONS_WRITE: "sessions:write",
  STAFF_READ: "staff:read",
  STAFF_WRITE: "staff:write",
};

const ROLE_PERMISSIONS = {
  owner: [
    PERMISSIONS.MENU_READ,
    PERMISSIONS.MENU_WRITE,
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.TABLES_WRITE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.SESSIONS_WRITE,
    PERMISSIONS.STAFF_READ,
    PERMISSIONS.STAFF_WRITE,
  ],
  manager: [
    PERMISSIONS.MENU_READ,
    PERMISSIONS.MENU_WRITE,
    PERMISSIONS.TABLES_READ,
    PERMISSIONS.TABLES_WRITE,
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
    PERMISSIONS.SESSIONS_WRITE,
  ],
  staff: [
    PERMISSIONS.ORDERS_READ,
    PERMISSIONS.ORDERS_WRITE,
  ],
};

export function getRolePermissions(role) {
  return ROLE_PERMISSIONS[role] || [];
}

export function can(role, permission) {
  return getRolePermissions(role).includes(permission);
}
