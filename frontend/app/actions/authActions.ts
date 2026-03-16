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
        role: data.role,
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
        errorMessage = Array.isArray(firstErrorValue) ? firstErrorValue[0] : JSON.stringify(firstErrorValue);
        errorMessage = `${firstErrorKey}: ${errorMessage}`;
      } else if (result.detail) {
        errorMessage = result.detail;
      }

      return { error: errorMessage };
    }

    return { success: true, message: result.message };
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
        error: result.error || result.message || result.detail || "Le lien de vérification est invalide ou a expiré.",
      };
    }

    return { success: true, message: result.message };
  } catch (error) {
    console.error("Email verification error:", error);
    return { error: "Erreur lors de la vérification de l'email." };
  }
}

