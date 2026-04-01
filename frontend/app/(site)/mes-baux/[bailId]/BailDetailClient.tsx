"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import BackButton from "@/components/BackButton";
import Button from "@/components/Button";
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
  Download,
  Mail,
  Signature,
} from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

interface BailDetail {
  id: number;
  numero_bail: string;
  statut: "BROUILLON" | "EN_ATTENTE_SIGNATURE" | "SIGNE" | "ACTIF" | "TERMINE";
  date_entree: string;
  date_sortie: string;
  date_signature_proprietaire?: string | null;
  date_signature_client?: string | null;
  loyer_actuel: number;
  depot_garantie: number;
  bien: {
    id: number;
    reference: string;
    adresse: string;
    ville: string;
    loyer_hc?: number;
    charges?: number;
  };
  client_info?: {
    utilisateur: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      telephone?: string;
    };
  };
  proprietaire_info?: {
    utilisateur: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      telephone?: string;
    };
  };
  signatures?: Array<{
    id: number;
    type_signataire: "PROPRIETAIRE" | "LOCATAIRE";
    signe_le?: string | null;
    signature_ip?: string;
  }>;
}

interface User {
  id: string;
  accessToken: string;
}

interface BailDetailClientProps {
  bail: BailDetail;
  user: User;
}

export default function BailDetailClient({
  bail,
  user,
}: BailDetailClientProps) {
  const router = useRouter();
  const [signing, setSigning] = useState(false);

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

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSignerBail = async () => {
    setSigning(true);
    try {
      await axios.post(
        `${API_URL}/baux/${bail.id}/signer`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );
      toast.success("Bail signé avec succès !");
      router.refresh();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail || "Erreur lors de la signature.",
      );
    } finally {
      setSigning(false);
    }
  };

  const handleRelancerSignature = async () => {
    try {
      await axios.post(
        `${API_URL}/baux/${bail.id}/relancer-signature`,
        {},
        {
          headers: {
            Authorization: `Bearer ${user.accessToken}`,
          },
        },
      );
      toast.success("Email de relance envoyé avec succès !");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.detail ||
          "Erreur lors de l'envoi de la relance.",
      );
    }
  };

  const handleTelechargerBail = async () => {
    try {
      const res = await fetch(`${API_URL}/baux/${bail.id}/envoyer-bail`, {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      });
      if (res.ok) {
        toast.success("Bail téléchargé avec succès !");
      }
    } catch (error) {
      toast.error("Erreur lors du téléchargement du bail.");
    }
  };

  const canSign = bail.statut === "EN_ATTENTE_SIGNATURE";
  const isProprietaire =
    user.id === bail.proprietaire_info?.utilisateur?.id?.toString();
  const isLocataire = user.id === bail.client_info?.utilisateur?.id?.toString();

  const signatureProprietaire = bail.signatures?.find(
    (s) => s.type_signataire === "PROPRIETAIRE",
  );
  const signatureLocataire = bail.signatures?.find(
    (s) => s.type_signataire === "LOCATAIRE",
  );

  return (
    <Container>
      <div className="max-w-5xl py-8">
        <div className="mb-6">
          <BackButton />
        </div>

        <div className="flex items-center justify-between mb-6">
          <Heading
            title={`Bail ${bail.numero_bail}`}
            subtitle={bail.bien.reference}
          />
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
              statutColors[bail.statut] || statutColors.BROUILLON
            }`}
          >
            {bail.statut === "ACTIF" && <CheckCircle className="w-4 h-4" />}
            {bail.statut === "EN_ATTENTE_SIGNATURE" && (
              <Clock className="w-4 h-4" />
            )}
            {statutLabels[bail.statut]}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property info */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5" />
                Informations sur le bien
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-neutral-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-neutral-500">
                      Adresse
                    </p>
                    <p className="text-neutral-900">{bail.bien.adresse}</p>
                    <p className="text-neutral-600">{bail.bien.ville}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-neutral-400" />
                  <div>
                    <p className="text-sm font-medium text-neutral-500">
                      Référence
                    </p>
                    <p className="text-neutral-900">{bail.bien.reference}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Lease dates */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Période du bail
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">
                    Date d'entrée
                  </p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">
                    {formatDate(bail.date_entree)}
                  </p>
                </div>
                <div className="rounded-xl bg-neutral-50 p-4">
                  <p className="text-sm font-medium text-neutral-500">
                    Date de sortie
                  </p>
                  <p className="mt-1 text-lg font-semibold text-neutral-900">
                    {formatDate(bail.date_sortie)}
                  </p>
                </div>
              </div>
            </div>

            {/* Financial info */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Euro className="w-5 h-5" />
                Informations financières
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">
                    Loyer mensuel (HC + Charges)
                  </span>
                  <span className="font-semibold text-neutral-900">
                    {bail.loyer_actuel?.toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-neutral-100">
                  <span className="text-neutral-600">Dépôt de garantie</span>
                  <span className="font-semibold text-neutral-900">
                    {bail.depot_garantie?.toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <Signature className="w-5 h-5" />
                Signatures
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        signatureProprietaire?.signe_le
                          ? "bg-green-100 text-green-600"
                          : "bg-neutral-200 text-neutral-500"
                      }`}
                    >
                      {signatureProprietaire?.signe_le ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">
                        Propriétaire
                      </p>
                      <p className="text-sm text-neutral-500">
                        {signatureProprietaire?.signe_le
                          ? `Signé le ${formatDate(signatureProprietaire.signe_le)}`
                          : "En attente de signature"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        signatureLocataire?.signe_le
                          ? "bg-green-100 text-green-600"
                          : "bg-neutral-200 text-neutral-500"
                      }`}
                    >
                      {signatureLocataire?.signe_le ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Clock className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900">Locataire</p>
                      <p className="text-sm text-neutral-500">
                        {signatureLocataire?.signe_le
                          ? `Signé le ${formatDate(signatureLocataire.signe_le)}`
                          : "En attente de signature"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Parties info */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5" />
                Parties
              </h3>
              <div className="space-y-4">
                {bail.proprietaire_info?.utilisateur && (
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase">
                      Propriétaire
                    </p>
                    <p className="font-medium text-neutral-900">
                      {bail.proprietaire_info.utilisateur.first_name}{" "}
                      {bail.proprietaire_info.utilisateur.last_name}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {bail.proprietaire_info.utilisateur.email}
                    </p>
                  </div>
                )}
                {bail.client_info?.utilisateur && (
                  <div>
                    <p className="text-xs font-medium text-neutral-500 uppercase">
                      Locataire
                    </p>
                    <p className="font-medium text-neutral-900">
                      {bail.client_info.utilisateur.first_name}{" "}
                      {bail.client_info.utilisateur.last_name}
                    </p>
                    <p className="text-sm text-neutral-600">
                      {bail.client_info.utilisateur.email}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-neutral-900 mb-4">
                Actions
              </h3>
              <div className="space-y-3">
                {canSign && (
                  <Button
                    label={signing ? "Signature en cours..." : "Signer le bail"}
                    onClick={handleSignerBail}
                    disabled={signing}
                  />
                )}
                {bail.statut === "EN_ATTENTE_SIGNATURE" && !canSign && (
                  <Button
                    label="Relancer pour signature"
                    onClick={handleRelancerSignature}
                    secondary
                  />
                )}
                {(bail.statut === "SIGNE" || bail.statut === "ACTIF") && (
                  <Button
                    label="Télécharger le bail"
                    onClick={handleTelechargerBail}
                    secondary
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
