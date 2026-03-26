"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Container from "@/components/Container";
import Heading from "@/components/Heading";
import Input from "@/components/Inputs/Input";
import { useForm, FieldValues, SubmitHandler } from "react-hook-form";
import axios from "axios";
import toast from "react-hot-toast";

interface EditPropertyClientProps {
  property: any;
}

const EditPropertyClient: React.FC<EditPropertyClientProps> = ({ property }) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      title: property.title,
      description: property.description,
      price: property.price,
      priceMonthly: property.priceMonthly,
      statut: property.statut || "VACANT",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);
    try {
      // Construction of payload. Note: Adjust payload format based on backend serializer requirements
      const payload = {
        reference: data.title,
        description: data.description,
        prix_jour: parseFloat(data.price),
        prix_mois: parseFloat(data.priceMonthly),
        loyer_hc: parseFloat(data.priceMonthly),
        statut: data.statut,
      };

      await axios.patch(`/api/listings/${property.id}`, payload);
      toast.success("Bien modifié avec succès");
      router.push("/properties");
      router.refresh();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Erreur lors de la modification");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <div className="pt-24 max-w-3xl mx-auto flex flex-col gap-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <Heading
            title={`Modifier: ${property.title}`}
            subtitle="Mettez à jour les informations, le prix et le statut de votre bien"
          />
        </div>

        <div className="bg-white rounded-3xl p-8 border border-neutral-200 shadow-sm flex flex-col gap-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <Input
                id="title"
                label="Titre / Référence"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <Input
                id="description"
                label="Description détaillée"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
              />
            </div>
            <div className="col-span-1">
              <Input
                id="price"
                label="Prix par jour"
                formatPrice
                type="number"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
              />
            </div>
            <div className="col-span-1">
              <Input
                id="priceMonthly"
                label="Prix par mois / Loyer mensuel"
                formatPrice
                type="number"
                disabled={isLoading}
                register={register}
                errors={errors}
                required
              />
            </div>
            <div className="col-span-1 md:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-black ml-1 mb-1 block">
                Statut du bien
              </label>
              <select
                {...register("statut", { required: true })}
                disabled={isLoading}
                className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm font-semibold outline-none transition focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600"
              >
                <option value="VACANT">Vacant (Disponible à la location)</option>
                <option value="LOUE">Loué (Occupé)</option>
                <option value="EN_TRAVAUX">En Travaux</option>
              </select>
            </div>
          </div>

          <hr className="border-neutral-100" />

          <div className="flex flex-col md:flex-row gap-4 justify-end">
            <button
              disabled={isLoading}
              onClick={() => router.push("/properties")}
              className="px-6 py-3 font-bold text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition"
            >
              Annuler
            </button>
            <button
              disabled={isLoading}
              onClick={handleSubmit(onSubmit)}
              className="px-6 py-3 font-bold text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 transition shadow-md disabled:opacity-50"
            >
              {isLoading ? "Enregistrement..." : "Sauvegarder les modifications"}
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default EditPropertyClient;
