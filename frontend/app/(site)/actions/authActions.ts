"use server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function registerUser(data: any) {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nom: data.nom,
        prenom: data.prenom,
        email: data.email,
        motDePasse: data.password,
        telephone: data.telephone,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      // Si le backend renvoie un objet d'erreurs (ex: Django Rest Framework)
      let errorMessage = "Une erreur est survenue lors de l'inscription.";

      if (result.message && typeof result.message === "string") {
        errorMessage = result.message;
      } else if (result.errors && typeof result.errors === "object") {
        // Extraire le premier message d'erreur trouvé dans l'objet
        const firstErrorKey = Object.keys(result.errors)[0];
        const firstErrorValue = result.errors[firstErrorKey];
        errorMessage = Array.isArray(firstErrorValue)
          ? firstErrorValue[0]
          : JSON.stringify(firstErrorValue);
        errorMessage = `${firstErrorKey}: ${errorMessage}`;
      } else if (result.detail) {
        errorMessage = result.detail;
      }

      return { error: errorMessage };
    }

    return {
      success: true,
      message: result.message,
      nextStep: result.next_step,
      emailVerified: result.email_verified,
      documentsCompleted: result.documents_completed,
    };
  } catch (error) {
    console.error("Registration error:", error);
    return { error: "Impossible de contacter le serveur." };
  }
}

export async function verifyEmail(token: string) {
  try {
    const response = await fetch(`${API_URL}/auth/verify-email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        error:
          result.error ||
          result.message ||
          result.detail ||
          "Le lien de vérification est invalide ou a expiré.",
      };
    }

    return { success: true, message: result.message };
  } catch (error) {
    console.error("Email verification error:", error);
    return { error: "Erreur lors de la vérification de l'email." };
  }
}

export async function resendVerificationEmail(email: string) {
  try {
    const response = await fetch(`${API_URL}/auth/resend-verification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        error:
          result.error ||
          result.message ||
          result.detail ||
          "Impossible de renvoyer l'email de vérification.",
      };
    }

    return {
      success: true,
      message:
        result.message ||
        "Si un compte existe, un nouvel email de vérification a été envoyé.",
    };
  } catch (error) {
    console.error("Resend verification error:", error);
    return { error: "Erreur lors du renvoi de l'email de vérification." };
  }
}

export async function uploadUserDocuments(
  token: string,
  payload: {
    numeroPiece: string;
    profession?: string;
    revenusMensuels?: string;
    pieceIdentite: File;
  },
) {
  try {
    const formData = new FormData();
    formData.append("numero_piece", payload.numeroPiece);
    if (payload.profession) {
      formData.append("profession", payload.profession);
    }
    if (payload.revenusMensuels) {
      formData.append("revenus_mensuels", payload.revenusMensuels);
    }
    formData.append("piece_identite", payload.pieceIdentite);

    const response = await fetch(`${API_URL}/auth/upload-documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        error:
          result.error ||
          result.message ||
          result.detail ||
          "Impossible d'enregistrer les documents.",
      };
    }

    return {
      success: true,
      message: result.message || "Documents enregistrés.",
    };
  } catch (error) {
    console.error("Upload documents error:", error);
    return { error: "Erreur lors de l'upload des documents." };
  }
}
