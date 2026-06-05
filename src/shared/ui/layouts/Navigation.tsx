"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import type { SessionContext } from "@/shared/authorization/types";
import {
  filterNavigationItems,
  isNavigationItemActive,
  navigationItems,
  type NavigationItem,
} from "@/shared/nav/navigation";
import { cn } from "@/shared/ui/primitives/cn";

interface NavigationProps {
  session: SessionContext;
}

function NavigationLinks({
  items,
  pathname,
  onNavigate,
}: {
  items: ReadonlyArray<NavigationItem>;
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => {
        const active = isNavigationItemActive(pathname, item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "block rounded-md px-3 py-2 text-sm font-medium transition-colors motion-reduce:transition-none",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-muted",
              )}
            >
              {item.icon ? <span className="mr-2">{item.icon}</span> : null}
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Navigation({ session }: NavigationProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = filterNavigationItems(navigationItems, session);

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center rounded-md border border-muted-foreground/30 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary md:hidden"
        aria-expanded={mobileOpen}
        aria-controls="app-navigation"
        onClick={() => setMobileOpen((open) => !open)}
      >
        メニュー
      </button>

      <nav
        id="app-navigation"
        aria-label="メインナビゲーション"
        className="hidden w-60 shrink-0 border-r border-muted-foreground/20 bg-background p-4 md:block"
      >
        <NavigationLinks items={items} pathname={pathname} />
      </nav>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 md:hidden" role="presentation">
          <button
            type="button"
            aria-label="メニューを閉じる"
            className="absolute inset-0 bg-foreground/40 motion-reduce:transition-none"
            onClick={() => setMobileOpen(false)}
          />
          <nav
            aria-label="メインナビゲーション"
            className="relative z-10 h-full w-72 max-w-[85vw] bg-background p-4 shadow-lg motion-reduce:transition-none"
          >
            <NavigationLinks
              items={items}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
            />
          </nav>
        </div>
      ) : null}
    </>
  );
}
