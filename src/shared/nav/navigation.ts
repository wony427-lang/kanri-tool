import type { Permission, Role, SessionContext } from "@/shared/authorization/types";

export interface NavigationItem {
  label: string;
  href: string;
  icon?: string;
  order: number;
  roles?: ReadonlyArray<Role>;
  permission?: Permission;
}

const ALL_ROLES: ReadonlyArray<Role> = ["admin", "staff", "viewer"];

export const navigationItems: ReadonlyArray<NavigationItem> = [
  {
    label: "ダッシュボード",
    href: "/dashboard",
    order: 10,
    roles: ALL_ROLES,
  },
  {
    label: "利用者",
    href: "/residents",
    order: 20,
    roles: ALL_ROLES,
  },
  {
    label: "期限アラート",
    href: "/insurance-alerts",
    order: 30,
    roles: ALL_ROLES,
  },
  {
    label: "利用者総合保険",
    href: "/comprehensive-insurance",
    order: 40,
    roles: ALL_ROLES,
  },
  {
    label: "未請求一覧",
    href: "/comprehensive-insurance/unbilled",
    order: 50,
    roles: ["admin", "staff"],
  },
  {
    label: "職員管理",
    href: "/staff-accounts",
    order: 60,
    roles: ["admin"],
    permission: "staff_account:manage",
  },
  {
    label: "施設管理",
    href: "/facilities",
    order: 70,
    roles: ["admin"],
    permission: "facility:manage",
  },
  {
    label: "監査ログ",
    href: "/audit-logs",
    order: 80,
    roles: ["admin"],
    permission: "audit_log:read",
  },
];

export function filterNavigationItems(
  items: ReadonlyArray<NavigationItem>,
  session: SessionContext,
): NavigationItem[] {
  return items
    .filter((item) => {
      if (!item.roles) {
        return true;
      }
      return item.roles.includes(session.role);
    })
    .sort((left, right) => left.order - right.order);
}

export function isNavigationItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
