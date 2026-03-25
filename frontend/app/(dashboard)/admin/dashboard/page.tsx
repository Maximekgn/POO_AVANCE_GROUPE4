import Link from "next/link";
import {
  FiHome,
  FiUsers,
  FiFileText,
  FiTrendingUp,
  FiClock,
  FiActivity
} from "react-icons/fi";

import getCurrentUser from "@/app/(site)/actions/getCurrentUser";
import Heading from "@/components/Heading";

import { getAdminDashboardStats } from "./lib/adminApi";
import { RevenueHistoryChart, CategoryPieChart } from "./components/DashboardCharts";

export const dynamic = "force-dynamic";

export default async function AdminDashboardHomePage() {
  const currentUser = await getCurrentUser();
  const stats = await getAdminDashboardStats(currentUser || {});

  if (!stats) {
    return (
      <div className="flex h-[400px] items-center justify-center rounded-2xl border border-dashed border-neutral-300">
        <p className="text-neutral-500">Impossible de charger les statistiques.</p>
      </div>
    );
  }

  const kpis = [
    { label: "Total Biens", value: stats.kpis.total_biens, icon: FiHome, color: "text-red-500", bg: "bg-blue-50" },
    { label: "Utilisateurs", value: stats.kpis.total_users, icon: FiUsers, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Contrats Actifs", value: stats.kpis.total_baux, icon: FiFileText, color: "text-green-600", bg: "bg-green-50" },
    { label: "Dossiers en attente", value: stats.kpis.pending_demands, icon: FiClock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Revenus Totaux", value: `${stats.kpis.total_revenue.toLocaleString()} €`, icon: FiTrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-8 pb-10">
      <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <Heading
          title="Tableau de bord administrateur"
          subtitle="Aperçu global de l'activité de la plateforme"
        />
        <div className="flex gap-2">
          <Link
            href="/admin/dashboard/biens"
            className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-medium hover:bg-neutral-50"
          >
            Gérer les biens
          </Link>
          <button className="hidden rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 md:block">
            Exporter PDF
          </button>
        </div>
      </header>

      {/* KPI Section */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {kpis.map((kpi, index) => (
          <article key={index} className="flex items-center gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${kpi.bg} ${kpi.color}`}>
              <kpi.icon size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider">{kpi.label}</p>
              <p className="mt-1 text-xl font-bold text-neutral-900">{kpi.value}</p>
            </div>
          </article>
        ))}
      </section>

      {/* Charts Section */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FiTrendingUp className="text-blue-500" /> Evolution des revenus (payés)
            </h2>
            <span className="text-xs text-neutral-500">Derniers 12 mois</span>
          </div>
          <RevenueHistoryChart data={stats.revenue_history} />
        </article>

        <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <FiActivity className="text-blue-500" /> Répartition par catégorie
            </h2>
          </div>
          <CategoryPieChart data={stats.category_stats} />
        </article>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Activity Table */}
        <article className="lg:col-span-2 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Récentes signatures de baux</h2>
            <Link href="/admin/dashboard/baux" className="text-sm font-medium text-red-500 hover:underline">
              Tout voir
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-neutral-100 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  <th className="pb-3 pr-4">Référence</th>
                  <th className="pb-3 pr-4">Client</th>
                  <th className="pb-3 pr-4">Bien</th>
                  <th className="pb-3 pr-4">Date début</th>
                  <th className="pb-3 text-right">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {stats.recent_activity.map((item) => (
                  <tr key={item.id} className="group hover:bg-neutral-50/50">
                    <td className="py-4 pr-4 text-sm font-medium text-neutral-900">{item.numero}</td>
                    <td className="py-4 pr-4 text-sm text-neutral-600">{item.client}</td>
                    <td className="py-4 pr-4 text-sm text-neutral-600">{item.bien}</td>
                    <td className="py-4 pr-4 text-sm text-neutral-500">
                      {new Date(item.date).toLocaleDateString()}
                    </td>
                    <td className="py-4 text-right">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${item.statut === 'EN_COURS' ? 'bg-green-100 text-green-800' :
                        item.statut === 'EN_ATTENTE_SIGNATURE' ? 'bg-amber-100 text-amber-800' :
                          'bg-neutral-100 text-neutral-800'
                        }`}>
                        {item.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.recent_activity.length === 0 && (
              <p className="py-10 text-center text-sm text-neutral-400">Aucune activité récente.</p>
            )}
          </div>
        </article>

        {/* Quick Actions */}
        <article className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 text-lg font-semibold">Actions rapides</h2>
          <div className="space-y-3">
            {[
              { label: "Validations en attente", href: "/admin/dashboard/biens", count: stats.kpis.pending_demands },
              { label: "Finances & Loyers", href: "/admin/dashboard/finances" },
              { label: "Utilisateurs", href: "/admin/dashboard/utilisateurs" },
              { label: "Demandes d'action", href: "/admin/dashboard/demandes-actions" },
              { label: "Messagerie", href: "/admin/dashboard/messages" },
            ].map((action, i) => (
              <Link
                key={i}
                href={action.href}
                className="flex items-center justify-between rounded-xl border border-neutral-100 bg-white p-4 text-sm font-medium text-neutral-700 transition-all hover:border-blue-200 hover:bg-blue-50/30 hover:text-red-500"
              >
                <span>{action.label}</span>
                {action.count !== undefined ? (
                  <span className="min-w-[20px] rounded-full bg-amber-100 px-2 py-0.5 text-center text-[10px] font-bold text-amber-600">
                    {action.count}
                  </span>
                ) : (
                  <svg className="h-4 w-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </Link>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
