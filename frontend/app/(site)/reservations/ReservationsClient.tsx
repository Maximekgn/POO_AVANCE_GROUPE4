"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import type { CurrentUser } from "@/app/(site)/actions/getCurrentUser";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import {
  FileText,
  Eye,
  Home,
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  ExternalLink,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

type ListingItem = {
  id: string;
  imageSrc?: string;
  locationValue?: string;
  ville?: string;
  category?: string;
  price?: number;
  priceMonthly?: number;
};

type ReservationItem = {
  id: string;
  totalPrice?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  listing: ListingItem;
};

type DemandeItem = {
  id: number;
  bien: number;
  bien_reference: string;
  bien_adresse: string;
  bien_image?: string;
  bien_details?: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
    loyer_hc?: number;
    charges?: number;
    caution_mois?: number;
    avance_mois?: number;
  };
  demandeur: number;
  demandeur_details?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    telephone?: string;
  };
  demandeur_nom: string;
  demandeur_email?: string;
  demandeur_telephone?: string;
  proprietaire: number;
  proprietaire_details?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    telephone?: string;
  };
  proprietaire_nom: string;
  type_demande: "VISITE" | "PRIVATISATION" | "LOCATION_DIRECTE" | "BAIL";
  statut: "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE" | "ANNULEE" | "EXPIREE";
  date_debut: string;
  date_fin: string;
  duree_jours: number;
  duree_mois?: number;
  montant_total: number;
  date_creation: string;
  date_visite?: string;
  date_traitement?: string;
  paiement_demande_envoyee?: boolean;
  paiement_effectue?: boolean;
  has_lease?: boolean;
};

interface ReservationsClientProps {
  reservations: ReservationItem[];
  currentUser: CurrentUser | null;
}

