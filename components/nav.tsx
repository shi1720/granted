"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AiStatusBadge, Logo } from "./ui";
import { useGranted } from "./store";

const LINKS = [
  { href: "/discover", label: "Discover" },
  { href: "/pipeline", label: "Pipeline" },
  { href: "/onboarding", label: "Organization" },
];

export function Nav() {
  const pathname = usePathname();
  const { org, pipeline, aiStatus, hydrated } = useGranted();

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 sm:flex">
            {LINKS.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                    active ? "bg-pine-50 text-pine-900" : "text-ink-soft hover:text-pine-700"
                  }`}
                >
                  {l.label}
                  {l.href === "/pipeline" && hydrated && pipeline.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-pine-700 px-1.5 py-0.5 text-[10px] font-semibold text-paper">
                      {pipeline.length}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <AiStatusBadge {...aiStatus} />
          {hydrated && org && (
            <Link
              href="/onboarding"
              className="hidden max-w-44 truncate rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:border-pine-600 md:block"
              title={org.name}
            >
              {org.name}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
