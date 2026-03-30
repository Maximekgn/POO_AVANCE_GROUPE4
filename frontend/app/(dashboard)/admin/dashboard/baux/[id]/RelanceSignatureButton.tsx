"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

interface RelanceSignatureButtonProps {
  bailId: number;
  token: string;
  apiUrl: string;
}

export default function RelanceSignatureButton({
  bailId,
  token,
  apiUrl,
}: RelanceSignatureButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleRelance = async () => {
    if (!confirm("Voulez-vous vraiment renvoyer la demande de signature au locataire ?")) {
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${apiUrl}/baux/${bailId}/relancer-signature`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || "Erreur lors de la relance");
      }

      alert("✅ La demande de signature a été renvoyée au locataire !");
    } catch (error: any) {
      alert(`❌ Erreur : ${error.message || "Erreur lors de la relance"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRelance}
      disabled={loading}
      className="rounded-xl border-2 border-purple-300 bg-white px-4 py-2 font-semibold text-purple-700 hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
    >
      <Mail className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
      {loading ? "Envoi en cours..." : "📧 Relancer la signature"}
    </button>
  );
}
