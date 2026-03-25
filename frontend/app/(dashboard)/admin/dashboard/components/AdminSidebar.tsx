"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FiGrid,
  FiHome,
  FiDollarSign,
  FiUsers,
  FiMessageSquare,
  FiSettings,
  FiLogOut
} from "react-icons/fi";
import { signOut } from "next-auth/react";

const links = [
  { href: "/admin/dashboard", label: "Vue d'ensemble", icon: FiGrid },
  { href: "/admin/dashboard/biens", label: "Biens", icon: FiHome },
  { href: "/admin/dashboard/finances", label: "Finances", icon: FiDollarSign },
  { href: "/admin/dashboard/utilisateurs", label: "Utilisateurs", icon: FiUsers },
  { href: "/admin/dashboard/messages", label: "Messagerie", icon: FiMessageSquare },
];

const AdminSidebar = () => {
  const pathname = usePathname();
  const currentPath = pathname || "";

  return (
    <aside className="w-full rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:sticky md:top-[50%] md:translate-y-[-50%] md:w-72 md:self-center">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="h-2 w-8 rounded-full bg-red-500" />
        <p className="text-sm font-bold uppercase tracking-widest text-neutral-400">
          Admin
        </p>
      </div>

      <nav className="flex flex-col gap-2">
        {links.map((link) => {
          const isActive =
            currentPath === link.href ||
            (link.href !== "/admin/dashboard" &&
              currentPath.startsWith(link.href));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${isActive
                ? "bg-red-500 text-white shadow-lg shadow-blue-200"
                : "text-neutral-500 hover:bg-blue-50 hover:text-red-500"
                }`}
            >
              <link.icon
                size={20}
                className={`transition-colors ${isActive ? "text-white" : "text-neutral-400 group-hover:text-red-500"}`}
              />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 border-t border-neutral-100 pt-6 flex flex-col gap-2">
        <Link
          href="/admin/dashboard/settings"
          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-neutral-400 hover:text-neutral-600 transition-colors"
        >
          <FiSettings size={18} />
          <span>Paramètres</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-neutral-400 hover:text-red-600 transition-colors"
        >
          <FiLogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
