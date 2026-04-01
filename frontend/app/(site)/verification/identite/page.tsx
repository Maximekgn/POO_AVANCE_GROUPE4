"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function IdentityVerificationPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState({
    piece_identite_recto: null as File | null,
    piece_identite_verso: null as File | null,
    photo_avec_piece: null as File | null,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setFiles((prev) => ({ ...prev, [name]: files[0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!files.piece_identite_recto || !files.piece_identite_verso || !files.photo_avec_piece) {
      toast.error("Veuillez télécharger tous les documents requis.");
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("piece_identite_recto", files.piece_identite_recto);
    formData.append("piece_identite_verso", files.piece_identite_verso);
    formData.append("photo_avec_piece", files.photo_avec_piece);

    try {
      const token = localStorage.getItem("accessToken") || "";
      const response = await fetch(`${API_URL}/verification/identite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Documents soumis avec succès ! En attente de vérification.");
        router.push("/profile");
      } else {
        toast.error(data.error || "Erreur lors de l'envoi des documents.");
      }
    } catch {
      toast.error("Erreur réseau. Veuillez réessayer.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container>
      <div className="max-w-3xl mx-auto py-12">
        <Heading
          title="Vérification d'identité"
          subtitle="Pour des raisons de sécurité, nous devons vérifier votre identité."
        />

        <div className="mt-8 bg-white rounded-2xl border border-neutral-200 p-8">
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <h3 className="font-semibold text-blue-900 mb-2">📋 Documents requis :</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Recto de votre pièce d'identité (CNI, Passeport, etc.)</li>
              <li>• Verso de votre pièce d'identité</li>
              <li>• Une photo de vous tenant votre pièce d'identité</li>
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Recto */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Recto de la pièce d'identité *
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  name="piece_identite_recto"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex-1 text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
                {files.piece_identite_recto && (
                  <span className="text-sm text-green-600">✓ {files.piece_identite_recto.name}</span>
                )}
              </div>
            </div>

            {/* Verso */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Verso de la pièce d'identité *
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  name="piece_identite_verso"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex-1 text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
                {files.piece_identite_verso && (
                  <span className="text-sm text-green-600">✓ {files.piece_identite_verso.name}</span>
                )}
              </div>
            </div>

            {/* Photo avec pièce */}
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">
                Photo de vous avec votre pièce d'identité *
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  name="photo_avec_piece"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="flex-1 text-sm text-neutral-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  required
                />
                {files.photo_avec_piece && (
                  <span className="text-sm text-green-600">✓ {files.photo_avec_piece.name}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-neutral-500">
                Prenez une photo de vous tenant votre pièce d'identité devant votre visage.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Envoi en cours..." : "Soumettre mes documents"}
            </button>
          </form>
        </div>
      </div>
    </Container>
  );
}
