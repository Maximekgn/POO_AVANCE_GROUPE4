"use client";

import { useState } from "react";
import { RotateCcw, Mail } from "lucide-react";

interface RelancePaiementButtonProps {
  demandeId: number;
  token: string;
  apiUrl: string;
}

export default function RelancePaiementButton({
  demandeId,
  token,
  apiUrl,
}: RelancePaiementButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRelance = async () => {
    if (
      !confirm(
        "Voulez-vous vraiment renvoyer la demande de paiement au locataire ?",
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      console.log("[RelancePaiement] Envoi requête POST...", {
        demandeId,
        apiUrl,
        hasToken: !!token,
      });

      const response = await fetch(
        `${apiUrl}/demandes-actions/${demandeId}/request-payment`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      console.log("[RelancePaiement] Réponse reçue:", response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("[RelancePaiement] Erreur backend:", error);
        throw new Error(
          error.detail || error.message || "Erreur lors de la relance",
        );
      }

      const data = await response.json().catch(() => ({}));
      console.log("[RelancePaiement] Succès:", data);

      alert("✅ La demande de paiement a été renvoyée au locataire !");
    } catch (error: any) {
      console.error("[RelancePaiement] Erreur:", error);
      alert(`❌ Erreur : ${error.message || "Erreur lors de la relance"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRelance}
      disabled={loading}
      className="w-full rounded-xl border-2 border-purple-300 bg-white px-4 py-3 text-sm font-bold text-purple-700 hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      {loading ? (
        <RotateCcw className="w-5 h-5 animate-spin" />
      ) : (
        <Mail className="w-5 h-5" />
      )}
      {loading ? "Envoi en cours..." : "📧 Relancer le paiement au locataire"}
    </button>
  );
}
