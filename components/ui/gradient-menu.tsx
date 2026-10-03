"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { IoCameraOutline, IoHeartOutline, IoHomeOutline, IoShareSocialOutline, IoVideocamOutline } from "react-icons/io5";
import { cn } from "@/lib/utils";

/**
 * Gradient menu (adapted from the shared component).
 * Changes from the original, so it fits this app:
 *  - Colours come from the app's brand palette (one consistent gradient), not a different colour per item.
 *  - Items can be links (Next.js <Link>) or buttons, and an "active" item stays expanded,
 *    because phones have no hover — the current page shows its label.
 *  - Typed for TypeScript (CSS custom properties) and respects "reduce motion".
 */

export const BRAND_FROM = "#1749c9"; // var(--color-brand)
export const BRAND_TO = "#3d7bff"; // var(--color-brand-2)

export interface GradientMenuItem {
  title: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  gradientFrom?: string;
  gradientTo?: string;
}

type GradientVars = CSSProperties & { "--gradient-from": string; "--gradient-to": string };

const SIZES = {
  // Original demo size
  md: { item: "w-[60px] h-[60px] hover:w-[180px] data-[active=true]:w-[180px]", icon: "text-2xl", label: "text-sm" },
  // Compact size for a phone bottom bar (5 items fit in 360px)
  sm: { item: "w-12 h-12 hover:w-[112px] data-[active=true]:w-[112px]", icon: "text-[22px]", label: "text-[13px]" },
} as const;

const defaultItems: GradientMenuItem[] = [
  { title: "Home", icon: <IoHomeOutline /> },
  { title: "Video", icon: <IoVideocamOutline /> },
  { title: "Photo", icon: <IoCameraOutline /> },
  { title: "Share", icon: <IoShareSocialOutline /> },
  { title: "Tym", icon: <IoHeartOutline /> },
];

export default function GradientMenu({
  items = defaultItems,
  activeHref,
  size = "md",
  className,
  ariaLabel = "Menu",
}: {
  items?: GradientMenuItem[];
  activeHref?: string;
  size?: keyof typeof SIZES;
  className?: string;
  ariaLabel?: string;
}) {
  const sz = SIZES[size];
  return (
    <nav aria-label={ariaLabel} className={cn("flex justify-center items-center", className)}>
      <ul className={cn("flex items-center m-0 p-0 list-none", size === "sm" ? "gap-1.5" : "gap-6")}>
        {items.map(({ title, icon, href, onClick, gradientFrom = BRAND_FROM, gradientTo = BRAND_TO }) => {
          const active = Boolean(href && activeHref && (activeHref === href || activeHref.startsWith(href + "/")));
          const vars: GradientVars = { "--gradient-from": gradientFrom, "--gradient-to": gradientTo };
          const inner = (
            <>
              {/* Gradient background on hover / when active */}
              <span aria-hidden className="absolute inset-0 rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] opacity-0 transition-all duration-500 group-hover:opacity-100 group-data-[active=true]:opacity-100 motion-reduce:transition-none" />
              {/* Soft glow underneath */}
              <span aria-hidden className="absolute top-[10px] inset-x-0 h-full rounded-full bg-[linear-gradient(45deg,var(--gradient-from),var(--gradient-to))] blur-[15px] opacity-0 -z-10 transition-all duration-500 group-hover:opacity-50 group-data-[active=true]:opacity-40 motion-reduce:transition-none" />
              {/* Icon */}
              <span aria-hidden className="relative z-10 flex transition-all duration-500 group-hover:scale-0 group-data-[active=true]:scale-0 motion-reduce:transition-none">
                <span className={cn(sz.icon, "flex text-ink-2")}>{icon}</span>
              </span>
              {/* Title */}
              <span className={cn("absolute z-10 text-white font-bold uppercase tracking-wide whitespace-nowrap transition-all duration-500 scale-0 group-hover:scale-100 group-data-[active=true]:scale-100 delay-150 motion-reduce:transition-none", sz.label)}>
                {title}
              </span>
            </>
          );
          const cls = cn(
            "relative bg-white shadow-lg rounded-full flex items-center justify-center transition-all duration-500 hover:shadow-none data-[active=true]:shadow-none group cursor-pointer no-underline outline-offset-2 motion-reduce:transition-none",
            sz.item
          );
          return (
            <li key={title} style={vars} className="flex">
              {href ? (
                <Link href={href} aria-label={title} aria-current={active ? "page" : undefined} data-active={active} className={cls}>
                  {inner}
                </Link>
              ) : (
                <button type="button" aria-label={title} onClick={onClick} data-active={false} className={cn(cls, "border-0 p-0")}>
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
