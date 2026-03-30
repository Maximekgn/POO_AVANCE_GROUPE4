"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Home,
  Banknote,
  Users,
  MessageSquare,
  Settings,
  LogOut,
  Layers,
  FileText,
  FileCheck,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Image from "next/image";

const links = [
  { href: "/admin/dashboard", label: "Vue d'ensemble", icon: LayoutDashboard },
  { href: "/admin/dashboard/biens", label: "Biens", icon: Home },
  { href: "/admin/dashboard/finances", label: "Finances", icon: Banknote },
  {
    href: "/admin/dashboard/demandes-actions",
    label: "Demandes",
    icon: FileText,
  },
  { href: "/admin/dashboard/baux", label: "Baux", icon: FileCheck },
  { href: "/admin/dashboard/utilisateurs", label: "Utilisateurs", icon: Users },
  { href: "/admin/dashboard/categories", label: "Catégories", icon: Layers },
  {
    href: "/admin/dashboard/messages",
    label: "Messagerie",
    icon: MessageSquare,
  },
];

const AdminSidebar = () => {
  const pathname = usePathname();
  const currentPath = pathname || "";

  return (
    <aside className="w-full rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm md:w-72">
      <div className="mb-8 flex items-center justify-center gap-3 px-2">
        <Image
          src="/logo.png"
          alt="Logo"
          width={110}
          height={110}
          className="object-contain"
        />
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
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? "bg-blue-500 text-white shadow-lg shadow-blue-200"
                  : "text-neutral-500 hover:bg-blue-50 hover:text-blue-500"
              }`}
            >
              <link.icon
                size={20}
                className={`transition-colors ${isActive ? "text-white" : "text-black group-hover:text-blue-500"}`}
              />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-10 border-t border-neutral-100 pt-6 flex flex-col gap-2">
        <Link
          href="/admin/dashboard/settings"
          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-black hover:text-neutral-600 transition-colors"
        >
          <Settings size={18} />
          <span>Paramètres</span>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-3 px-4 py-2 text-sm font-medium text-black hover:text-blue-600 transition-colors"
        >
          <LogOut size={18} />
          <span>Déconnexion</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
