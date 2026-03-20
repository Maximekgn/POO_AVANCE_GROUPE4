"use client";

import { useCallback, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import useRegisterModal from "../../hooks/useRegisterModal";
import Modal from "./Modal";
import Heading from "../Heading";
import Input from "../Inputs/Input";
import toast from "react-hot-toast";
import useLoginModal from "@/app/hooks/useLoginModal";
import { registerUser } from "@/app/actions/authActions";

const RegisterModal = () => {
  const registerModal = useRegisterModal();
  const loginModal = useLoginModal();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      nom: "",
      prenom: "",
      email: "",
      password: "",
      telephone: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);

    const result = await registerUser(data);

    setIsLoading(false);

    if (result.success) {
      toast.success(
        result.message || "Compte créé ! Veuillez vérifier vos emails.",
      );
      toast(
        "Prochaine étape: connectez-vous puis déposez vos documents de profil.",
      );
      registerModal.onClose();
      loginModal.onOpen();
      // On n'ouvre pas forcément le login direct si le compte n'est pas activé
      // Mais le diagramme dit "Redirige vers la page de Connexion" après activation.
    } else {
      toast.error(result.error || "Une erreur est survenue.");
    }
  };

  const toggle = useCallback(() => {
    registerModal.onClose();
    loginModal.onOpen();
  }, [loginModal, registerModal]);

  const bodyContent = (
    <div className="flex flex-col gap-4">
      <Heading
        title="Bienvenue chez Immobilier"
        subtitle="Créez votre compte en quelques secondes"
      />
      <div className="flex flex-row gap-4">
        <Input
          id="prenom"
          label="Prénom"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
        <Input
          id="nom"
          label="Nom"
          disabled={isLoading}
          register={register}
          errors={errors}
          required
        />
      </div>
      <Input
        id="email"
        label="Adresse Email"
        type="email"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
      <Input
        id="telephone"
        label="Téléphone"
        disabled={isLoading}
        register={register}
        errors={errors}
      />
      <Input
        id="password"
        label="Mot de passe"
        type="password"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
      />
    </div>
  );

  const footerContent = (
    <div className="flex flex-col gap-4 mt-3">
      <hr />
      <div
        className="
        text-neutral-500
        text-center
        mt-4
        font-light
        "
      >
        <div className="flex flex-row items-center justify-center gap-2">
          <div>Vous avez déjà un compte ?</div>
          <div
            onClick={toggle}
            className="
            text-neutral-800
            cursor-pointer
            hover:underline
            "
          >
            Se connecter
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      disabled={isLoading}
      isOpen={registerModal.isOpen}
      title="Inscription"
      actionLabel="Continuer"
      onClose={registerModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
};

export default RegisterModal;
