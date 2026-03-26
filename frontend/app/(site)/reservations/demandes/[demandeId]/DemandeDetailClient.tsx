"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import toast from "react-hot-toast";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import Button from "@/components/Button";
import type { CurrentUser } from "@/app/(site)/actions/getCurrentUser";

type Props = {
  demandeId: string;
  currentUser: CurrentUser;
};

type DemandeDetail = {
  id: number;
  bien: number;
  bien_reference: string;
  bien_adresse: string;
  demandeur: number;
  demandeur_nom: string;
  demandeur_email?: string;
  demandeur_telephone?: string;
  proprietaire: number;
  proprietaire_nom: string;
  type_demande: "VISITE" | "PRIVATISATION" | "LOCATION_DIRECTE";
  statut: "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE" | "ANNULEE";
  date_debut: string;
  date_fin: string;
  duree_jours: number;
  montant_total: number;
  note_demandeur?: string;
  note_proprietaire?: string;
  motif_refus?: string;
  date_creation: string;
};

const DemandeDetailClient: React.FC<Props> = ({ demandeId, currentUser }) => {
  const router = useRouter();
  const [demande, setDemande] = useState<DemandeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [motifRefus, setMotifRefus] = useState("");
  const [noteProprietaire, setNoteProprietaire] = useState("");

  const typeLabel = useMemo(
    () => ({
      VISITE: "Visite",
      PRIVATISATION: "Privatisation",
      LOCATION_DIRECTE: "Location directe",
    }),
    [],
  );

  const statutLabel = useMemo(
    () => ({
      EN_ATTENTE: "En attente",
      ACCEPTEE: "Acceptee",
      REFUSEE: "Refusee",
      ANNULEE: "Annulee",
    }),
    [],
  );

  const fetchDemande = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/demandes-actions/${demandeId}`);
      setDemande(response.data);
      setMotifRefus(response.data?.motif_refus || "");
      setNoteProprietaire(response.data?.note_proprietaire || "");
    } catch {
      toast.error("Impossible de charger la demande.");
      router.push("/reservations");
    } finally {
      setLoading(false);
    }
  }, [demandeId, router]);

  useEffect(() => {
    fetchDemande();
  }, [fetchDemande]);

  const currentUserId = useMemo(() => {
    if (!currentUser?.id) {
      return null;
    }
    const parsed = Number(currentUser.id);
    return Number.isNaN(parsed) ? null : parsed;
  }, [currentUser?.id]);

  const canDecide =
    !!demande &&
    demande.statut === "EN_ATTENTE" &&
    currentUserId !== null &&
    demande.proprietaire === currentUserId;

  const onDecision = useCallback(
    async (decision: "ACCEPTEE" | "REFUSEE") => {
      if (!demande) {
        return;
      }

      if (decision === "REFUSEE" && !motifRefus.trim()) {
        toast.error("Le motif de refus est obligatoire.");
        return;
      }

      setSubmitting(true);
      try {
        await axios.patch(`/api/demandes-actions/${demande.id}/decision`, {
          statut: decision,
          motif_refus: decision === "REFUSEE" ? motifRefus : "",
          note_proprietaire: noteProprietaire,
        });
        toast.success(
          decision === "ACCEPTEE"
            ? "Demande acceptee et email envoye"
            : "Demande refusee et email envoye",
        );
        fetchDemande();
      } catch (error: any) {
        toast.error(
          error?.response?.data?.error ||
          error?.response?.data?.detail ||
          "Impossible de traiter la decision.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [demande, motifRefus, noteProprietaire, fetchDemande],
  );

  const onOpenChat = useCallback(() => {
    if (!demande) {
      return;
    }
    const first = Math.min(demande.demandeur, demande.proprietaire);
    const second = Math.max(demande.demandeur, demande.proprietaire);
    const conversationId = `${first}_${second}`;
    window.dispatchEvent(
      new CustomEvent("chat:open", {
        detail: { conversationId },
      }),
    );
    toast.success("Conversation ouverte.");
  }, [demande]);

  if (loading) {
    return (
      <Container>
        <div className="py-10 text-sm text-neutral-500">Chargement...</div>
      </Container>
    );
  }

  if (!demande) {
    return (
      <Container>
        <div className="py-10 text-sm text-neutral-500">
          Demande introuvable.
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="max-w-4xl py-8">
        <Heading
          title={`Demande #${demande.id}`}
          subtitle="Detail, decision proprietaire et communication interne"
        />

        <div className="mt-6 grid gap-4 rounded-xl border border-neutral-200 bg-white p-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Type
            </p>
            <p className="text-sm text-neutral-800">
              {typeLabel[demande.type_demande] || demande.type_demande}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Statut
            </p>
            <p className="text-sm text-neutral-800">
              {statutLabel[demande.statut] || demande.statut}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Bien
            </p>
            <p className="text-sm text-neutral-800">{demande.bien_reference}</p>
            <p className="text-xs text-neutral-500">{demande.bien_adresse}</p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Periode
            </p>
            <p className="text-sm text-neutral-800">
              {demande.date_debut} au {demande.date_fin}
            </p>
            <p className="text-xs text-neutral-500">
              {demande.duree_jours} jour(s)
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Demandeur
            </p>
            <p className="text-sm text-neutral-800">{demande.demandeur_nom}</p>
            {demande.demandeur_email ? (
              <p className="text-xs text-neutral-500">
                {demande.demandeur_email}
              </p>
            ) : null}
            {demande.demandeur_telephone ? (
              <p className="text-xs text-neutral-500">
                {demande.demandeur_telephone}
              </p>
            ) : null}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-neutral-500">
              Montant total
            </p>
            <p className="text-sm text-neutral-800">
              {demande.montant_total || 0}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase text-neutral-500">
            Message du demandeur
          </p>
          <p className="mt-1 text-sm text-neutral-700">
            {demande.note_demandeur || "Aucun message."}
          </p>
        </div>

        <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase text-neutral-500">
            Communication interne
          </p>
          <button
            type="button"
            onClick={onOpenChat}
            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700"
          >
            Ouvrir le chat
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-neutral-200 bg-white p-5">
          <p className="mb-3 text-xs font-semibold uppercase text-neutral-500">
            Decision du proprietaire
          </p>
          <label className="mb-2 block text-sm font-medium text-neutral-700">
            Note interne (optionnelle)
          </label>
          <textarea
            value={noteProprietaire}
            onChange={(e) => setNoteProprietaire(e.target.value)}
            disabled={submitting || !canDecide}
            rows={3}
            className="w-full rounded-md border border-neutral-300 p-3 text-sm outline-none focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium text-neutral-700">
              Motif de refus (obligatoire si refus)
            </label>
            <input
              type="text"
              value={motifRefus}
              onChange={(e) => setMotifRefus(e.target.value)}
              disabled={submitting || !canDecide}
              className="w-full rounded-md border border-neutral-300 p-3 text-sm outline-none focus:border-neutral-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          {demande.motif_refus ? (
            <p className="mt-3 text-sm text-blue-600">
              Motif de refus enregistre: {demande.motif_refus}
            </p>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              label="Accepter"
              onClick={() => onDecision("ACCEPTEE")}
              disabled={submitting || !canDecide}
            />
            <Button
              label="Refuser"
              onClick={() => onDecision("REFUSEE")}
              disabled={submitting || !canDecide}
            />
            <button
              type="button"
              onClick={() => router.push("/reservations")}
              className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700"
            >
              Retour
            </button>
          </div>

          {!canDecide ? (
            <p className="mt-3 text-xs text-neutral-500">
              Cette demande est deja traitee ou vous n'etes pas autorise a la
              traiter.
            </p>
          ) : null}
        </div>
      </div>
    </Container>
  );
};

export default DemandeDetailClient;
