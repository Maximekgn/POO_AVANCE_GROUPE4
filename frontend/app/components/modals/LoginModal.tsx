"use client";

import { getSession, signIn } from "next-auth/react";
import { useCallback, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import useLoginModal from "../../hooks/useLoginModal";
import Modal from "./Modal";
import Heading from "../Heading";
import Input from "../Inputs/Input";
import toast from "react-hot-toast";
import useRegisterModal from "@/app/hooks/useRegisterModal";
import { resendVerificationEmail } from "@/app/actions/authActions";

const LoginModal = () => {
  const router = useRouter();
  const loginModal = useLoginModal();
  const registerModal = useRegisterModal();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [lastEmail, setLastEmail] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FieldValues>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit: SubmitHandler<FieldValues> = async (data) => {
    setIsLoading(true);
    setNeedsVerification(false);
    setLastEmail((data.email || "").toString());

    const response = await signIn("credentials", {
      ...data,
      redirect: false,
    });

    setIsLoading(false);

    if (response?.ok) {
      toast.success("Connexion réussie");
      const session = await getSession();
      loginModal.onClose();

      if ((session as any)?.isAdmin) {
        router.push("/admin/dashboard");
      } else {
        router.refresh();
      }
    }

    if (response?.error) {
      if (response.error.toLowerCase().includes("email non verifie")) {
        setNeedsVerification(true);
      }
      toast.error(response.error);
    }
  };

  const handleResend = async () => {
    const email = (watch("email") || lastEmail || "").toString().trim();
    if (!email) {
      toast.error("Saisissez votre email pour renvoyer le lien.");
      return;
    }

    setIsResending(true);
    const result = await resendVerificationEmail(email);
    setIsResending(false);

    if (result.success) {
      toast.success(result.message || "Email de vérification renvoyé.");
      return;
    }

    toast.error(result.error || "Impossible de renvoyer l'email.");
  };

  const toggle = useCallback(() => {
    loginModal.onClose();
    registerModal.onOpen();
  }, [loginModal, registerModal]);

  const bodyContent = (
    <div className="flex flex-col gap-4">
      <Heading title="Bon retour !" subtitle="Connectez-vous à votre compte" />
      <Input
        id="email"
        label="Adresse Email"
        disabled={isLoading}
        register={register}
        errors={errors}
        required
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
      {needsVerification && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Votre compte n'est pas encore vérifié. Ouvrez le lien reçu par email
          ou renvoyez un nouveau lien.
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="ml-2 font-semibold underline disabled:opacity-60"
          >
            {isResending ? "Envoi..." : "Renvoyer le lien"}
          </button>
        </div>
      )}
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
          <div>C'est votre première fois ?</div>
          <div
            onClick={toggle}
            className="
            text-neutral-800
            cursor-pointer
            hover:underline
            "
          >
            Créer un compte
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Modal
      disabled={isLoading}
      isOpen={loginModal.isOpen}
      title="Connexion"
      actionLabel="Continuer"
      onClose={loginModal.onClose}
      onSubmit={handleSubmit(onSubmit)}
      body={bodyContent}
      footer={footerContent}
    />
  );
};

export default LoginModal;
