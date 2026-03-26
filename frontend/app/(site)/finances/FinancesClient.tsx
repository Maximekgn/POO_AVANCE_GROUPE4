"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Container from "@/components/Container";
import Heading from "@/components/Heading";

interface FinancesClientProps {
    financeData: any;
}

const FinancesClient: React.FC<FinancesClientProps> = ({ financeData }) => {
    const searchParams = useSearchParams();
    const filterBienId = searchParams?.get("bien_id");

    const [activeTab, setActiveTab] = useState<"SUMMARY" | "REVENUES" | "IMPAYES" | "DEPENSES">("SUMMARY");

    const rawHistory = financeData?.history || [];

    const history = useMemo(() => {
        if (!filterBienId) return rawHistory;
        return rawHistory.filter((entry: any) => String(entry.bien_id) === String(filterBienId));
    }, [rawHistory, filterBienId]);

    const [depenses, revenus] = useMemo(() => {
        if (!filterBienId) return [financeData?.summary?.depenses_total || 0, financeData?.summary?.revenus_total || 0];
        let filteredRevenus = 0;
        let filteredDepenses = 0;
        history.forEach((entry: any) => {
            if (entry.kind === "REVENU") filteredRevenus += entry.montant;
            if (entry.kind === "DEPENSE") filteredDepenses += entry.montant;
        });
        return [filteredDepenses, filteredRevenus];
    }, [financeData, history, filterBienId]);

    // FIXME: Need exact types from backend for impayés
    const locataires_impayes = 0;
    const balance = revenus - depenses;

    const handleNotifyLocataire = (demandeId: number) => {
        // Appel API simulé pour le rappel de paiement
        alert(`Un email de relance a été envoyé au locataire concernant la demande #${demandeId}`);
    };

    const handleAddExpense = () => {
        alert("Ouvrir une modale pour enregistrer une dépense...");
    };

    return (
        <Container>
            <div className="pt-24 pb-12 w-full max-w-7xl mx-auto flex flex-col gap-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <Heading
                        title="Mes Finances Détaillées"
                        subtitle="Suivez vos revenus par bien, enregistrez vos dépenses et gérez les impayés"
                    />
                    <button
                        onClick={handleAddExpense}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl transition shadow-md flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Enregistrer une dépense
                    </button>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            </div>
                            <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Revenus</p>
                        </div>
                        <p className="text-3xl font-black text-neutral-900 mt-2">{new Intl.NumberFormat('fr-FR').format(revenus)} <span className="text-base text-neutral-500 font-normal">FCFA</span></p>
                    </div>
                    <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-rose-100 p-2 rounded-xl text-rose-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
                            </div>
                            <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Dépenses</p>
                        </div>
                        <p className="text-3xl font-black text-neutral-900 mt-2">{new Intl.NumberFormat('fr-FR').format(depenses)} <span className="text-base text-neutral-500 font-normal">FCFA</span></p>
                    </div>
                    <div className="rounded-3xl border border-neutral-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-amber-100 p-2 rounded-xl text-amber-600">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest">Loyers Impayés</p>
                        </div>
                        <p className="text-3xl font-black text-amber-600 mt-2">{new Intl.NumberFormat('fr-FR').format(locataires_impayes)} <span className="text-base font-normal opacity-80">FCFA</span></p>
                    </div>
                    <div className="rounded-3xl border border-neutral-100 bg-gray-900 text-white p-6 shadow-sm hover:shadow-md transition">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="bg-white/20 p-2 rounded-xl text-white">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                            </div>
                            <p className="text-sm font-bold text-neutral-300 uppercase tracking-widest">Balance Finale</p>
                        </div>
                        <p className="text-3xl font-black text-white mt-2">{balance >= 0 ? "+" : ""}{new Intl.NumberFormat('fr-FR').format(balance)} <span className="text-base text-black font-normal">FCFA</span></p>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex gap-4 border-b border-neutral-200 mt-6 overflow-x-auto custom-scrollbar pb-2">
                    {["SUMMARY", "REVENUES", "DEPENSES", "IMPAYES"].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={`font-bold text-sm px-4 py-2 rounded-t-lg transition whitespace-nowrap ${activeTab === tab ? "text-emerald-600 border-b-2 border-emerald-600" : "text-neutral-500 hover:text-neutral-900"
                                }`}
                        >
                            {tab === "SUMMARY" ? "Historique complet" : tab === "REVENUES" ? "Revenus par bien" : tab === "DEPENSES" ? "Dépenses enregistrées" : "Loyers Impayés"}
                        </button>
                    ))}
                </div>

                {/* TAB CONTENTS */}
                <div className="min-h-[400px]">
                    {activeTab === "SUMMARY" && (
                        <div className="overflow-x-auto rounded-3xl border border-neutral-200 bg-white">
                            <table className="min-w-full text-sm">
                                <thead className="bg-neutral-50 text-left text-neutral-500 uppercase tracking-wider font-bold text-[10px]">
                                    <tr>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Concernant</th>
                                        <th className="px-6 py-4">Période / Date</th>
                                        <th className="px-6 py-4">Statut</th>
                                        <th className="px-6 py-4 text-right">Montant</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-100">
                                    {history.length === 0 ? (
                                        <tr>
                                            <td className="px-6 py-12 text-neutral-500 text-center" colSpan={5}>
                                                Aucun mouvement financier à afficher.
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((entry: any, index: number) => (
                                            <tr key={`${entry.kind}-${entry.demande_id}-${index}`} className="hover:bg-neutral-50/50 transition">
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${entry.kind === "REVENU" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-rose-50 text-rose-700 border-rose-100"
                                                        }`}>
                                                        {entry.kind}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-neutral-900 line-clamp-1">{entry.bien_reference || `Bien #${entry.bien_id}`}</div>
                                                    <div className="text-xs text-neutral-500 mt-1 uppercase">{entry.type_demande || "Autre"}</div>
                                                </td>
                                                <td className="px-6 py-4 text-neutral-600">
                                                    {entry.date_debut || "-"} {entry.date_fin ? `au ${entry.date_fin}` : ""}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="text-neutral-500 font-medium">{entry.statut || "-"}</span>
                                                </td>
                                                <td className={`px-6 py-4 text-right text-base font-black ${entry.kind === "REVENU" ? "text-emerald-600" : "text-neutral-900"}`}>
                                                    {entry.kind === "REVENU" ? "+" : "-"} {new Intl.NumberFormat('fr-FR').format(entry.montant)}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === "REVENUES" && (
                        <div className="bg-white rounded-3xl border border-neutral-200 p-8 text-center text-neutral-500 flex flex-col items-center justify-center min-h-[300px]">
                            <svg className="w-16 h-16 text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <h3 className="text-xl font-bold text-neutral-900">Revenus par bien (Bientôt disponible)</h3>
                            <p className="mt-2 max-w-md mx-auto">Cette vue regroupera les revenus totaux générés par chaque propriété individuellement pour mieux évaluer leur rentabilité.</p>
                        </div>
                    )}

                    {activeTab === "DEPENSES" && (
                        <div className="bg-white rounded-3xl border border-neutral-200 p-8 text-center text-neutral-500 flex flex-col items-center justify-center min-h-[300px]">
                            <svg className="w-16 h-16 text-neutral-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            <h3 className="text-xl font-bold text-neutral-900">Vos Dépenses</h3>
                            <p className="mt-2 max-w-md mx-auto mb-6">Enregistrez les travaux, réparations, frais d'assurance ou d'agence pour pouvoir calculer rapidement le retour sur investissement réel.</p>
                            <button onClick={handleAddExpense} className="mx-auto bg-neutral-900 text-white font-bold py-2 px-6 rounded-xl hover:bg-neutral-800 transition">Associer une dépense</button>
                        </div>
                    )}

                    {activeTab === "IMPAYES" && (
                        <div className="bg-amber-50 rounded-3xl border border-amber-100 p-8 flex flex-col items-center text-center">
                            <div className="bg-amber-100 p-4 rounded-full text-amber-600 mb-6">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <h3 className="text-xl font-bold text-amber-900">Gestion des Loyers Impayés</h3>
                            <p className="text-amber-800/80 mt-2 mb-8 max-w-lg">Identifiez rapidement les locataires en retard de paiement. Vous pourrez leur envoyer un email de relance automatiquement depuis cette interface.</p>

                            {/* Simulation d'une alerte d'impayé pour la démo UI */}
                            <div className="w-full max-w-3xl bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm text-left flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold uppercase text-amber-600 tracking-wider">Retard de 15 jours</span>
                                    <div className="font-bold text-lg text-neutral-900">Maison Cocotier - Lomé</div>
                                    <div className="text-sm text-neutral-500">Locataire: Jean Marc D. • Loyer d'Octobre</div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <span className="block text-2xl font-black text-amber-600">120 000 FCFA</span>
                                    </div>
                                    <button
                                        onClick={() => handleNotifyLocataire(999)}
                                        className="bg-amber-100 text-amber-700 hover:bg-amber-200 hover:text-amber-800 p-3 rounded-xl transition"
                                        title="Envoyer email de relance"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Container>
    );
};

export default FinancesClient;
