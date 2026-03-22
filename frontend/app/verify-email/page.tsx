"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  resendVerificationEmail,
  verifyEmail,
} from "@/app/actions/authActions";
import Heading from "@/app/components/Heading";
import Button from "@/app/components/Button";
import useLoginModal from "@/app/hooks/useLoginModal";
import Loader from "@/app/components/Loader";
import Container from "@/app/components/Container";

const VerifyEmailPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loginModal = useLoginModal();
  const token = searchParams?.get("token") ?? null;

  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [resendEmail, setResendEmail] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Le jeton de vérification est manquant.");
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
  }, [token]);

  const handleLogin = () => {
    router.push("/");
    setTimeout(() => {
      loginModal.onOpen();
    }, 500);
  };

  const handleResend = async () => {
    const email = resendEmail.trim();
    if (!email) {
      setResendMessage("Saisissez votre email pour renvoyer le lien.");
      return;
    }

    setResendLoading(true);
    const result = await resendVerificationEmail(email);
    setResendLoading(false);

    if (result.success) {
      setResendMessage(
        result.message ||
          "Si un compte existe, un nouveau lien de vérification a été envoyé.",
      );
      return;
    }

    setResendMessage(result.error || "Impossible de renvoyer le lien.");
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
                className="w-16 h-16 text-green-500"
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

        {status === "error" && (
          <>
            <div className="bg-red-100 p-6 rounded-full">
              <svg
                className="w-16 h-16 text-red-500"
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
            <Heading title="Erreur de validation" subtitle={message} center />
            <div className="w-full max-w-md space-y-3">
              <input
                type="email"
                value={resendEmail}
                onChange={(event) => setResendEmail(event.target.value)}
                placeholder="Votre email"
                className="w-full rounded-lg border border-neutral-300 px-4 py-3"
              />
              <Button
                label={resendLoading ? "Envoi..." : "Renvoyer le lien"}
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
