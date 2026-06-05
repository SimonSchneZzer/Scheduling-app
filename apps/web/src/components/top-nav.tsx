"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Calendar" },
  { href: "/participants", label: "Participants" },
  { href: "/rooms", label: "Rooms" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[#d9dee7] bg-white">
      <div className="mx-auto flex max-w-6xl items-center gap-1 px-5">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                active
                  ? "border-[#1f6f5b] text-[#1f6f5b]"
                  : "border-transparent text-[#687385] hover:text-[#1d2430]"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
