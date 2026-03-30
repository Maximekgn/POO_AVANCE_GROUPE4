"use client";

import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, TrendingDown, FileText, User, Plus, X } from "lucide-react";

interface BienFinancierData {
  bien: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
  };
  bail_actif: {
    id: number;
    numero_bail: string;
    statut: string;
    date_entree: string;
    date_sortie: string;
    loyer_actuel: string;
    depot_garantie: string;
    locataire: {
      nom: string;
      email: string;
      telephone: string;
    };
  } | null;
  paiements_recents: Array<{
    id: number;
    reference: string;
    montant: string;
    statut: string;
    date_paiement: string;
    mode_paiement: string;
  }>;
  total_encaisse: string;
  depenses_recentes: Array<{
    id: number;
    montant: string;
    categorie: string;
    description: string;
    date_depense: string;
  }>;
  total_depenses: string;
  revenu_net: string;
}

interface BienFinancierSectionProps {
  bienId: number;
  token: string;
  apiUrl: string;
}

export default function BienFinancierSection({
  bienId,
  token,
  apiUrl,
}: BienFinancierSectionProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<BienFinancierData | null>(null);
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);

  const [expenseForm, setExpenseForm] = useState({
    montant: "",
    categorie: "Entretien",
    description: "",
    date_depense: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    fetchFinancierData();
  }, [bienId]);

  async function fetchFinancierData() {
    setLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/biens/${bienId}/financier`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Impossible de charger les données financières");
      }

      const result = await response.json();
      setData(result);
    } catch (error: any) {
      console.error("Erreur chargement données financières:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    setAddingExpense(true);

    try {
      const response = await fetch(
        `${apiUrl}/biens/${bienId}/depenses`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(expenseForm),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || error.montant || "Erreur lors de l'ajout");
      }

      // Rafraîchir les données
      await fetchFinancierData();
      setShowAddExpense(false);
      setExpenseForm({
        montant: "",
        categorie: "Entretien",
        description: "",
        date_depense: new Date().toISOString().split("T")[0],
      });
      alert("✅ Dépense ajoutée avec succès !");
    } catch (error: any) {
      alert(`❌ Erreur : ${error.message}`);
    } finally {
      setAddingExpense(false);
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8 text-neutral-500">
        Chargement des informations financières...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8 text-neutral-500">
        Impossible de charger les données financières
      </div>
    );
  }

  const formatFcfa = (value: string) => {
    const num = parseFloat(value);
    return isNaN(num) ? "0" : num.toLocaleString("fr-FR");
  };

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Informations financières
        </h3>
        <button
          onClick={() => setShowAddExpense(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" />
          Ajouter une dépense
        </button>
      </div>

      {/* Bail actif */}
      {data.bail_actif ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-bold text-green-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Bail en cours
            </h4>
            <span className="text-xs font-semibold bg-green-200 text-green-800 px-3 py-1 rounded-full">
              {data.bail_actif.statut === "EN_COURS" ? "Actif" : "En attente"}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-green-700">Numéro de bail</p>
              <p className="font-semibold text-green-900">
                {data.bail_actif.numero_bail}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-700">Loyer mensuel</p>
              <p className="font-bold text-green-900">
                {formatFcfa(data.bail_actif.loyer_actuel)} FCFA
              </p>
            </div>
            <div>
              <p className="text-xs text-green-700">Locataire</p>
              <p className="font-semibold text-green-900 flex items-center gap-1">
                <User className="w-3 h-3" />
                {data.bail_actif.locataire.nom}
              </p>
            </div>
            <div>
              <p className="text-xs text-green-700">Période</p>
              <p className="text-sm text-green-900">
                {new Date(data.bail_actif.date_entree).toLocaleDateString("fr-FR")} -{" "}
                {new Date(data.bail_actif.date_sortie).toLocaleDateString("fr-FR")}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-center text-neutral-500">
          Aucun bail actif pour ce bien
        </div>
      )}

      {/* Résumé financier */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <p className="text-xs text-emerald-700">Total encaissé</p>
          </div>
          <p className="text-lg font-bold text-emerald-900">
            {formatFcfa(data.total_encaisse)} FCFA
          </p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <p className="text-xs text-red-700">Total dépenses</p>
          </div>
          <p className="text-lg font-bold text-red-900">
            {formatFcfa(data.total_depenses)} FCFA
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-600" />
            <p className="text-xs text-blue-700">Revenu net</p>
          </div>
          <p className={`text-lg font-bold ${parseFloat(data.revenu_net) >= 0 ? "text-blue-900" : "text-red-900"}`}>
            {formatFcfa(data.revenu_net)} FCFA
          </p>
        </div>
      </div>

      {/* Paiements récents */}
      <div>
        <h4 className="font-bold text-neutral-900 mb-3">Paiements récents</h4>
        {data.paiements_recents.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Référence</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Mode</th>
                  <th className="px-4 py-3 text-right font-semibold text-neutral-700">Montant</th>
                  <th className="px-4 py-3 text-center font-semibold text-neutral-700">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.paiements_recents.map((paiement) => (
                  <tr key={paiement.id}>
                    <td className="px-4 py-3 text-neutral-900">{paiement.reference}</td>
                    <td className="px-4 py-3 text-neutral-600">
                      {paiement.date_paiement ? new Date(paiement.date_paiement).toLocaleDateString("fr-FR") : "-"}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{paiement.mode_paiement || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                      {formatFcfa(paiement.montant)} FCFA
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        paiement.statut === "PAYE" || paiement.statut === "PAYE_A_L_ADMIN"
                          ? "bg-green-100 text-green-800"
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {paiement.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-neutral-500 bg-neutral-50 rounded-xl">
            Aucun paiement enregistré
          </div>
        )}
      </div>

      {/* Dépenses récentes */}
      <div>
        <h4 className="font-bold text-neutral-900 mb-3">Dépenses récentes</h4>
        {data.depenses_recentes.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Catégorie</th>
                  <th className="px-4 py-3 text-left font-semibold text-neutral-700">Description</th>
                  <th className="px-4 py-3 text-right font-semibold text-neutral-700">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {data.depenses_recentes.map((depense) => (
                  <tr key={depense.id}>
                    <td className="px-4 py-3 text-neutral-600">
                      {depense.date_depense ? new Date(depense.date_depense).toLocaleDateString("fr-FR") : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-neutral-100 text-neutral-700">
                        {depense.categorie}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-neutral-600">{depense.description || "-"}</td>
                    <td className="px-4 py-3 text-right font-semibold text-red-700">
                      -{formatFcfa(depense.montant)} FCFA
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-4 text-neutral-500 bg-neutral-50 rounded-xl">
            Aucune dépense enregistrée
          </div>
        )}
      </div>

      {/* Modal d'ajout de dépense */}
      {showAddExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-neutral-900">Ajouter une dépense</h3>
              <button
                onClick={() => setShowAddExpense(false)}
                className="p-2 hover:bg-neutral-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Montant (FCFA) *
                </label>
                <input
                  type="number"
                  value={expenseForm.montant}
                  onChange={(e) => setExpenseForm({ ...expenseForm, montant: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Ex: 50000"
                  required
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Catégorie *
                </label>
                <select
                  value={expenseForm.categorie}
                  onChange={(e) => setExpenseForm({ ...expenseForm, categorie: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Entretien">Entretien</option>
                  <option value="Réparation">Réparation</option>
                  <option value="Charges">Charges</option>
                  <option value="Taxe">Taxe</option>
                  <option value="Assurance">Assurance</option>
                  <option value="Gestion">Gestion</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Description
                </label>
                <textarea
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  rows={3}
                  placeholder="Détails de la dépense..."
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Date de la dépense
                </label>
                <input
                  type="date"
                  value={expenseForm.date_depense}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date_depense: e.target.value })}
                  className="w-full rounded-xl border border-neutral-300 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddExpense(false)}
                  className="flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 transition"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={addingExpense}
                  className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  {addingExpense ? "Ajout..." : "Ajouter"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
