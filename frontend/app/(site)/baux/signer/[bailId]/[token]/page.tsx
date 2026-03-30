"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Heading from "@/components/Heading";
import BackButton from "@/components/BackButton";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Home,
  User,
  Calendar,
  DollarSign,
  PenTool,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface PageProps {
  params: Promise<{ bailId: string; token: string }>;
}

interface BailDetails {
  id: number;
  numero_bail: string;
  bien: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
  };
  client_info: {
    utilisateur: {
      first_name: string;
      last_name: string;
      email: string;
    };
  };
  proprietaire_info?: {
    utilisateur: {
      first_name: string;
      last_name: string;
      email: string;
    };
  } | null;
  date_entree: string;
  date_sortie: string;
  loyer_actuel: number;
  depot_garantie: number;
  statut: string;
  date_signature_proprietaire?: string | null;
  date_signature_client?: string | null;
}

export default function BailSignerPage(props: PageProps) {
  const resolvedParams = use(props.params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [bail, setBail] = useState<BailDetails | null>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function fetchBailDetails() {
      try {
        const response = await fetch(
          `${API_URL}/baux/signer/${resolvedParams.bailId}/${resolvedParams.token}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.error || "Bail introuvable ou lien invalide");
        }

        const data = await response.json();
        setBail(data);
      } catch (error: any) {
        setMessage(error.message || "Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    }

    fetchBailDetails();
  }, [resolvedParams.bailId, resolvedParams.token]);

  async function handleSign() {
    if (
      !confirm(
        "Voulez-vous vraiment signer ce bail ? Cette action est irréversible.",
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/baux/signer/${resolvedParams.bailId}/${resolvedParams.token}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_signature_url: null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || "Échec de la signature");
      }

      setSuccess(true);
      setMessage("Bail signé avec succès !");
    } catch (error: any) {
      setMessage(error.message || "Erreur lors de la signature");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-neutral-600">Chargement des informations...</p>
        </div>
      </div>
    );
  }

  if (!bail) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white p-8">
        <div className="max-w-2xl mx-auto">
          <Heading
            title="Bail introuvable"
            subtitle="Ce bail n'existe pas ou a déjà été signé"
          />
          <Link
            href="/"
            className="mt-6 inline-block rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <BackButton />
          </div>

          <div className="rounded-2xl border border-green-200 bg-white p-8 text-center shadow-lg">
            <div className="mb-6 flex justify-center">
              <CheckCircle2 className="w-20 h-20 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-green-900 mb-2">
              Bail signé avec succès !
            </h1>
            <p className="text-green-800 mb-6">
              Votre signature a été enregistrée. Le bail est maintenant
              effectif.
            </p>
            <div className="bg-green-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-700">
                <strong>Numéro de bail :</strong> {bail.numero_bail}
              </p>
              <p className="text-sm text-green-700 mt-2">
                Un email avec le bail signé vous a été envoyé.
              </p>
            </div>
            <Link
              href="/"
              className="inline-block rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 transition"
            >
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const proprietaireASigne = !!bail.date_signature_proprietaire;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <BackButton />
        </div>

        <Heading
          title={
            <div className="flex items-center gap-2">
              <PenTool className="w-6 h-6" />
              <span>Signature du bail</span>
            </div>
          }
          subtitle={`Bail n° ${bail.numero_bail}`}
        />

        {message && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium flex items-center gap-2 ${
              message.includes("succès")
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.includes("succès") ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Informations du bail */}
          <div className="space-y-6">
            {/* Bien */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Bien loué
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-500">Référence :</span>
                  <span className="font-semibold ml-2">
                    {bail.bien?.reference || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Ville :</span>
                  <span className="font-semibold ml-2">
                    {bail.bien?.ville || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Adresse :</span>
                  <span className="font-semibold ml-2">
                    {bail.bien?.adresse || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Période */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Période de location
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-500">Entrée :</span>
                  <span className="font-semibold ml-2">
                    {new Date(bail.date_entree).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Sortie :</span>
                  <span className="font-semibold ml-2">
                    {new Date(bail.date_sortie).toLocaleDateString("fr-FR")}
                  </span>
                </div>
              </div>
            </div>

            {/* Conditions financières */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Conditions financières
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Loyer mensuel</span>
                  <span className="font-semibold">
                    {bail.loyer_actuel?.toLocaleString() || 0} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Dépôt de garantie</span>
                  <span className="font-semibold">
                    {bail.depot_garantie?.toLocaleString() || 0} FCFA
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature */}
          <div className="space-y-6">
            {/* Statut des signatures */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Statut des signatures
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-neutral-600" />
                    <span className="text-sm font-medium">Propriétaire</span>
                  </div>
                  {proprietaireASigne ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Signé
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-500">En attente</span>
                  )}
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-neutral-600" />
                    <span className="text-sm font-medium">
                      Locataire (Vous)
                    </span>
                  </div>
                  {bail.date_signature_client ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-100 px-2 py-1 rounded-full">
                      <CheckCircle2 className="w-3 h-3" />
                      Signé
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600">À signer</span>
                  )}
                </div>
              </div>
            </div>

            {/* Bouton de signature */}
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-green-900 mb-4">
                ✍️ Signature électronique
              </h3>

              <div className="bg-white rounded-xl p-4 mb-4 border-2 border-dashed border-green-300">
                <p className="text-sm text-neutral-600 mb-2">
                  <strong>Important :</strong> En cliquant sur le bouton
                  ci-dessous, vous signez électroniquement ce bail.
                </p>
                <p className="text-sm text-neutral-600">
                  Cette signature a la même valeur légale qu'une signature
                  manuscrite et vous engage à respecter les termes du contrat.
                </p>
              </div>

              <button
                onClick={handleSign}
                disabled={busy || bail.date_signature_client}
                className="w-full rounded-xl bg-green-600 px-6 py-4 text-base font-bold text-white hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                {bail.date_signature_client
                  ? "✅ Bail déjà signé"
                  : busy
                    ? "Signature en cours..."
                    : "✅ Confirmer et signer le bail"}
              </button>

              <p className="mt-4 text-xs text-neutral-500 text-center">
                Après signature, vous recevrez un email avec le bail signé en
                PDF.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
