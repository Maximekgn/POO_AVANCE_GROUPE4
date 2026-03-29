"use client";

import { useCallback, useState } from "react";
import { FieldValues, SubmitHandler, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

import useLoginModal from "@/app/(site)/hooks/useLoginModal";
import Modal from "./Modal";
import Heading from "../Heading";
import Input from "../Inputs/Input";
import OtpInput from "../Inputs/OtpInput";
import Button from "../Button";
import toast from "react-hot-toast";
import useRegisterModal from "@/app/(site)/hooks/useRegisterModal";
import { resendVerificationEmail } from "@/app/(site)/actions/authActions";
import { useAuth } from "@/contexts/AuthContext";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const LoginModal = () => {
  const router = useRouter();
  const loginModal = useLoginModal();
  const registerModal = useRegisterModal();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [lastEmail, setLastEmail] = useState("");

  // 2FA states
  const [requires2FA, setRequires2FA] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [loginData, setLoginData] = useState<{
    email: string;
    password: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
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

    try {
      const loginUrl = `${API_URL}/auth/login`;

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Vérifier si 2FA est requis
        if (result.requires_2fa || result.otp_required) {
          setRequires2FA(true);
          setTempToken(result.temp_token || result.access);
          setLoginData({ email: data.email, password: data.password });
          toast("Veuillez saisir le code OTP envoyé à votre adresse email.");
        } else {
          // Pas de 2FA, connexion directe
          completeLogin(result);
        }
      } else {
        if (result?.detail?.toLowerCase()?.includes("email non verifie")) {
          setNeedsVerification(true);
        }
        toast.error(
          result?.detail ||
            result?.non_field_errors?.[0] ||
            "Erreur de connexion",
        );
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Erreur de connexion au serveur");
    } finally {
      setIsLoading(false);
    }
  };

  // Vérification OTP
  const onVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      toast.error("Veuillez saisir un code OTP valide (6 chiffres).");
      return;
    }

    setIsLoading(true);

    try {
      const verifyUrl = `${API_URL}/auth/verify-otp`;
      const response = await fetch(verifyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temp_token: tempToken,
          otp: otpValue,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        completeLogin(result);
      } else {
        toast.error(result?.detail || "Code OTP invalide ou expiré.");
        setOtpValue("");
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("Erreur lors de la vérification du code OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // Finaliser la connexion
  const completeLogin = async (result: any) => {
    localStorage.setItem("accessToken", result.access);
    localStorage.setItem("refreshToken", result.refresh);

    // Also store in cookies for server-side access
    document.cookie = `accessToken=${result.access}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
    document.cookie = `refreshToken=${result.refresh}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

    toast.success("Connexion réussie");
    loginModal.onClose();

    await refreshUser();

    if (result.is_admin) {
      router.push("/admin/dashboard");
    } else {
      router.refresh();
    }
  };

  // Réinitialiser le formulaire pour revenir à l'étape 1
  const handleBackToLogin = () => {
    setRequires2FA(false);
    setOtpValue("");
    setTempToken("");
    setLoginData(null);
    reset();
  };

  // Renvoyer le code OTP
  const handleResendOtp = async () => {
    setIsResending(true);
    try {
      const resendUrl = `${API_URL}/auth/resend-otp`;
      await fetch(resendUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          temp_token: tempToken,
        }),
      });
      toast.success("Nouveau code OTP envoyé à votre adresse email.");
      setOtpValue("");
    } catch (error) {
      toast.error("Impossible de renvoyer le code OTP.");
    } finally {
      setIsResending(false);
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

  // Contenu pour l'étape 2FA
  const otpBodyContent = (
    <div className="flex flex-col gap-4">
      <Heading
        title="Double authentification"
        subtitle="Un code OTP a été envoyé à votre adresse email."
      />

      <div className="py-4">
        <OtpInput
          length={6}
          value={otpValue}
          onChange={setOtpValue}
          disabled={isLoading}
        />
      </div>

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={handleResendOtp}
          disabled={isResending}
          className="text-sm text-blue-500 hover:text-blue-600 disabled:opacity-50"
        >
          {isResending ? "Envoi en cours..." : "Renvoyer le code"}
        </button>
        <span className="text-neutral-300">|</span>
        <button
          type="button"
          onClick={handleBackToLogin}
          disabled={isLoading}
          className="text-sm text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
        >
          Changer de compte
        </button>
      </div>
    </div>
  );

  // Contenu pour l'étape 1 (Email + Password)
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
      title={requires2FA ? "Code de vérification" : "Connexion"}
      actionLabel={requires2FA ? "Vérifier" : "Continuer"}
      onClose={loginModal.onClose}
      onSubmit={requires2FA ? onVerifyOtp : handleSubmit(onSubmit)}
      body={requires2FA ? otpBodyContent : bodyContent}
      footer={requires2FA ? undefined : footerContent}
    />
  );
};

export default LoginModal;
