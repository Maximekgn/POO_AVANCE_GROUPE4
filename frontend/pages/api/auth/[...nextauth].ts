import { AuthOptions } from "next-auth";
import NextAuth from "next-auth/next";
import CredentialsProvider from "next-auth/providers/credentials";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Identifiants manquants");
        }

        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.detail || "Email ou mot de passe incorrect");
          }

          // Django SimpleJWT returns { access, refresh }
          // We need to fetch user info if not included in the token, 
          // but for now let's assume we can decode it or get it from the response.
          // many setups return user info along with tokens.
          
          if (data.access) {
            // Decode role and other info from token or if backend provides it
            // For now, let's return the tokens and user info
            return {
              id: data.user_id || credentials.email,
              email: credentials.email,
              name: data.name || credentials.email,
              role: data.role || "CLIENT",
              accessToken: data.access,
              refreshToken: data.refresh,
            };
          }

          return null;
        } catch (error: any) {
          throw new Error(error.message || "Erreur de connexion au serveur");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.accessToken = (user as any).accessToken;
        token.refreshToken = (user as any).refreshToken;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        (session as any).accessToken = token.accessToken;
        (session as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  debug: process.env.NODE_ENV === "development",
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);

