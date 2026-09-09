export type Role = 'ADMIN' | 'MANAGER' | 'WAREHOUSE' | 'ACCOUNTING' | 'USER';

export interface UserSession {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  ADMIN: [
    'products:create', 'products:read', 'products:update', 'products:delete',
    'categories:create', 'categories:read', 'categories:update',
    'units:create', 'units:read', 'units:update',
    'warehouses:create', 'warehouses:read', 'warehouses:update',
    'locations:create', 'locations:read', 'locations:update',
    'suppliers:create', 'suppliers:read', 'suppliers:update',
    'customers:create', 'customers:read', 'customers:update',
    'inventory:read',
    'stock:in', 'stock:out', 'stock:transfer', 'stock:adjustment', 'stock:integrity', 'stock:audit', 'stock:bundle',
    'documents:create', 'documents:read', 'documents:update', 'documents:approve', 'documents:cancel',
    'company:manage',
    'reports:read',
    'users:manage',
    'audit_logs:read'
  ],
  MANAGER: [
    'products:create', 'products:read',
    'categories:create', 'categories:read', 'categories:update',
    'units:read',
    'warehouses:read', 'locations:read',
    'suppliers:read', 'customers:read',
    'inventory:read',
    'stock:in', 'stock:out', 'stock:transfer', 'stock:adjustment', 'stock:audit', 'stock:bundle',
    'documents:create', 'documents:read', 'documents:update', 'documents:approve', 'documents:cancel',
    'company:manage',
    'reports:read',
    'audit_logs:read'
  ],
  WAREHOUSE: [
    'products:read',
    'categories:read',
    'units:read',
    'warehouses:read', 'locations:read',
    'suppliers:read', 'customers:read',
    'inventory:read',
    'stock:in', 'stock:out', 'stock:transfer', 'stock:adjustment', 'stock:audit', 'stock:bundle',
    'documents:create', 'documents:read', 'documents:update',
    'reports:read'
  ],
  ACCOUNTING: [
    'products:read',
    'categories:read',
    'units:read',
    'warehouses:read',
    'suppliers:create', 'suppliers:read', 'suppliers:update',
    'customers:create', 'customers:read', 'customers:update',
    'inventory:read',
    'documents:create', 'documents:read', 'documents:update', 'documents:approve', 'documents:cancel',
    'reports:read'
  ],
  USER: [
    'products:read',
    'categories:read',
    'units:read',
    'warehouses:read',
    'inventory:read',
    'documents:create', 'documents:read',
    'reports:read'
  ]
};

export function hasPermission(role: Role, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes(permission);
}

const VALID_ROLES: Role[] = ['ADMIN', 'MANAGER', 'WAREHOUSE', 'ACCOUNTING', 'USER'];

export function checkAuth(reqRoleHeader?: string | null): UserSession {
  let role: Role = 'ADMIN';

  if (reqRoleHeader && VALID_ROLES.includes(reqRoleHeader.toUpperCase() as Role)) {
    role = reqRoleHeader.toUpperCase() as Role;
  }

  const roleUserMap: Record<Role, { id: string; username: string; name: string }> = {
    ADMIN: { id: 'usr-admin', username: 'admin', name: 'System Admin' },
    MANAGER: { id: 'usr-manager', username: 'manager', name: 'Inventory Manager' },
    WAREHOUSE: { id: 'usr-warehouse', username: 'warehouse', name: 'Warehouse Officer' },
    ACCOUNTING: { id: 'usr-accounting', username: 'accounting', name: 'Accountant Officer' },
    USER: { id: 'usr-user', username: 'user', name: 'General User' },
  };

  const user = roleUserMap[role] || roleUserMap.ADMIN;

  return {
    id: user.id,
    username: user.username,
    name: user.name,
    role,
  };
}
