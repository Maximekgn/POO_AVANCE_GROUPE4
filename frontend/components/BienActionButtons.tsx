"use client";

import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";

interface BienActionButtonsProps {
  bienId: number;
  bienReference: string;
  isProprio: boolean;
  isAdmin: boolean;
  isLocataire: boolean;
  token: string;
  apiUrl: string;
}

export default function BienActionButtons({
  bienId,
  bienReference,
  isProprio,
  isAdmin,
  isLocataire,
  token,
  apiUrl,
}: BienActionButtonsProps) {
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [expenseData, setExpenseData] = useState({
    categorie: "Réparations",
    libelle: "",
    montant: "",
    date_depense: new Date().toISOString().split("T")[0],
    fournisseur: "",
    numero_facture: "",
  });

  const [incidentData, setIncidentData] = useState({
    titre: "",
    description: "",
    categorie: "EAU",
    urgence: "MOYENNE",
  });

  const handleCreateExpense = async () => {
    if (!expenseData.libelle || !expenseData.montant) {
      toast.error("Veuillez remplir les champs obligatoires.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${apiUrl}/admin/finances/depenses`,
        {
          categorie: expenseData.categorie,
          libelle: expenseData.libelle,
          montant: parseFloat(expenseData.montant),
          date_depense: expenseData.date_depense,
          fournisseur: expenseData.fournisseur || undefined,
          numero_facture: expenseData.numero_facture || undefined,
          bien_id: bienId,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 201) {
        toast.success("Dépense créée avec succès !");
        setShowExpenseModal(false);
        setExpenseData({
          categorie: "Réparations",
          libelle: "",
          montant: "",
          date_depense: new Date().toISOString().split("T")[0],
          fournisseur: "",
          numero_facture: "",
        });
        window.location.reload();
      } else {
        toast.error(res.data?.message || "Erreur création dépense.");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erreur réseau."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateIncident = async () => {
    if (!incidentData.titre || !incidentData.description) {
      toast.error("Veuillez remplir les champs obligatoires.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await axios.post(
        `${apiUrl}/incidents`,
        {
          bien: bienId,
          titre: incidentData.titre,
          description: incidentData.description,
          categorie: incidentData.categorie,
          urgence: incidentData.urgence,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 201) {
        toast.success("Incident signalé avec succès ! Un prestataire vous contactera bientôt.");
        setShowIncidentModal(false);
        setIncidentData({
          titre: "",
          description: "",
          categorie: "EAU",
          urgence: "MOYENNE",
        });
        window.location.reload();
      } else {
        toast.error(res.data?.message || "Erreur signalement incident.");
      }
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Erreur réseau."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Boutons d'action */}
      <div className="flex gap-2 flex-wrap mt-4">
        {/* Admin/Proprio: Ajouter une dépense */}
        {(isAdmin || isProprio) && (
          <button
            onClick={() => setShowExpenseModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
          >
            <span>💰</span>
            Ajouter une dépense
          </button>
        )}

        {/* Locataire: Signaler un incident */}
        {isLocataire && (
          <button
            onClick={() => setShowIncidentModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 transition"
          >
            <span>🔧</span>
            Signaler un incident
          </button>
        )}
      </div>

      {/* Modal Dépense */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-neutral-900">
                💰 Ajouter une dépense
              </h3>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Catégorie *
                </label>
                <select
                  value={expenseData.categorie}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, categorie: e.target.value })
                  }
                  className="w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value="Réparations">Réparations</option>
                  <option value="Entretien">Entretien</option>
                  <option value="Travaux">Travaux</option>
                  <option value="Électricité">Électricité</option>
                  <option value="Plomberie">Plomberie</option>
                  <option value="Assurance">Assurance</option>
                  <option value="Taxe">Taxe</option>
                  <option value="Autre">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Libellé *
                </label>
                <input
                  type="text"
                  value={expenseData.libelle}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, libelle: e.target.value })
                  }
                  placeholder="Ex: Réparation fuite d'eau"
                  className="w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Montant (FCFA) *
                </label>
                <input
                  type="number"
                  value={expenseData.montant}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, montant: e.target.value })
                  }
                  placeholder="50000"
                  className="w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Date de dépense
                </label>
                <input
                  type="date"
                  value={expenseData.date_depense}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, date_depense: e.target.value })
                  }
                  className="w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Fournisseur
                </label>
                <input
                  type="text"
                  value={expenseData.fournisseur}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, fournisseur: e.target.value })
                  }
                  placeholder="Nom du prestataire"
                  className="w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Numéro de facture
                </label>
                <input
                  type="text"
                  value={expenseData.numero_facture}
                  onChange={(e) =>
                    setExpenseData({ ...expenseData, numero_facture: e.target.value })
                  }
                  placeholder="FACT-2024-001"
                  className="w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowExpenseModal(false)}
                disabled={submitting}
                className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateExpense}
                disabled={submitting}
                className="flex-1 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? "Création..." : "Créer la dépense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Incident */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-neutral-900">
                🔧 Signaler un incident
              </h3>
              <button
                onClick={() => setShowIncidentModal(false)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm text-amber-800">
                ℹ️ Votre signalement sera envoyé au propriétaire qui assignera un prestataire.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Titre *
                </label>
                <input
                  type="text"
                  value={incidentData.titre}
                  onChange={(e) =>
                    setIncidentData({ ...incidentData, titre: e.target.value })
                  }
                  placeholder="Ex: Fuite d'eau dans la cuisine"
                  className="w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={incidentData.description}
                  onChange={(e) =>
                    setIncidentData({ ...incidentData, description: e.target.value })
                  }
                  placeholder="Décrivez le problème en détail..."
                  rows={4}
                  className="w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Catégorie *
                </label>
                <select
                  value={incidentData.categorie}
                  onChange={(e) =>
                    setIncidentData({ ...incidentData, categorie: e.target.value })
                  }
                  className="w-full rounded-xl border border-neutral-200 p-3 text-sm outline-none focus:border-amber-500"
                >
                  <option value="EAU">Plomberie / Eau</option>
                  <option value="ELECTRICITE">Électricité</option>
                  <option value="CHAUFFAGE">Chauffage / Climatisation</option>
                  <option value="PORTES_FENETRES">Portes / Fenêtres</option>
                  <option value="APPAREILS">Appareils électroménagers</option>
                  <option value="INFILTRATIONS">Infiltrations / Humidité</option>
                  <option value="NUISIBLES">Nuisibles</option>
                  <option value="AUTRE">Autre</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-2">
                  Urgence *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "FAIBLE", label: "😌 Faible", color: "border-neutral-300" },
                    { value: "MOYENNE", label: "⚠️ Moyenne", color: "border-amber-300" },
                    { value: "ELEVEE", label: "🔴 Élevée", color: "border-orange-300" },
                    { value: "URGENTE", label: "🚨 Urgente", color: "border-red-300" },
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setIncidentData({ ...incidentData, urgence: option.value })
                      }
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition ${
                        incidentData.urgence === option.value
                          ? "border-amber-500 bg-amber-50 text-amber-700"
                          : `${option.color} hover:bg-neutral-50`
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setShowIncidentModal(false)}
                disabled={submitting}
                className="flex-1 rounded-xl border border-neutral-200 py-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleCreateIncident}
                disabled={submitting}
                className="flex-1 rounded-xl bg-amber-600 py-3 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {submitting ? "Envoi..." : "Signaler l'incident"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
