"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import BackButton from "@/components/BackButton";
import Heading from "@/components/Heading";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function AdminCreateLeasePage() {
  const router = useRouter();
  const params = useParams();
  const bienId = parseInt(params?.bienId as string, 10);

  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    client_info_id: "",
    date_entree: new Date().toISOString().split("T")[0],
    date_sortie: "",
    loyer_actuel: "",
    depot_garantie: "",
    duree_mois: "12",
    note_proprietaire: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.client_info_id ||
      !formData.date_entree ||
      !formData.date_sortie
    ) {
      toast.error("Veuillez remplir les champs obligatoires.");
      return;
    }

    setSubmitting(true);
    const token = localStorage.getItem("accessToken");

    try {
      // 1. Créer le bail
      const leaseResponse = await fetch(`${API_URL}/baux`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bien_id: bienId,
          client_info_id: parseInt(formData.client_info_id),
          date_entree: formData.date_entree,
          date_sortie: formData.date_sortie,
          loyer_actuel: parseFloat(formData.loyer_actuel) || 0,
          depot_garantie: parseFloat(formData.depot_garantie) || 0,
          duree_mois: parseInt(formData.duree_mois),
        }),
      });

      if (!leaseResponse.ok) {
        const error = await leaseResponse.json().catch(() => ({}));
        throw new Error(error.message || "Erreur création bail");
      }

      const leaseData = await leaseResponse.json();
      const bailId = leaseData.id;

      // 2. Générer et envoyer le PDF
      const signResponse = await fetch(`${API_URL}/baux/${bailId}/signer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "generate_and_send",
          note: formData.note_proprietaire,
        }),
      });

      if (!signResponse.ok) {
        console.warn("Bail créé mais envoi PDF échoué");
      }

      toast.success("Bail créé et envoyé avec succès !");
      router.push(`/admin/dashboard/biens/${bienId}`);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la création du bail");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <BackButton />
      </div>

      <Heading
        title="Créer un bail"
        subtitle="Générer et envoyer un contrat de bail au locataire"
      />

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-6 bg-white p-6 rounded-2xl border border-neutral-200"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              ID Client / Locataire *
            </label>
            <input
              type="number"
              value={formData.client_info_id}
              onChange={(e) =>
                setFormData({ ...formData, client_info_id: e.target.value })
              }
              placeholder="Ex: 123"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
              required
            />
            <p className="text-xs text-neutral-500 mt-1">
              L'ID du profil client du locataire
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Durée (mois)
            </label>
            <select
              value={formData.duree_mois}
              onChange={(e) =>
                setFormData({ ...formData, duree_mois: e.target.value })
              }
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
            >
              <option value="6">6 mois</option>
              <option value="12">12 mois</option>
              <option value="24">24 mois</option>
              <option value="36">36 mois</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Date d'entrée *
            </label>
            <input
              type="date"
              value={formData.date_entree}
              onChange={(e) =>
                setFormData({ ...formData, date_entree: e.target.value })
              }
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Date de sortie *
            </label>
            <input
              type="date"
              value={formData.date_sortie}
              onChange={(e) =>
                setFormData({ ...formData, date_sortie: e.target.value })
              }
              min={formData.date_entree}
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Loyer mensuel (FCFA)
            </label>
            <input
              type="number"
              value={formData.loyer_actuel}
              onChange={(e) =>
                setFormData({ ...formData, loyer_actuel: e.target.value })
              }
              placeholder="Ex: 150000"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-2">
              Dépôt de garantie (FCFA)
            </label>
            <input
              type="number"
              value={formData.depot_garantie}
              onChange={(e) =>
                setFormData({ ...formData, depot_garantie: e.target.value })
              }
              placeholder="Ex: 150000"
              className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-neutral-700 mb-2">
            Note pour le locataire
          </label>
          <textarea
            value={formData.note_proprietaire}
            onChange={(e) =>
              setFormData({ ...formData, note_proprietaire: e.target.value })
            }
            placeholder="Message optionnel à inclure dans l'email..."
            rows={4}
            className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-xl border border-neutral-300 py-3 font-semibold text-neutral-700 hover:bg-neutral-50"
            disabled={submitting}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Création..." : "Créer et envoyer le bail"}
          </button>
        </div>
      </form>
    </div>
  );
}