const ReservationsClient: React.FC<ReservationsClientProps> = ({
  reservations,
  currentUser,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [deletingId, setDeletingId] = useState("");
  const [activeTab, setActiveTab] = useState<"envoyees" | "recues">("envoyees");
  const [loadingDemandes, setLoadingDemandes] = useState(false);
  const [demandesEnvoyees, setDemandesEnvoyees] = useState<DemandeItem[]>([]);
  const [demandesRecues, setDemandesRecues] = useState<DemandeItem[]>([]);
  const [requestingPayment, setRequestingPayment] = useState<number | null>(
    null,
  );
  const [confirmingPayment, setConfirmingPayment] = useState<number | null>(
    null,
  );
  const [finalisingLocation, setFinalisingLocation] = useState<number | null>(
    null,
  );
  const [initialisingBail, setInitialisingBail] = useState<number | null>(null);

  // Filtres
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statutFilter, setStatutFilter] = useState<string>("all");

  const fetchDemandes = useCallback(async () => {
    setLoadingDemandes(true);
    try {
      const [envoyeesRes, recuesRes] = await Promise.all([
        axios.get(`${API_URL}/demandes-actions?scope=sent`, {
          headers: { Authorization: `Bearer ${currentUser?.accessToken}` },
        }),
        axios.get(`${API_URL}/demandes-actions?scope=incoming`, {
          headers: { Authorization: `Bearer ${currentUser?.accessToken}` },
        }),
      ]);
      setDemandesEnvoyees(
        Array.isArray(envoyeesRes.data) ? envoyeesRes.data : [],
      );
      setDemandesRecues(Array.isArray(recuesRes.data) ? recuesRes.data : []);
    } catch {
      toast.error("Impossible de charger les demandes.");
    } finally {
      setLoadingDemandes(false);
    }
  }, []);

  useEffect(() => {
    fetchDemandes();
  }, [fetchDemandes]);

  // Synchroniser avec les params URL
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "recues" || tab === "envoyees") {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const typeLabel = useMemo(
    () => ({
      VISITE: "Visite",
      PRIVATISATION: "Privatisation",
      LOCATION_DIRECTE: "Location directe",
      BAIL: "Bail",
    }),
    [],
  );

  const typeIcons: Record<string, any> = useMemo(
    () => ({
      VISITE: Eye,
      PRIVATISATION: FileText,
      LOCATION_DIRECTE: Home,
      BAIL: FileText,
    }),
    [],
  );

  const statutLabel = useMemo(
    () => ({
      EN_ATTENTE: "En attente",
      ACCEPTEE: "Acceptée",
      REFUSEE: "Refusée",
      EXPIREE: "Expirée",
      ANNULEE: "Annulée",
    }),
    [],
  );

  const statutColors: Record<string, string> = useMemo(
    () => ({
      EN_ATTENTE: "bg-amber-100 text-amber-800 border-amber-200",
      ACCEPTEE: "bg-green-100 text-green-800 border-green-200",
      REFUSEE: "bg-red-100 text-red-800 border-red-200",
      EXPIREE: "bg-gray-100 text-gray-800 border-gray-200",
      ANNULEE: "bg-gray-100 text-gray-800 border-gray-200",
    }),
    [],
  );

  // Filtrer les demandes
  const filterDemandes = useCallback(
    (demandes: DemandeItem[]) => {
      return demandes.filter((demande) => {
        if (typeFilter !== "all" && demande.type_demande !== typeFilter) {
          return false;
        }
        if (statutFilter !== "all" && demande.statut !== statutFilter) {
          return false;
        }
        return true;
      });
    },
    [typeFilter, statutFilter],
  );

  const demandesEnvoyeesFiltrees = useMemo(() => {
    return filterDemandes(demandesEnvoyees);
  }, [demandesEnvoyees, typeFilter, statutFilter]);

  const demandesRecuesFiltrees = useMemo(() => {
    return filterDemandes(demandesRecues);
  }, [demandesRecues, typeFilter, statutFilter]);

  const openChat = useCallback((demande: DemandeItem) => {
    const first = Math.min(demande.demandeur, demande.proprietaire);
    const second = Math.max(demande.demandeur, demande.proprietaire);
    const conversationId = `${first}_${second}`;
    window.dispatchEvent(
      new CustomEvent("chat:open", {
        detail: { conversationId },
      }),
    );
  }, []);

  const handleRequestPayment = useCallback(async (demandeId: number) => {
    setRequestingPayment(demandeId);
    try {
      await axios.post(
        `${API_URL}/demandes-actions/${demandeId}/request-payment`,
        {},
        {
          headers: { Authorization: `Bearer ${currentUser?.accessToken}` },
        },
      );
      toast.success("Demande de paiement envoyée au locataire.");
      setDemandesRecues((prev) =>
        prev.map((d) =>
          d.id === demandeId ? { ...d, paiement_demande_envoyee: true } : d,
        ),
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail ||
          "Erreur lors de la demande de paiement.",
      );
    } finally {
      setRequestingPayment(null);
    }
  }, []);

  const handleConfirmPayment = useCallback(async (demandeId: number) => {
    setConfirmingPayment(demandeId);
    try {
      await axios.post(
        `${API_URL}/demandes-actions/${demandeId}/confirm-payment`,
        {},
        {
          headers: { Authorization: `Bearer ${currentUser?.accessToken}` },
        },
      );
      toast.success(
        "Paiement confirmé. Le propriétaire peut finaliser la location.",
      );
      setDemandesEnvoyees((prev) =>
        prev.map((d) =>
          d.id === demandeId ? { ...d, paiement_effectue: true } : d,
        ),
      );
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail ||
          "Erreur lors de la confirmation du paiement.",
      );
    } finally {
      setConfirmingPayment(null);
    }
  }, []);

  const handleFinaliserLocation = useCallback(
    async (demandeId: number) => {
      setFinalisingLocation(demandeId);
      try {
        await axios.post(
          `${API_URL}/demandes-actions/${demandeId}/finaliser`,
          {},
          {
            headers: { Authorization: `Bearer ${currentUser?.accessToken}` },
          },
        );
        toast.success(
          "Location finalisée. Le contrat de bail a été envoyé par email.",
        );
        fetchDemandes();
      } catch (error: any) {
        toast.error(
          error?.response?.data?.detail ||
            "Erreur lors de la finalisation de la location.",
        );
      } finally {
        setFinalisingLocation(null);
      }
    },
    [fetchDemandes, currentUser?.accessToken],
  );

  const handleInitBail = useCallback(
    async (demandeId: number) => {
      setInitialisingBail(demandeId);
      try {
        await axios.post(
          `${API_URL}/demandes-actions/${demandeId}/init-bail`,
          {
            caution_mois: 2,
            avance_mois: 1,
          },
          {
            headers: { Authorization: `Bearer ${currentUser?.accessToken}` },
          },
        );
        toast.success(
          "Bail initialisé. Vous pouvez maintenant demander le paiement au locataire.",
        );
        fetchDemandes();
      } catch (error: any) {
        toast.error(
          error?.response?.data?.detail ||
            "Erreur lors de l'initialisation du bail.",
        );
      } finally {
        setInitialisingBail(null);
      }
    },
    [fetchDemandes, currentUser?.accessToken],
  );

  const handleCancelDemande = useCallback(
    async (demandeId: number) => {
      if (!confirm("Voulez-vous vraiment annuler cette demande ?")) return;

      try {
        await axios.delete(`${API_URL}/demandes-actions/${demandeId}`, {
          headers: { Authorization: `Bearer ${currentUser?.accessToken}` },
        });
        toast.success("Demande annulée avec succès.");
        fetchDemandes();
      } catch (error: any) {
        toast.error(
          error?.response?.data?.detail || "Erreur lors de l'annulation.",
        );
      }
    },
    [fetchDemandes, currentUser?.accessToken],
  );

  const onCancel = useCallback(
    async (id: string) => {
      setDeletingId(id);

      axios
        .delete(`/api/reservations/${id}`)
        .then(() => {
          toast.success("Reservation cancelled");
          router.refresh();
        })
        .catch(() => {
          toast.error("Something went wrong");
        })
        .finally(() => {
          setDeletingId("");
        });
    },
    [router],
  );

  return (
    <Container>
      <Heading
        title="Mes Réservations et Demandes"
        subtitle="Suivez vos demandes de visite, location et privatisation"
      />

      {/* Tabs */}
      <div className="mt-6 flex gap-2 border-b border-neutral-200 pb-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab("envoyees");
            router.push("/reservations?tab=envoyees", { scroll: false });
          }}
          className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "envoyees"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          Mes demandes ({demandesEnvoyeesFiltrees.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab("recues");
            router.push("/reservations?tab=recues", { scroll: false });
          }}
          className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition ${
            activeTab === "recues"
              ? "bg-neutral-900 text-white"
              : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
          }`}
        >
          Demandes reçues ({demandesRecuesFiltrees.length})
        </button>
      </div>

      {/* Filtres */}
      <div className="mt-6 flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-neutral-700">
            Type :
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            <option value="all">Tous</option>
            <option value="VISITE">Visite</option>
            <option value="PRIVATISATION">Privatisation</option>
            <option value="LOCATION_DIRECTE">Location directe</option>
            <option value="BAIL">Bail</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-semibold text-neutral-700">
            Statut :
          </label>
          <select
            value={statutFilter}
            onChange={(e) => setStatutFilter(e.target.value)}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500"
          >
            <option value="all">Tous</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="ACCEPTEE">Acceptée</option>
            <option value="REFUSEE">Refusée</option>
            <option value="EXPIREE">Expirée</option>
            <option value="ANNULEE">Annulée</option>
          </select>
        </div>
        {(typeFilter !== "all" || statutFilter !== "all") && (
          <button
            type="button"
            onClick={() => {
              setTypeFilter("all");
              setStatutFilter("all");
            }}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {loadingDemandes ? (
        <div className="mt-10 flex justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
        </div>
      ) : activeTab === "envoyees" ? (
        /* Demandes envoyées */
        <div className="mt-6">
          {demandesEnvoyeesFiltrees.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Aucune demande envoyée pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {demandesEnvoyeesFiltrees.map((demande) => {
                const TypeIcon = typeIcons[demande.type_demande] || FileText;
                return (
                  <div
                    key={demande.id}
                    className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md transition"
                  >
                    {/* En-tête */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-neutral-100">
                          <TypeIcon className="w-5 h-5 text-neutral-700" />
                        </div>
                        <div>
                          <h3 className="font-bold text-neutral-900">
                            {typeLabel[demande.type_demande]}
                          </h3>
                          <p className="text-xs text-neutral-500">
                            {demande.bien_reference}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          statutColors[demande.statut] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {statutLabel[demande.statut]}
                      </span>
                    </div>

                    {/* Infos bien */}
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Home className="w-4 h-4" />
                        <span className="truncate">{demande.bien_adresse}</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(demande.date_debut).toLocaleDateString(
                            "fr-FR",
                          )}
                          {" - "}
                          {new Date(demande.date_fin).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Workflow indicators */}
                    {demande.statut === "ACCEPTEE" && (
                      <div className="mb-4 space-y-2">
                        {demande.paiement_demande_envoyee ? (
                          <div className="flex items-center gap-2 text-xs">
                            <div
                              className={`w-2 h-2 rounded-full ${demande.paiement_effectue ? "bg-green-500" : "bg-amber-500"}`}
                            ></div>
                            <span className="text-neutral-600">
                              {demande.paiement_effectue
                                ? "✅ Paiement confirmé"
                                : "⏳ En attente de paiement"}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                            <span>Paiement non demandé</span>
                          </div>
                        )}
                        {demande.has_lease && (
                          <div className="flex items-center gap-2 text-xs text-green-600">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span>Bail créé</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-neutral-100">
                      <Link
                        href={`/reservations/demandes/${demande.id}`}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Détails
                      </Link>
                      <button
                        type="button"
                        onClick={() => openChat(demande)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Chat
                      </button>
                    </div>

                    {/* Action bouton annuler si en attente */}
                    {demande.statut === "EN_ATTENTE" && (
                      <button
                        type="button"
                        onClick={() => handleCancelDemande(demande.id)}
                        className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-bold text-red-700 hover:bg-red-100 transition"
                      >
                        <XCircle className="w-3 h-3" />
                        Annuler
                      </button>
                    )}

                    {/* Action bouton confirmer paiement */}
                    {demande.statut === "ACCEPTEE" &&
                      demande.paiement_demande_envoyee &&
                      !demande.paiement_effectue && (
                        <button
                          type="button"
                          onClick={() => handleConfirmPayment(demande.id)}
                          disabled={confirmingPayment === demande.id}
                          className="mt-2 w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 transition disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {confirmingPayment === demande.id
                            ? "Confirmation..."
                            : "Confirmer le paiement"}
                        </button>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* Demandes reçues */
        <div className="mt-6">
          {demandesRecuesFiltrees.length === 0 ? (
            <p className="text-sm text-neutral-500">
              Aucune demande reçue pour le moment.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {demandesRecuesFiltrees.map((demande) => {
                const TypeIcon = typeIcons[demande.type_demande] || FileText;
                return (
                  <div
                    key={demande.id}
                    className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md transition"
                  >
                    {/* En-tête */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-neutral-100">
                          <TypeIcon className="w-5 h-5 text-neutral-700" />
                        </div>
                        <div>
                          <h3 className="font-bold text-neutral-900">
                            {typeLabel[demande.type_demande]}
                          </h3>
                          <p className="text-xs text-neutral-500">
                            {demande.bien_reference}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          statutColors[demande.statut] ||
                          "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {statutLabel[demande.statut]}
                      </span>
                    </div>

                    {/* Infos demandeur */}
                    <div className="space-y-2 text-sm mb-4">
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Home className="w-4 h-4" />
                        <span className="truncate">{demande.bien_adresse}</span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-600">
                        <Clock className="w-4 h-4" />
                        <span>
                          {new Date(demande.date_debut).toLocaleDateString(
                            "fr-FR",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-neutral-600">
                        <MessageSquare className="w-4 h-4" />
                        <span className="truncate">
                          {demande.demandeur_nom}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t border-neutral-100">
                      <Link
                        href={`/reservations/demandes/${demande.id}`}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Détails
                      </Link>
                      <button
                        type="button"
                        onClick={() => openChat(demande)}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white py-2 text-xs font-bold text-neutral-700 hover:bg-neutral-50 transition"
                      >
                        <MessageSquare className="w-3 h-3" />
                        Chat
                      </button>
                    </div>

                    {/* Workflow actions pour location directe acceptée */}
                    {demande.statut === "ACCEPTEE" &&
                      demande.type_demande === "LOCATION_DIRECTE" && (
                        <div className="mt-3 space-y-2 pt-3 border-t border-neutral-100">
                          {!demande.paiement_demande_envoyee ? (
                            <button
                              type="button"
                              onClick={() => handleRequestPayment(demande.id)}
                              disabled={requestingPayment === demande.id}
                              className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-2 text-xs font-bold text-white hover:bg-amber-600 transition disabled:opacity-50"
                            >
                              <CreditCard className="w-3 h-3" />
                              {requestingPayment === demande.id
                                ? "Envoi..."
                                : "💳 Demander le paiement"}
                            </button>
                          ) : !demande.paiement_effectue ? (
                            <div className="text-center text-xs text-amber-600 bg-amber-50 py-2 rounded-lg">
                              ⏳ En attente du paiement...
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleFinaliserLocation(demande.id)
                              }
                              disabled={finalisingLocation === demande.id}
                              className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 transition disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {finalisingLocation === demande.id
                                ? "Traitement..."
                                : "🏠 Finaliser le bail"}
                            </button>
                          )}
                        </div>
                      )}

                    {/* Workflow actions pour bail accepté */}
                    {demande.statut === "ACCEPTEE" &&
                      demande.type_demande === "BAIL" && (
                        <div className="mt-3 space-y-2 pt-3 border-t border-neutral-100">
                          {!demande.bail_initialized ? (
                            <button
                              type="button"
                              onClick={() => handleInitBail(demande.id)}
                              disabled={initialisingBail === demande.id}
                              className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50"
                            >
                              <FileText className="w-3 h-3" />
                              {initialisingBail === demande.id
                                ? "Initialisation..."
                                : "📋 Initialiser le bail"}
                            </button>
                          ) : !demande.paiement_demande_envoyee ? (
                            <button
                              type="button"
                              onClick={() => handleRequestPayment(demande.id)}
                              disabled={requestingPayment === demande.id}
                              className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 py-2 text-xs font-bold text-white hover:bg-amber-600 transition disabled:opacity-50"
                            >
                              <CreditCard className="w-3 h-3" />
                              {requestingPayment === demande.id
                                ? "Envoi..."
                                : "💳 Demander le paiement"}
                            </button>
                          ) : !demande.paiement_effectue ? (
                            <div className="text-center text-xs text-amber-600 bg-amber-50 py-2 rounded-lg">
                              ⏳ En attente du paiement...
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                handleFinaliserLocation(demande.id)
                              }
                              disabled={finalisingLocation === demande.id}
                              className="w-full flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 transition disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              {finalisingLocation === demande.id
                                ? "Traitement..."
                                : "✍️ Finaliser et signer le bail"}
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </Container>
  );
};

export default ReservationsClient;
