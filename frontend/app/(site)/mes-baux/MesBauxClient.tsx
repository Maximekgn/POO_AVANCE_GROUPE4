"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import {
  FileText,
  Home,
  User,
  Calendar,
  MapPin,
  Euro,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface Bail {
  id: number;
  numero_bail: string;
  statut: "BROUILLON" | "EN_ATTENTE_SIGNATURE" | "SIGNE" | "ACTIF" | "TERMINE";
  date_entree: string;
  date_sortie: string;
  date_signature_proprietaire?: string | null;
  date_signature_client?: string | null;
  bien: {
    id: number;
    reference: string;
    adresse: string;
    ville: string;
  };
  client_info?: {
    utilisateur: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  demande?: {
    id: number;
    type_demande: string;
  };
}

interface MesBauxClientProps {
  user: {
    id: string;
    accessToken: string;
  };
}

export default function MesBauxClient({ user }: MesBauxClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"locataire" | "proprietaire">(
    "locataire",
  );
  const [baux, setBaux] = useState<{ locataire: Bail[]; proprietaire: Bail[] }>(
    {
      locataire: [],
      proprietaire: [],
    },
  );

  const fetchBaux = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/baux/mes-baux`, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setBaux(data);
      }
    } catch (error) {
      console.error("Erreur lors du chargement des baux:", error);
    } finally {
      setLoading(false);
    }
  }, [user.accessToken]);

  useEffect(() => {
    fetchBaux();
  }, [fetchBaux]);

  const statutColors = {
    BROUILLON: "bg-gray-100 text-gray-700 border-gray-200",
    EN_ATTENTE_SIGNATURE: "bg-amber-100 text-amber-700 border-amber-200",
    SIGNE: "bg-blue-100 text-blue-700 border-blue-200",
    ACTIF: "bg-green-100 text-green-700 border-green-200",
    TERMINE: "bg-neutral-100 text-neutral-700 border-neutral-200",
  };

  const statutLabels = {
    BROUILLON: "Brouillon",
    EN_ATTENTE_SIGNATURE: "En attente de signature",
    SIGNE: "Signé",
    ACTIF: "Actif",
    TERMINE: "Terminé",
  };

  const statutIcons = {
    BROUILLON: FileText,
    EN_ATTENTE_SIGNATURE: Clock,
    SIGNE: CheckCircle,
    ACTIF: CheckCircle,
    TERMINE: AlertCircle,
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const currentBaux = baux[activeTab];

  return (
    <Container>
      <div className="max-w-6xl py-8">
        <Heading
          title="Mes Baux"
          subtitle="Gérez vos contrats de bail locatif"
        />

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b border-neutral-200 pb-1">
          <button
            onClick={() => setActiveTab("locataire")}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "locataire"
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            <User className="w-4 h-4" />
            En tant que locataire
            {baux.locataire.length > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === "locataire"
                    ? "bg-white text-neutral-900"
                    : "bg-neutral-200"
                }`}
              >
                {baux.locataire.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("proprietaire")}
            className={`rounded-t-lg px-4 py-2 text-sm font-semibold transition flex items-center gap-2 ${
              activeTab === "proprietaire"
                ? "bg-neutral-900 text-white"
                : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
            }`}
          >
            <Home className="w-4 h-4" />
            En tant que propriétaire
            {baux.proprietaire.length > 0 && (
              <span
                className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === "proprietaire"
                    ? "bg-white text-neutral-900"
                    : "bg-neutral-200"
                }`}
              >
                {baux.proprietaire.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neutral-900"></div>
          </div>
        ) : currentBaux.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <FileText className="w-16 h-16 text-neutral-300 mb-4" />
            <h3 className="text-lg font-semibold text-neutral-700 mb-2">
              Aucun bail trouvé
            </h3>
            <p className="text-neutral-500 max-w-md">
              {activeTab === "locataire"
                ? "Vous n'avez aucun bail en tant que locataire pour le moment."
                : "Vous n'avez aucun bail en tant que propriétaire pour le moment."}
            </p>
            <button
              onClick={() => router.push("/properties")}
              className="mt-6 rounded-xl bg-neutral-900 px-6 py-3 text-sm font-semibold text-white hover:bg-neutral-800 transition"
            >
              {activeTab === "locataire"
                ? "Trouver un logement"
                : "Gérer vos biens"}
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentBaux.map((bail) => {
              const StatutIcon = statutIcons[bail.statut] || FileText;
              return (
                <div
                  key={bail.id}
                  onClick={() => router.push(`/mes-baux/${bail.id}`)}
                  className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-neutral-300 transition cursor-pointer"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-neutral-100">
                        <FileText className="w-5 h-5 text-neutral-700" />
                      </div>
                      <div>
                        <h3 className="font-bold text-neutral-900">
                          {bail.numero_bail}
                        </h3>
                        <p className="text-xs text-neutral-500">
                          {bail.bien.reference}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                        statutColors[bail.statut] || statutColors.BROUILLON
                      }`}
                    >
                      <StatutIcon className="w-3 h-3" />
                      {statutLabels[bail.statut]}
                    </span>
                  </div>

                  {/* Property info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">
                        {bail.bien.adresse}, {bail.bien.ville}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-neutral-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(bail.date_entree)}</span>
                    </div>
                    {bail.date_sortie && (
                      <div className="flex items-center gap-2 text-sm text-neutral-600">
                        <Clock className="w-4 h-4" />
                        <span>Au {formatDate(bail.date_sortie)}</span>
                      </div>
                    )}
                  </div>

                  {/* Parties */}
                  <div className="pt-4 border-t border-neutral-100">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-neutral-400" />
                      <span className="text-neutral-600">
                        {activeTab === "locataire" ? (
                          <>
                            <span className="font-medium">Propriétaire :</span>{" "}
                            {bail.client_info?.utilisateur
                              ? `${bail.client_info.utilisateur.first_name} ${bail.client_info.utilisateur.last_name}`
                              : "-"}
                          </>
                        ) : (
                          <>
                            <span className="font-medium">Locataire :</span>{" "}
                            {bail.client_info?.utilisateur
                              ? `${bail.client_info.utilisateur.first_name} ${bail.client_info.utilisateur.last_name}`
                              : "-"}
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-neutral-100 flex items-center justify-between">
                    <span className="text-xs text-neutral-500">
                      {bail.date_signature_proprietaire &&
                      bail.date_signature_client
                        ? "Bail signé par les deux parties"
                        : bail.date_signature_proprietaire
                          ? "En attente du locataire"
                          : bail.date_signature_client
                            ? "En attente du propriétaire"
                            : "En attente de signatures"}
                    </span>
                    <span className="text-sm font-semibold text-neutral-900 flex items-center gap-1">
                      Voir le bail
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Container>
  );
}
