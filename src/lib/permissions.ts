/**
 * permissions.ts
 *
 * Pure, framework-independent permission helpers derived from the PRD
 * roles & permissions matrix. These are the single source of truth used by
 * both the UI (to hide/disable actions) and server actions (to authorize).
 *
 * Server-side enforcement is still required (these helpers are not a
 * substitute for Supabase RLS); they keep the rules in one auditable place.
 */

export const ROLES = ['admin', 'ops', 'finance', 'reseller_manager', 'reseller'] as const;
export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function canManageProducts(role: Role): boolean {
  return role === 'admin';
}

export function canCreateOrders(role: Role): boolean {
  return role === 'admin' || role === 'ops' || role === 'reseller_manager' || role === 'reseller';
}

export function canVerifyPayments(role: Role): boolean {
  return role === 'admin' || role === 'finance';
}

export function canFulfillOrders(role: Role): boolean {
  return role === 'admin' || role === 'ops';
}

export function canManageProcurement(role: Role): boolean {
  return role === 'admin' || role === 'finance';
}

export function canManageTreasury(role: Role): boolean {
  return role === 'admin' || role === 'finance';
}

export function canViewProfit(role: Role): boolean {
  return role === 'admin' || role === 'finance';
}

export function canViewAdminReports(role: Role): boolean {
  return role === 'admin';
}

export function canManageResellers(role: Role): boolean {
  return role === 'admin' || role === 'reseller_manager';
}

export function canExportReports(role: Role): boolean {
  return canViewAdminReports(role);
}
