"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Heading from "@/components/Heading";
import BackButton from "@/components/BackButton";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Home,
  User,
  Mail,
  Phone,
  Calendar,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface PageProps {
  params: Promise<{ demandeId: string; token: string }>;
}

interface DemandeDetails {
  id: number;
  bien: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
    loyer_hc?: number;
    charges?: number;
    caution_mois?: number;
    avance_mois?: number;
    frais_assistance?: number;
  };
  demandeur: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    telephone?: string;
  };
  date_debut?: string;
  date_fin?: string;
  duree_mois?: number;
}

export default function PaiementPage(props: PageProps) {
  const resolvedParams = use(props.params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [demande, setDemande] = useState<DemandeDetails | null>(null);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "orange" | "mtn" | "moov" | ""
  >("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    async function fetchDemandeDetails() {
      try {
        // Utiliser l'endpoint PUBLIC qui valide le token
        const response = await fetch(
          `${API_URL}/paiement-public/${resolvedParams.demandeId}/${resolvedParams.token}`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error("Lien de paiement invalide ou expiré");
          }
          if (response.status === 400) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error ||
                "Cette demande n'est pas prête pour le paiement",
            );
          }
          throw new Error("Demande introuvable ou lien invalide");
        }

        const data = await response.json();
        setDemande(data);
      } catch (error: any) {
        setMessage(error.message || "Erreur lors du chargement");
      } finally {
        setLoading(false);
      }
    }

    fetchDemandeDetails();
  }, [resolvedParams.demandeId, resolvedParams.token]);

  async function handlePaiement() {
    if (!selectedPaymentMethod || !phoneNumber) {
      setMessage(
        "Veuillez sélectionner un mode de paiement et entrer un numéro",
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      // Utiliser l'endpoint PUBLIC de confirmation de paiement
      const response = await fetch(
        `${API_URL}/paiement-public/${resolvedParams.demandeId}/${resolvedParams.token}/confirm`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.detail || data.message || "Échec du paiement",
        );
      }

      setSuccess(true);
      setMessage("Paiement effectué avec succès !");
    } catch (error: any) {
      setMessage(error.message || "Erreur lors du paiement");
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

  if (!demande) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white p-8">
        <div className="max-w-2xl mx-auto">
          <Heading
            title="Lien de paiement invalide"
            subtitle="Ce lien de paiement n'existe pas ou a expiré"
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

  const loyerHc = Number(demande.bien.loyer_hc) || 0;
  const charges = Number(demande.bien.charges) || 0;
  const cautionMois = demande.bien.caution_mois || 1;
  const avanceMois = demande.bien.avance_mois || 1;
  const fraisAssistance = Number(demande.bien.frais_assistance) || 0;

  const totalCaution = loyerHc * cautionMois;
  const totalAvance = loyerHc * avanceMois;
  const totalLoyerCharges = loyerHc + charges;
  const totalAPayer =
    totalCaution + totalAvance + totalLoyerCharges + fraisAssistance;

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
              Paiement effectué avec succès !
            </h1>
            <p className="text-green-800 mb-6">
              Votre paiement a été confirmé. Le propriétaire va maintenant
              finaliser votre bail.
            </p>
            <div className="bg-green-50 rounded-xl p-4 mb-6">
              <p className="text-sm text-green-700">
                <strong>Montant payé :</strong> {totalAPayer.toLocaleString()}{" "}
                FCFA
              </p>
              <p className="text-sm text-green-700 mt-2">
                Un email de confirmation vous a été envoyé.
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-50 to-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <BackButton />
        </div>

        <Heading
          title={
            <div className="flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              <span>Paiement de votre location</span>
            </div>
          }
          subtitle={`Référence : ${demande.bien.reference}`}
        />

        {message && (
          <div
            className={`mt-4 rounded-xl border px-4 py-3 text-sm font-medium flex items-center gap-2 ${
              message.includes("succès") || message.includes("confirmé")
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-red-200 bg-red-50 text-red-700"
            }`}
          >
            {message.includes("succès") || message.includes("confirmé") ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
          {/* Informations de la location */}
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
                    {demande.bien.reference}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Ville :</span>
                  <span className="font-semibold ml-2">
                    {demande.bien.ville}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Adresse :</span>
                  <span className="font-semibold ml-2">
                    {demande.bien.adresse}
                  </span>
                </div>
              </div>
            </div>

            {/* Locataire */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Locataire
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-neutral-500">Nom :</span>
                  <span className="font-semibold ml-2">
                    {demande.demandeur.first_name} {demande.demandeur.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Email :</span>
                  <span className="font-semibold ml-2 text-xs">
                    {demande.demandeur.email}
                  </span>
                </div>
                {demande.demandeur.telephone && (
                  <div>
                    <span className="text-neutral-500">Téléphone :</span>
                    <span className="font-semibold ml-2">
                      {demande.demandeur.telephone}
                    </span>
                  </div>
                )}
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
                  <span className="text-neutral-500">Début :</span>
                  <span className="font-semibold ml-2">
                    {demande.date_debut
                      ? new Date(demande.date_debut).toLocaleDateString("fr-FR")
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Fin :</span>
                  <span className="font-semibold ml-2">
                    {demande.date_fin
                      ? new Date(demande.date_fin).toLocaleDateString("fr-FR")
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">Durée :</span>
                  <span className="font-semibold ml-2">
                    {demande.duree_mois || 0} mois
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Paiement */}
          <div className="space-y-6">
            {/* Détail de la facturation */}
            <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Détail de la facturation
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-blue-700">Loyer HC</span>
                  <span className="font-semibold">
                    {loyerHc.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Charges</span>
                  <span className="font-semibold">
                    {charges.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">
                    Caution ({cautionMois} mois)
                  </span>
                  <span className="font-semibold">
                    {totalCaution.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">
                    Avance ({avanceMois} mois)
                  </span>
                  <span className="font-semibold">
                    {totalAvance.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">Frais d'assistance</span>
                  <span className="font-semibold">
                    {fraisAssistance.toLocaleString()} FCFA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-blue-700">1er mois (HC + Charges)</span>
                  <span className="font-semibold">
                    {totalLoyerCharges.toLocaleString()} FCFA
                  </span>
                </div>
                <hr className="border-blue-200 my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-blue-900">Total à payer</span>
                  <span className="text-blue-600">
                    {totalAPayer.toLocaleString()} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Mode de paiement */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4">
                Mode de paiement
              </h3>
              <div className="space-y-3">
                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                    selectedPaymentMethod === "orange"
                      ? "border-orange-500 bg-orange-50"
                      : "border-neutral-200 hover:border-orange-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="orange"
                    checked={selectedPaymentMethod === "orange"}
                    onChange={(e) =>
                      setSelectedPaymentMethod(
                        e.target.value as typeof selectedPaymentMethod,
                      )
                    }
                    className="w-4 h-4 text-orange-600"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-orange-700">
                      Orange Money
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                    selectedPaymentMethod === "mtn"
                      ? "border-yellow-500 bg-yellow-50"
                      : "border-neutral-200 hover:border-yellow-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="mtn"
                    checked={selectedPaymentMethod === "mtn"}
                    onChange={(e) =>
                      setSelectedPaymentMethod(
                        e.target.value as typeof selectedPaymentMethod,
                      )
                    }
                    className="w-4 h-4 text-yellow-600"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-yellow-700">
                      MTN Mobile Money
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                    selectedPaymentMethod === "moov"
                      ? "border-blue-500 bg-blue-50"
                      : "border-neutral-200 hover:border-blue-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="moov"
                    checked={selectedPaymentMethod === "moov"}
                    onChange={(e) =>
                      setSelectedPaymentMethod(
                        e.target.value as typeof selectedPaymentMethod,
                      )
                    }
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-semibold text-blue-700">
                      Moov Money
                    </span>
                  </div>
                </label>
              </div>

              {selectedPaymentMethod && (
                <div className="mt-4">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    <Phone className="w-4 h-4 inline mr-1" />
                    Numéro Mobile Money
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+229 XX XX XX XX"
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-50 px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              )}

              <button
                onClick={handlePaiement}
                disabled={busy || !selectedPaymentMethod || !phoneNumber}
                className="mt-6 w-full rounded-xl bg-green-600 px-6 py-4 text-base font-bold text-white hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                {busy
                  ? "Traitement en cours..."
                  : `Payer ${totalAPayer.toLocaleString()} FCFA`}
              </button>

              <p className="mt-4 text-xs text-neutral-500 text-center">
                En cliquant sur "Payer", vous acceptez les conditions générales
                de vente et autorisez le prélèvement sur votre compte Mobile
                Money.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
