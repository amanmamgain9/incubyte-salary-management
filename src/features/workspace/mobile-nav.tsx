"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { navSections } from "@/features/workspace/nav-items";

/**
 * The rail's links plus `footer`. Always visible from `md` up; below it they collapse behind a labelled Menu
 * toggle that closes again after a navigation.
 */
export function MobileNav({ brand, footer }: { brand: ReactNode; footer: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  if (open && openedAt !== pathname) setOpen(false);

  return (
    <>
      <div className="flex items-center justify-between gap-3 md:block md:px-3 md:pb-10">
        {brand}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="workspace-navigation"
          onClick={() => {
            setOpenedAt(pathname);
            setOpen((current) => !current);
          }}
          className="inline-flex cursor-pointer items-center gap-2 rounded-control border border-line-control bg-surface px-2.5 py-2 text-label text-ink-secondary md:hidden"
        >
          <Icon name="menu" size={17} />
          Menu
        </button>
      </div>
      <div className={cn("flex-1 flex-col pt-6 md:flex md:pt-0", open ? "flex" : "hidden")}>
        <nav id="workspace-navigation" aria-label="Workspace">
          {navSections
            .filter((section) => section.items.length > 0)
            .map((section, index) => (
              <div key={section.label} className={index > 0 ? "mt-7" : undefined}>
                <div className="mb-2 px-3 text-caption font-semibold tracking-[0.9px] text-muted-soft uppercase">
                  {section.label}
                </div>
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "my-1 flex min-h-10.75 items-center gap-3 rounded-control border px-3 py-2.5 text-body",
                        active
                          ? "border-rail-active-line bg-rail-active font-semibold text-accent-ink"
                          : "border-transparent text-rail-ink hover:bg-rail-hover hover:text-ink-soft",
                      )}
                    >
                      <span className={active ? "text-accent" : "text-muted-soft"}>
                        <Icon name={item.icon} />
                      </span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            ))}
        </nav>
        <div className="mt-auto pt-6">{footer}</div>
      </div>
    </>
  );
}
