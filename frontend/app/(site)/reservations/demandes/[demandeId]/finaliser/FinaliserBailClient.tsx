"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import axios from "axios";
import {
  CreditCard,
  FileText,
  CheckCircle2,
  Hourglass,
  Signature,
  DollarSign,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface DemandeAction {
  id: number;
  type_demande: "BAIL";
  statut: string;
  bien: number;
  bien_details?: {
    id: number;
    reference: string;
    ville: string;
    adresse: string;
    prix_mois?: number | string;
    loyer_hc?: number | string;
    charges?: number | string;
    caution_mois?: number;
    avance_mois?: number;
    frais_assistance?: number | string;
    depot_garantie?: number | string;
  };
  bien_reference: string;
  bien_adresse: string;
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
  paiement_demande_envoyee?: boolean;
  paiement_effectue?: boolean;
  has_lease?: boolean;
  bail_details?: {
    id: number;
    numero_bail: string;
    statut: "BROUILLON" | "EN_ATTENTE_SIGNATURE" | "SIGNE" | "ACTIF";
    date_signature_proprietaire?: string | null;
    date_signature_client?: string | null;
  } | null;
}

interface User {
  id: string;
  accessToken: string;
}

interface FinaliserBailClientProps {
  demande: DemandeAction;
  user: User;
}

export default function FinaliserBailClient({
  demande,
  user,
}: FinaliserBailClientProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<
    "tarifs" | "paiement" | "signature" | "done"
  >("tarifs");

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
  const totalAPayer =
    totalCaution + totalAvance + (loyerHC + charges) + fraisAssistance;

  // Initialiser les valeurs depuis le backend
  useEffect(() => {
    if (demande.bien_details) {
      setValue("loyer_hc", Number(demande.bien_details.loyer_hc) || 0);
      setValue("charges", Number(demande.bien_details.charges) || 0);
      setValue("caution_mois", demande.bien_details.caution_mois || 2);
      setValue("avance_mois", demande.bien_details.avance_mois || 1);
      setValue(
        "frais_assistance",
        Number(demande.bien_details.frais_assistance) || 0,
      );
      setValue(
        "depot_garantie",
        Number(demande.bien_details.depot_garantie) || 0,
      );
    }

    // Déterminer l'étape actuelle
    if (demande.paiement_effectue) {
      setStep("signature");
    } else if (demande.paiement_demande_envoyee) {
      setStep("paiement");
    } else {
      setStep("tarifs");
    }
  }, [demande, setValue]);

  // Étape 1: Configurer les tarifs et initialiser le bail
  const onTarifsSubmit: SubmitHandler<FieldValues> = async (data) => {
    setBusy(true);
    try {
      await axios.post(
        `${API_URL}/demandes-actions/${demande.id}/init-bail`,
        {
          caution_mois: Number(data.caution_mois),
          avance_mois: Number(data.avance_mois),
          frais_assistance: Number(data.frais_assistance),
        },
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );
      toast.success("Tarifs configurés avec succès !");
      router.refresh();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail ||
          "Erreur lors de la configuration des tarifs.",
      );
    } finally {
      setBusy(false);
    }
  };

  // Étape 2: Demander le paiement
  const handleRequestPayment = async () => {
    setBusy(true);
    try {
      await axios.post(
        `${API_URL}/demandes-actions/${demande.id}/request-payment`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );
      toast.success("Demande de paiement envoyée au locataire !");
      router.refresh();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail ||
          "Erreur lors de la demande de paiement.",
      );
    } finally {
      setBusy(false);
    }
  };

  // Étape 3: Finaliser et signer le bail
  const handleFinaliserBail = async () => {
    setBusy(true);
    try {
      const response = await axios.post(
        `${API_URL}/demandes-actions/${demande.id}/finaliser`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );
      toast.success(
        `Bail finalisé avec succès ! Numéro : ${response.data.numero_bail}`,
      );
      router.push("/reservations?tab=recues");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail ||
          "Erreur lors de la finalisation du bail.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Container>
      <div className="max-w-5xl py-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <Heading
          title="Finaliser le bail"
          subtitle={`Demande #${demande.id} - ${demande.bien_reference}`}
        />

        {/* Indicateur d'étapes */}
        <div className="mt-6 mb-8">
          <div className="flex items-center justify-between">
            <div
              className={`flex items-center gap-2 ${step === "tarifs" ? "text-amber-600" : "text-neutral-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step === "tarifs"
                    ? "border-amber-600 bg-amber-600 text-white"
                    : "border-neutral-300"
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">1. Tarifs</span>
            </div>
            <div
              className={`flex-1 h-1 mx-4 ${
                step !== "tarifs" ? "bg-green-600" : "bg-neutral-200"
              }`}
            />
            <div
              className={`flex items-center gap-2 ${step === "paiement" ? "text-purple-600" : "text-neutral-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step === "paiement"
                    ? "border-purple-600 bg-purple-600 text-white"
                    : "border-neutral-300"
                }`}
              >
                <Hourglass className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">2. Paiement</span>
            </div>
            <div
              className={`flex-1 h-1 mx-4 ${
                step === "signature" || step === "done"
                  ? "bg-green-600"
                  : "bg-neutral-200"
              }`}
            />
            <div
              className={`flex items-center gap-2 ${step === "signature" ? "text-green-600" : "text-neutral-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                  step === "signature"
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-neutral-300"
                }`}
              >
                <Signature className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">3. Signature</span>
            </div>
          </div>
        </div>

        {/* Étape 1: Configuration des tarifs */}
        {step === "tarifs" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Configurer les tarifs du bail
            </h3>
            <p className="text-sm text-amber-800 mb-6">
              Définissez les paramètres financiers avant de demander le paiement
              au locataire.
            </p>

            <form onSubmit={handleSubmit(onTarifsSubmit)}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-amber-900">
                    Loyer HC (FCFA/mois)
                  </label>
                  <input
                    type="number"
                    disabled
                    value={loyerHC}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-amber-900">
                    Charges (FCFA/mois)
                  </label>
                  <input
                    type="number"
                    disabled
                    value={charges}
                    className="w-full rounded-xl border border-neutral-300 bg-neutral-100 px-4 py-3 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-amber-900">
                    Caution (nombre de mois) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    {...register("caution_mois", {
                      required: "Ce champ est requis",
                      min: 1,
                      max: 12,
                    })}
                    className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                  {errors.caution_mois && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.caution_mois.message as string}
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-amber-900">
                    Avance (nombre de mois) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    {...register("avance_mois", {
                      required: "Ce champ est requis",
                      min: 0,
                      max: 12,
                    })}
                    className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                  {errors.avance_mois && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.avance_mois.message as string}
                    </p>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-amber-900">
                    Frais d'assistance (FCFA)
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register("frais_assistance", {
                      required: "Ce champ est requis",
                      min: 0,
                    })}
                    className="w-full rounded-xl border border-amber-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                  />
                  {errors.frais_assistance && (
                    <p className="mt-1 text-xs text-red-600">
                      {errors.frais_assistance.message as string}
                    </p>
                  )}
                </div>
              </div>

              {/* Récapitulatif financier */}
              <div className="rounded-xl bg-white p-4 mb-6">
                <p className="text-sm font-semibold text-amber-900 mb-3">
                  Récapitulatif financier :
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      Caution ({cautionMois} mois × {loyerHC} FCFA)
                    </span>
                    <span>{totalCaution.toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      Avance ({avanceMois} mois × {loyerHC} FCFA)
                    </span>
                    <span>{totalAvance.toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Premier mois (HC + Charges)</span>
                    <span>
                      {(loyerHC + charges).toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Frais d'assistance</span>
                    <span>{fraisAssistance.toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  <div className="flex justify-between border-t-2 border-amber-200 pt-3 text-base font-bold text-amber-900">
                    <span>Total à payer</span>
                    <span>{totalAPayer.toLocaleString("fr-FR")} FCFA</span>
                  </div>
                </div>
              </div>

              <Button
                label={
                  busy
                    ? "Traitement..."
                    : "Configurer les tarifs et demander le paiement"
                }
                type="submit"
                disabled={busy}
              />
            </form>
          </div>
        )}

        {/* Étape 2: Paiement en attente */}
        {step === "paiement" && (
          <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
            <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
              <Hourglass className="w-5 h-5" />
              Paiement en attente
            </h3>
            <p className="text-sm text-purple-800 mb-6">
              La demande de paiement a été envoyée au locataire. En attente de
              confirmation.
            </p>

            <div className="rounded-xl bg-white p-4 mb-6">
              <p className="text-sm font-semibold text-purple-900 mb-3">
                Montant à payer :
              </p>
              <p className="text-3xl font-bold text-purple-900">
                {totalAPayer.toLocaleString("fr-FR")} FCFA
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                label="Relancer le locataire"
                onClick={handleRequestPayment}
                disabled={busy}
                secondary
              />
              <Button
                label="Actualiser le statut"
                onClick={() => router.refresh()}
                disabled={busy}
              />
            </div>
          </div>
        )}

        {/* Étape 3: Finaliser le bail */}
        {step === "signature" && (
          <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
            <h3 className="text-lg font-bold text-green-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Paiement confirmé - Finaliser le bail
            </h3>
            <p className="text-sm text-green-800 mb-6">
              Le paiement a été confirmé. Finalisez le bail et envoyez-le pour
              signature.
            </p>

            <div className="rounded-xl bg-white p-4 mb-6">
              <p className="text-sm font-semibold text-green-900 mb-3">
                Récapitulatif du bail :
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-neutral-600">
                  <span>Locataire</span>
                  <span className="font-medium">{demande.demandeur_nom}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Bien</span>
                  <span className="font-medium">{demande.bien_reference}</span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Période</span>
                  <span className="font-medium">
                    {demande.date_debut
                      ? new Date(demande.date_debut).toLocaleDateString("fr-FR")
                      : "-"}{" "}
                    au{" "}
                    {demande.date_fin
                      ? new Date(demande.date_fin).toLocaleDateString("fr-FR")
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-600">
                  <span>Durée</span>
                  <span className="font-medium">{demande.duree_mois} mois</span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 pt-2 font-bold text-green-900">
                  <span>Montant payé</span>
                  <span>{totalAPayer.toLocaleString("fr-FR")} FCFA</span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-green-100 p-4 mb-6">
              <p className="text-sm text-green-900">
                <strong className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Prochaines étapes :
                </strong>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Cliquez sur "Finaliser et signer le bail"</li>
                  <li>Le bail sera généré et signé par vos soins</li>
                  <li>
                    Le locataire recevra un email pour signer électroniquement
                  </li>
                  <li>
                    Une fois les deux signatures obtenues, le bail sera effectif
                  </li>
                </ol>
              </p>
            </div>

            <Button
              label={busy ? "Traitement..." : "Finaliser et signer le bail"}
              onClick={handleFinaliserBail}
              disabled={busy}
            />
          </div>
        )}
      </div>
    </Container>
  );
}
