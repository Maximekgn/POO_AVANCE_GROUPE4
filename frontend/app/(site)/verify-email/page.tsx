"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  resendVerificationEmail,
  verifyEmail,
  verifyEmailWithOtp,
} from "@/app/(site)/actions/authActions";
import Heading from "@/components/Heading";
import Button from "@/components/Button";
import useLoginModal from "@/app/(site)/hooks/useLoginModal";
import Loader from "@/components/Loader";
import Container from "@/components/Container";

const VerifyEmailPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loginModal = useLoginModal();
  const token = searchParams?.get("token") ?? null;
  const emailFromQuery = (searchParams?.get("email") ?? "").trim();

  const [status, setStatus] = useState<"loading" | "otp" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      if (emailFromQuery) {
        setOtpEmail(emailFromQuery);
      }
      setStatus("otp");
      setMessage("Entrez le code OTP reçu par email pour activer votre compte.");
      return;
    }

    const verify = async () => {
      const result = await verifyEmail(token);
      if (result.success) {
        setStatus("success");
        setMessage(result.message || "Votre compte a été activé avec succès !");
      } else {
        setStatus("error");
        setMessage(
          result.error || "Une erreur est survenue lors de la validation.",
        );
      }
    };

    verify();
  }, [token, emailFromQuery]);

  const handleLogin = () => {
    router.push("/");
    setTimeout(() => {
      loginModal.onOpen();
    }, 500);
  };

  const handleResend = async () => {
    const email = otpEmail.trim();
    if (!email) {
      setResendMessage("Saisissez votre email pour renvoyer le code OTP.");
      return;
    }

    setResendLoading(true);
    const result = await resendVerificationEmail(email);
    setResendLoading(false);

    if (result.success) {
      setResendMessage(
        result.message ||
        "Si un compte existe, un nouveau code OTP de vérification a été envoyé.",
      );
      return;
    }

    setResendMessage(result.error || "Impossible de renvoyer le lien.");
  };

  const handleOtpVerify = async () => {
    const email = otpEmail.trim();
    const code = otpCode.trim();

    if (!email || !code) {
      setMessage("Veuillez renseigner votre email et votre code OTP.");
      return;
    }

    setOtpLoading(true);
    const result = await verifyEmailWithOtp(email, code);
    setOtpLoading(false);

    if (result.success) {
      setStatus("success");
      setMessage(result.message || "Votre compte a été activé avec succès !");
      return;
    }

    setStatus("error");
    setMessage(result.error || "Code OTP invalide ou expiré.");
  };

  return (
    <Container>
      <div className="max-w-screen-md mx-auto pt-24 flex flex-col items-center justify-center gap-8 text-center">
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center gap-4">
            <Heading
              title="Vérification en cours..."
              subtitle="Veuillez patienter pendant que nous activons votre compte."
              center
            />
            <Loader />
          </div>
        )}

        {status === "success" && (
          <>
            <div className="bg-green-100 p-6 rounded-full">
              <svg
                className="w-16 h-16 text-blue-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <Heading title="Compte Activé !" subtitle={message} center />
            <div className="w-48">
              <Button label="Se connecter" onClick={handleLogin} />
            </div>
          </>
        )}

        {(status === "otp" || status === "error") && (
          <>
            {status === "error" ? (
              <div className="bg-red-100 p-6 rounded-full">
                <svg
                  className="w-16 h-16 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  ></path>
                </svg>
              </div>
            ) : (
              <div className="bg-blue-100 p-6 rounded-full">
                <svg
                  className="w-16 h-16 text-blue-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4m0 4h.01M22 12A10 10 0 1112 2a10 10 0 0110 10z"
                  ></path>
                </svg>
              </div>
            )}
            <Heading
              title={status === "error" ? "Erreur de validation" : "Vérification OTP"}
              subtitle={message}
              center
            />
            <div className="w-full max-w-md space-y-3">
              <input
                type="email"
                value={otpEmail}
                onChange={(event) => setOtpEmail(event.target.value)}
                placeholder="Votre email"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3"
              />
              <input
                type="text"
                value={otpCode}
                onChange={(event) => setOtpCode(event.target.value)}
                placeholder="Code OTP"
                maxLength={6}
                inputMode="numeric"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 tracking-[0.35em] text-center uppercase"
              />
              <Button
                label={otpLoading ? "Vérification..." : "Vérifier le code OTP"}
                onClick={handleOtpVerify}
                disabled={otpLoading}
              />
              <Button
                label={resendLoading ? "Envoi..." : "Renvoyer le code OTP"}
                onClick={handleResend}
                disabled={resendLoading}
              />
              {resendMessage ? (
                <p className="text-sm text-neutral-600">{resendMessage}</p>
              ) : null}
            </div>
            <div className="w-48">
              <Button
                outline
                label="Retour à l'accueil"
                onClick={() => router.push("/")}
              />
            </div>
          </>
        )}
      </div>
    </Container>
  );
};

export default VerifyEmailPage;
