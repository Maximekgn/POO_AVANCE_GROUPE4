"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import { toast } from "react-hot-toast";
import {
  AdminCategory,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory
} from "../lib/adminApi";
import ImageUpload from "@/components/Inputs/ImageUpload";
import Heading from "@/components/Heading";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api").replace("/api", "");

function getSafeImageSrc(src?: string | null): string {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("/")) return src;
  return `${API_BASE_URL}/${src}`;
}

interface CategoriesTableClientProps {
  initialCategories: AdminCategory[];
  accessToken: string;
}

export default function CategoriesTableClient({
  initialCategories,
  accessToken
}: CategoriesTableClientProps) {
  const [categories, setCategories] = useState<AdminCategory[]>(initialCategories);
  const [isLoading, setIsLoading] = useState(false);
  const [query, setQuery] = useState("");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);

  // Form states
  const [nom, setNom] = useState("");
  const [ordre, setOrdre] = useState(0);
  const [actif, setActif] = useState(true);
  const [imageSrc, setImageSrc] = useState<string[]>([]);

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) =>
      cat.nom.toLowerCase().includes(query.toLowerCase())
    ).sort((a, b) => a.ordre - b.ordre);
  }, [categories, query]);

  const resetForm = () => {
    setNom("");
    setOrdre(0);
    setActif(true);
    setImageSrc([]);
    setEditingCategory(null);
  };

  const onOpenCreate = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const onOpenEdit = (category: AdminCategory) => {
    setEditingCategory(category);
    setNom(category.nom);
    setOrdre(category.ordre);
    setActif(category.actif);
    setImageSrc(category.image ? [category.image] : []);
    setIsModalOpen(true);
  };

  const onSubmit = async () => {
    if (!nom.trim()) {
      toast.error("Le nom est obligatoire");
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append("nom", nom);
    formData.append("ordre", String(ordre));
    formData.append("actif", String(actif));

    if (imageSrc.length > 0 && imageSrc[0].startsWith("data:")) {
      // It's a base64 from ImageUpload, convert to Blob
      const response = await fetch(imageSrc[0]);
      const blob = await response.blob();
      formData.append("image", blob, "category.png");
    }

    try {
      let result;
      if (editingCategory) {
        result = await updateAdminCategory(editingCategory.id, formData, accessToken);
      } else {
        result = await createAdminCategory(formData, accessToken);
      }

      if (result.ok) {
        toast.success(editingCategory ? "Catégorie mise à jour" : "Catégorie créée");
        // Reload page or update state
        window.location.reload();
      } else {
        toast.error(result.message || "Une erreur est survenue");
      }
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Voulez-vous vraiment supprimer cette catégorie ?")) return;

    setIsLoading(true);
    try {
      const result = await deleteAdminCategory(id, accessToken);
      if (result.ok) {
        toast.success("Catégorie supprimée");
        setCategories((prev) => prev.filter((cat) => cat.id !== id));
      } else {
        toast.error(result.message || "Suppression impossible");
      }
    } catch (error) {
      toast.error("Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm">
        <div className="flex-1 w-full md:w-auto">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une catégorie..."
            className="h-11 w-full max-w-md rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white"
          />
        </div>
        <button
          onClick={onOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-md shadow-blue-100 transition-all active:scale-95"
        >
          Nouvelle Catégorie
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCategories.map((category) => (
          <div
            key={category.id}
            className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
          >
            <div className="relative h-40 w-full bg-neutral-100">
              {category.image ? (
                <Image
                  src={getSafeImageSrc(category.image)}
                  alt={category.nom}
                  fill
                  unoptimized
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-black">
                  Pas d&apos;image
                </div>
              )}
              <div className="absolute top-3 right-3">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${category.actif
                    ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                    : "bg-rose-50 text-rose-700 border-rose-100"
                  }`}>
                  {category.actif ? "Actif" : "Inactif"}
                </span>
              </div>
            </div>

            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-neutral-900 line-clamp-1">{category.nom}</h3>
                  <p className="text-xs text-neutral-500">Ordre d&apos;affichage: {category.ordre}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-auto">
                <button
                  onClick={() => onOpenEdit(category)}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 py-2 rounded-xl text-xs font-bold transition"
                >
                  Modifier
                </button>
                <button
                  onClick={() => onDelete(category.id)}
                  disabled={isLoading}
                  className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-2 rounded-xl transition disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white rounded-[32px] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <Heading
                title={editingCategory ? "Modifier la catégorie" : "Nouvelle catégorie"}
                subtitle={editingCategory ? "Mettez à jour les informations de la catégorie" : "Ajoutez un nouveau type de bien"}
              />
              <button onClick={() => setIsModalOpen(false)} className="text-black hover:text-neutral-900 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              <div className="space-y-1">
                <label className="text-sm font-bold text-neutral-700 ml-1">Nom de la catégorie</label>
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Appartement, Maison, Studio..."
                  className="w-full h-12 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-bold text-neutral-700 ml-1">Ordre d&apos;affichage</label>
                  <input
                    type="number"
                    value={ordre}
                    onChange={(e) => setOrdre(Number(e.target.value))}
                    className="w-full h-12 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 text-sm outline-none focus:border-blue-500 focus:bg-white transition"
                  />
                </div>
                <div className="flex flex-col justify-end pb-1 ml-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={actif}
                      onChange={(e) => setActif(e.target.checked)}
                      className="w-5 h-5 accent-blue-600 rounded"
                    />
                    <span className="text-sm font-bold text-neutral-700 group-hover:text-blue-600 transition">Catégorie active</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-bold text-neutral-700 ml-1">Image / Icône</label>
                <ImageUpload
                  value={imageSrc}
                  onChange={(val) => setImageSrc(val)}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-3 rounded-2xl border border-neutral-200 text-sm font-bold text-neutral-600 hover:bg-neutral-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={onSubmit}
                disabled={isLoading}
                className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-100 transition disabled:opacity-50"
              >
                {isLoading ? "Enregistrement..." : (editingCategory ? "Mettre à jour" : "Créer la catégorie")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
