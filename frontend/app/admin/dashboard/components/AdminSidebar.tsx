"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin/dashboard", label: "Vue d'ensemble" },
  { href: "/admin/dashboard/biens", label: "Biens" },
  { href: "/admin/dashboard/finances", label: "Finances" },
  { href: "/admin/dashboard/utilisateurs", label: "Utilisateurs" },
  { href: "/admin/dashboard/messages", label: "Messagerie" },
];

const AdminSidebar = () => {
  const pathname = usePathname();
  const currentPath = pathname || "";

  return (
    <aside className="w-full rounded-2xl border border-neutral-200 bg-white p-4 md:sticky md:top-24 md:w-72 md:self-start">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Espace admin
      </p>
      <nav className="flex flex-col gap-1">
        {links.map((link) => {
          const isActive =
            currentPath === link.href ||
            (link.href !== "/admin/dashboard" &&
              currentPath.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
                isActive
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-700 hover:bg-neutral-100"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default AdminSidebar;
