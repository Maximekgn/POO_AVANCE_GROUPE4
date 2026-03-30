"use client";

import useBailModal from "@/app/(site)/hooks/useBailModal";
import Modal from "./Modal";
import { useState } from "react";
import Heading from "../Heading";
import Input from "../Inputs/Input";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const BailModal = () => {
  const bailModal = useBailModal();
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FieldValues>({
    defaultValues: {
      mois: 6,
      dateDebut: "",
    },
  });

  const mois = watch("mois");
  const dateDebut = watch("dateDebut");

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    if (!bailModal.listingId) {
      toast.error("Erreur: bien non spécifié");
      return;
    }

    if (!data.dateDebut) {
      toast.error("Veuillez sélectionner une date de début");
      return;
    }

    setIsLoading(true);

    try {
      await axios.post("/api/reservations", {
        listingId: bailModal.listingId,
        action: "BAIL",
        mois: data.mois,
        startDate: data.dateDebut,
        endDate: new Date(
          new Date(data.dateDebut).setMonth(
            new Date(data.dateDebut).getMonth() + data.mois,
          ),
        )
          .toISOString()
          .split("T")[0],
      });

      toast.success("Demande de bail envoyée avec succès");
      reset();
      bailModal.onClose();
      router.refresh();
    } catch (error: any) {
      const message =
        error?.response?.data?.error ||
        "Erreur lors de l'envoi de la demande de bail";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const bodyContent = (
    <div className="flex flex-col gap-6">
      <Heading
        title="Demander un Bail"
        subtitle="Renseignez la durée et la date de début du bail"
      />
      <div className="flex flex-col gap-4">
        <Input
          id="dateDebut"
          label="Date de début du bail"
          type="date"
          min={new Date().toISOString().split("T")[0]}
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <Input
          id="mois"
          label="Durée du bail (en mois)"
          type="number"
          min={6}
          max={120}
          disabled={isLoading}
          register={register}
          errors={errors}
          required
          onChange={(e) => setValue("mois", parseInt(e.target.value, 10))}
        />
        {mois < 6 && (
          <p className="text-sm text-red-500">
            La durée doit être d'au moins 6 mois.
          </p>
        )}
        <div className="text-sm text-neutral-600 bg-neutral-50 p-3 rounded-lg">
          <p className="mb-1">
            <span className="font-semibold">Durée:</span> {mois} mois
          </p>
          {dateDebut && (
            <>
              <p>
                <span className="font-semibold">Début:</span>{" "}
                {new Date(dateDebut).toLocaleDateString("fr-FR")}
              </p>
              <p>
                <span className="font-semibold">Fin estimée:</span>{" "}
                {new Date(
                  new Date(dateDebut).setMonth(
                    new Date(dateDebut).getMonth() + mois,
                  ),
                ).toLocaleDateString("fr-FR")}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={bailModal.isOpen}
      onClose={bailModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      actionLabel="Envoyer la demande"
      disabled={isLoading || mois < 6 || !dateDebut}
      title="Miabe - Immo"
      body={bodyContent}
    />
  );
};

export default BailModal;
