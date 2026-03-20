import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password, name, nom, prenom, telephone } = body;

  const response = await fetch(`${API_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      nom: nom || name || "Utilisateur",
      prenom: prenom || "",
      email,
      motDePasse: password,
      telephone: telephone || "",
    }),
  });

  const payload = await response.json();
  return NextResponse.json(payload, { status: response.status });
}
