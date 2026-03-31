"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import Input from "@/components/Inputs/Input";
import toast from "react-hot-toast";
import axios from "axios";
import { ThumbsUp, ThumbsDown, Calendar, MessageSquare } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface DemandeAction {
  id: number;
  type_demande: "VISITE" | "PRIVATISATION" | "LOCATION_DIRECTE" | "BAIL";
  statut: string;
  bien_reference: string;
  bien_adresse: string;
  bien_details?: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
  };
  demandeur: number;
  demandeur_nom: string;
  demandeur_details?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  date_debut?: string | null;
  date_fin?: string | null;
  duree_mois?: number | null;
  note_demandeur?: string | null;
  message?: string | null;
}

interface User {
  id: string;
  accessToken: string;
}

interface DecisionDemandeClientProps {
  demande: DemandeAction;
  user: User;
}

export default function DecisionDemandeClient({
  demande,
  user,
}: DecisionDemandeClientProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState<"ACCEPTEE" | "REFUSEE" | null>(null);
  const [motifRefus, setMotifRefus] = useState("");
  const [noteProprietaire, setNoteProprietaire] = useState("");
  const [dateVisite, setDateVisite] = useState("");

  const handleDecision = async () => {
    if (!decision) return;

    if (decision === "REFUSEE" && !motifRefus.trim()) {
      toast.error("Le motif de refus est obligatoire.");
      return;
    }

    if (
      decision === "ACCEPTEE" &&
      demande.type_demande === "VISITE" &&
      !dateVisite
    ) {
      toast.error(
        "La date de visite est obligatoire pour accepter une visite.",
      );
      return;
    }

    setSubmitting(true);
    try {
      await axios.patch(
        `${API_URL}/demandes-actions/${demande.id}/decision`,
        {
          statut: decision,
          motif_refus: decision === "REFUSEE" ? motifRefus : "",
          note_proprietaire: noteProprietaire,
          ...(decision === "ACCEPTEE" && demande.type_demande === "VISITE"
            ? { date_visite: new Date(dateVisite).toISOString() }
            : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );
      toast.success(
        decision === "ACCEPTEE"
          ? "Demande acceptée avec succès"
          : "Demande refusée avec succès",
      );
      router.push("/reservations?tab=recues");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail || "Erreur lors de la décision.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="max-w-3xl py-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <Heading
          title="Décision du propriétaire"
          subtitle={`Demande #${demande.id} - ${demande.bien_reference}`}
        />

        {/* Informations sur la demande */}
        <div className="mt-6 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Détails de la demande
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-neutral-500">Type</p>
              <p className="font-semibold text-neutral-900">
                {demande.type_demande}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Demandeur</p>
              <p className="font-semibold text-neutral-900">
                {demande.demandeur_nom}
              </p>
            </div>
            <div>
              <p className="text-sm text-neutral-500">Date de début</p>
              <p className="font-semibold text-neutral-900">
                {demande.date_debut
                  ? new Date(demande.date_debut).toLocaleDateString("fr-FR")
                  : "-"}
              </p>
            </div>
            {demande.duree_mois && (
              <div>
                <p className="text-sm text-neutral-500">Durée</p>
                <p className="font-semibold text-neutral-900">
                  {demande.duree_mois} mois
                </p>
              </div>
            )}
          </div>

          {(demande.note_demandeur || demande.message) && (
            <div className="mt-4 rounded-xl bg-neutral-50 p-4">
              <p className="text-sm font-medium text-neutral-700 mb-2">
                Message du demandeur :
              </p>
              <p className="text-neutral-600 italic">
                "{demande.note_demandeur || demande.message}"
              </p>
            </div>
          )}
        </div>

        {/* Formulaire de décision */}
        <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-6">
          <h3 className="text-lg font-bold text-blue-900 mb-4">
            Votre décision
          </h3>

          {/* Boutons de décision */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setDecision("ACCEPTEE")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold transition ${
                decision === "ACCEPTEE"
                  ? "bg-green-600 text-white"
                  : "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <ThumbsUp className="w-5 h-5" />
              Accepter
            </button>
            <button
              onClick={() => setDecision("REFUSEE")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-6 py-4 text-sm font-bold transition ${
                decision === "REFUSEE"
                  ? "bg-red-600 text-white"
                  : "bg-white text-neutral-700 border border-neutral-300 hover:bg-neutral-50"
              }`}
            >
              <ThumbsDown className="w-5 h-5" />
              Refuser
            </button>
          </div>

          {/* Note propriétaire */}
          <div className="mb-4">
            <label className="mb-2 block text-sm font-medium text-blue-900">
              Note interne (optionnelle)
            </label>
            <textarea
              value={noteProprietaire}
              onChange={(e) => setNoteProprietaire(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
              placeholder="Ajoutez une note pour vous-même..."
            />
          </div>

          {/* Motif de refus */}
          {decision === "REFUSEE" && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-red-900">
                Motif de refus *
              </label>
              <input
                type="text"
                value={motifRefus}
                onChange={(e) => setMotifRefus(e.target.value)}
                className="w-full rounded-xl border border-red-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-400 focus:ring-2 focus:ring-red-200"
                placeholder="Précisez la raison du refus..."
              />
            </div>
          )}

          {/* Date de visite pour les visites */}
          {decision === "ACCEPTEE" && demande.type_demande === "VISITE" && (
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-blue-900">
                Date et heure de visite *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400" />
                <input
                  type="datetime-local"
                  value={dateVisite}
                  onChange={(e) => setDateVisite(e.target.value)}
                  className="w-full rounded-xl border border-blue-200 bg-white pl-10 pr-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>
          )}

          <Button
            label={submitting ? "Traitement..." : "Confirmer la décision"}
            onClick={handleDecision}
            disabled={submitting || !decision}
          />
        </div>
      </div>
    </Container>
  );
}
