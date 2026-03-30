"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BackButton from "@/components/BackButton";
import Heading from "@/components/Heading";
import Input from "@/components/Inputs/Input";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import {
  CreditCard,
  FileText,
  CheckCircle2,
  ArrowLeft,
  Signature,
  DollarSign,
  Hourglass,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface PageProps {
  params: Promise<{ demandeId: string }>;
}

interface BienTarifs {
  loyer_hc?: number;
  charges?: number;
  caution_mois?: number;
  avance_mois?: number;
  frais_assistance?: number;
  depot_garantie?: number;
}

export default function AdminDemandeFinaliserPage(props: PageProps) {
  const resolvedParams = use(props.params);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<
    "tarifs" | "paiement" | "signature" | "done"
  >("tarifs");
  const [loading, setLoading] = useState(true);
  const [paiementDemandeEnvoyee, setPaiementDemandeEnvoyee] = useState(false);
  const [paiementEffectue, setPaiementEffectue] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      caution_mois: 2,
      avance_mois: 1,
      frais_assistance: 0,
      loyer_hc: 0,
      charges: 0,
      depot_garantie: 0,
    },
  });

  const cautionMois = watch("caution_mois");
  const avanceMois = watch("avance_mois");
  const fraisAssistance = watch("frais_assistance");
  const loyerHC = watch("loyer_hc");
  const charges = watch("charges");

  // Calcul des totaux
  const totalCaution = loyerHC * cautionMois;
  const totalAvance = loyerHC * avanceMois;
  const totalAPayer = totalCaution + totalAvance + fraisAssistance;

  // Récupérer les tarifs existants depuis le backend
  useEffect(() => {
    async function fetchTarifs() {
      try {
        const token = document.cookie
          .split("; ")
          .find((row) => row.startsWith("accessToken="))
          ?.split("=")[1];

        if (!token) return;

        // 1. Récupérer la demande pour obtenir l'ID du bien et le statut du paiement
        const demandeRes = await fetch(
          `${API_URL}/demandes-actions/${resolvedParams.demandeId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!demandeRes.ok) return;

        const demandeData = await demandeRes.json();
        const bienId = demandeData.bien;

        // Récupérer le statut du paiement
        setPaiementDemandeEnvoyee(
          demandeData.paiement_demande_envoyee || false,
        );
        setPaiementEffectue(demandeData.paiement_effectue || false);

        if (!bienId) return;

        // 2. Récupérer les détails du bien avec les tarifs
        const bienRes = await fetch(`${API_URL}/biens/${bienId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!bienRes.ok) return;

        const bien = await bienRes.json();

        // Si les tarifs sont déjà configurés, les pré-remplir
        if (bien) {
          if (bien.loyer_hc) setValue("loyer_hc", Number(bien.loyer_hc));
          if (bien.charges) setValue("charges", Number(bien.charges));
          if (bien.caution_mois)
            setValue("caution_mois", Number(bien.caution_mois));
          if (bien.avance_mois)
            setValue("avance_mois", Number(bien.avance_mois));
          if (bien.frais_assistance)
            setValue("frais_assistance", Number(bien.frais_assistance));
        }

        // Déterminer l'étape actuelle
        if (demandeData.paiement_effectue) {
          setStep("signature");
        } else if (demandeData.paiement_demande_envoyee) {
          setStep("paiement");
        } else {
          setStep("tarifs");
        }
      } catch (error) {
        console.error("Erreur lors de la récupération des tarifs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTarifs();
  }, [resolvedParams.demandeId, setValue]);

  // Réinitialiser busy quand l'étape change
  useEffect(() => {
    setBusy(false);
  }, [step]);

  // Mettre à jour les valeurs watchées après le chargement
  useEffect(() => {
    if (!loading) {
      // Force la mise à jour des valeurs watchées
      setValue("loyer_hc", watch("loyer_hc") || 0);
      setValue("charges", watch("charges") || 0);
    }
  }, [loading, setValue, watch]);

  async function onSubmitTarifs(data: FieldValues) {
    setBusy(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("accessToken="))
        ?.split("=")[1];

      if (!token) {
        throw new Error("Non authentifié. Veuillez vous reconnecter.");
      }

      const response = await fetch(
        `${API_URL}/demandes-actions/${resolvedParams.demandeId}/tarifs`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.detail || "Erreur lors de l'enregistrement des tarifs",
        );
      }

      setBusy(false);
      setStep("paiement");
      setPaiementDemandeEnvoyee(true);
    } catch (error: any) {
      alert(error.message || "Erreur réseau");
      setBusy(false);
    }
  }

  async function handleDemanderPaiement() {
    setBusy(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("accessToken="))
        ?.split("=")[1];

      if (!token) {
        throw new Error("Non authentifié. Veuillez vous reconnecter.");
      }

      // 1. Générer et envoyer la facture par email
      const factureResponse = await fetch(
        `${API_URL}/demandes-actions/${resolvedParams.demandeId}/facture`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!factureResponse.ok) {
        const error = await factureResponse.json().catch(() => ({}));
        throw new Error(error.detail || "Erreur lors de l'envoi de la facture");
      }

      // 2. Envoyer la demande de paiement
      const paymentResponse = await fetch(
        `${API_URL}/demandes-actions/${resolvedParams.demandeId}/request-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!paymentResponse.ok) {
        const error = await paymentResponse.json().catch(() => ({}));
        throw new Error(
          error.detail || "Erreur lors de la demande de paiement",
        );
      }

      setPaiementDemandeEnvoyee(true);
      alert(
        "Facture envoyée par email au locataire ! Le lien de paiement a été généré.",
      );
    } catch (error: any) {
      alert(error.message || "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  async function handleSigner() {
    setBusy(true);
    try {
      const token = document.cookie
        .split("; ")
        .find((row) => row.startsWith("accessToken="))
        ?.split("=")[1];

      if (!token) {
        throw new Error("Non authentifié. Veuillez vous reconnecter.");
      }

      const response = await fetch(
        `${API_URL}/demandes-actions/${resolvedParams.demandeId}/signer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Erreur lors de la signature");
      }

      setStep("done");
    } catch (error: any) {
      alert(error.message || "Erreur réseau");
      setBusy(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton />
      </div>

      <div className="max-w-3xl mx-auto">
        <Heading
          title={
            <div className="flex items-center gap-2">
              <CreditCard className="w-6 h-6" />
              <span>Finaliser le Bail</span>
            </div>
          }
          subtitle="Configurez les tarifs et signez le bail"
        />

        {step === "tarifs" && (
          <form
            onSubmit={handleSubmit(onSubmitTarifs)}
            className="mt-8 space-y-6"
          >
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Configuration des tarifs
              </h3>

              {loading ? (
                <div className="flex items-center justify-center py-8 text-neutral-500">
                  Chargement des tarifs...
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      id="loyer_hc"
                      label="Loyer Hors Charges (FCFA)"
                      type="number"
                      formatPrice
                      disabled={busy}
                      register={register}
                      errors={errors}
                      required
                      min={0}
                    />
                    <Input
                      id="charges"
                      label="Charges mensuelles (FCFA)"
                      type="number"
                      formatPrice
                      disabled={busy}
                      register={register}
                      errors={errors}
                      required
                      min={0}
                    />
                  </div>

                  <hr className="my-6" />

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      id="caution_mois"
                      label="Mois de caution"
                      type="number"
                      disabled={busy}
                      register={register}
                      errors={errors}
                      required
                      min={1}
                      max={12}
                    />
                    <Input
                      id="avance_mois"
                      label="Mois d'avance"
                      type="number"
                      disabled={busy}
                      register={register}
                      errors={errors}
                      required
                      min={0}
                      max={12}
                    />
                  </div>

                  <Input
                    id="frais_assistance"
                    label="Frais d'assistance (FCFA)"
                    type="number"
                    formatPrice
                    disabled={busy}
                    register={register}
                    errors={errors}
                    required
                    min={0}
                  />

                  <hr className="my-6" />

                  {/* Récapitulatif */}
                  <div className="bg-neutral-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">
                        Caution ({cautionMois} mois)
                      </span>
                      <span className="font-semibold">
                        {totalCaution.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">
                        Avance ({avanceMois} mois)
                      </span>
                      <span className="font-semibold">
                        {totalAvance.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-600">
                        Frais d'assistance
                      </span>
                      <span className="font-semibold">
                        {fraisAssistance.toLocaleString()} FCFA
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
                      <span className="text-neutral-900">Total à payer</span>
                      <span className="text-blue-600">
                        {totalAPayer.toLocaleString()} FCFA
                      </span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <Link
                href={`/admin/dashboard/demandes-actions/${resolvedParams.demandeId}`}
                className="flex-1 rounded-xl border border-neutral-300 bg-white px-6 py-3 text-center text-sm font-bold text-neutral-700 hover:bg-neutral-50 transition flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Annuler
              </Link>
              <button
                type="submit"
                disabled={busy || loading}
                className="flex-1 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                Enregistrer et continuer
                <ArrowLeft className="w-4 h-4 rotate-180" />
              </button>
            </div>
          </form>
        )}

        {step === "paiement" && (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
              <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                <Hourglass className="w-5 h-5" />
                Étape 2: Demander le paiement
              </h3>
              <p className="text-purple-800 mb-6">
                Les tarifs ont été configurés. Maintenant, envoyez une demande
                de paiement au locataire.
              </p>

              <div className="bg-white rounded-xl p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Loyer HC + Charges</span>
                    <span className="font-semibold">
                      {(loyerHC + watch("charges")).toLocaleString()} FCFA/mois
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Caution</span>
                    <span className="font-semibold">
                      {totalCaution.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Avance</span>
                    <span className="font-semibold">
                      {totalAvance.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span className="text-neutral-900">Total</span>
                    <span className="text-purple-600">
                      {totalAPayer.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDemanderPaiement}
                disabled={busy}
                className="w-full rounded-xl bg-purple-600 px-6 py-4 text-base font-bold text-white hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CreditCard className="w-5 h-5" />
                Envoyer la demande de paiement au locataire
              </button>
            </div>

            <Link
              href={`/admin/dashboard/demandes-actions/${resolvedParams.demandeId}`}
              className="block text-center text-sm font-semibold text-neutral-600 hover:text-neutral-800 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
          </div>
        )}

        {step === "signature" && (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
              <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Paiement confirmé - Signer le bail
              </h3>
              <p className="text-green-800 mb-6">
                Le locataire a confirmé le paiement. Vous pouvez maintenant
                signer le bail.
              </p>

              <div className="bg-white rounded-xl p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Loyer HC + Charges</span>
                    <span className="font-semibold">
                      {(loyerHC + watch("charges")).toLocaleString()} FCFA/mois
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Caution</span>
                    <span className="font-semibold">
                      {totalCaution.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-600">Avance</span>
                    <span className="font-semibold">
                      {totalAvance.toLocaleString()} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span className="text-neutral-900">Total</span>
                    <span className="text-blue-600">
                      {totalAPayer.toLocaleString()} FCFA
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSigner}
                disabled={busy}
                className="w-full rounded-xl bg-green-600 px-6 py-4 text-base font-bold text-white hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Signer le bail
              </button>
            </div>

            <Link
              href={`/admin/dashboard/demandes-actions/${resolvedParams.demandeId}`}
              className="block text-center text-sm font-semibold text-neutral-600 hover:text-neutral-800 flex items-center justify-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Link>
          </div>
        )}

        {step === "done" && (
          <div className="mt-8">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
              <div className="mb-4 flex justify-center">
                <CheckCircle2 className="w-16 h-16 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-green-900 mb-2">
                Bail signé avec succès !
              </h3>
              <p className="text-green-800 mb-6">
                Le locataire peut maintenant signer à son tour. Une fois les
                deux signatures obtenues, le PDF sera généré et envoyé
                automatiquement.
              </p>
              <Link
                href="/admin/dashboard/demandes-actions"
                className="inline-block rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white hover:bg-green-700 transition"
              >
                Retour aux demandes
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
