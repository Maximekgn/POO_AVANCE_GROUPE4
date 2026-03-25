"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { AdminPlatformUser } from "../lib/adminApi";

type Props = {
  users: AdminPlatformUser[];
};

type UserRoleFilter = "ALL" | "ADMIN" | "USER";
type BoolFilter = "ALL" | "YES" | "NO";
type ProfileFilter = "ALL" | "STANDARD" | "CLIENT" | "PROPRIETAIRE" | "MIXTE";
type SortKey = "recent" | "oldest" | "name_asc" | "name_desc";

const dateValue = (user: AdminPlatformUser) => {
  const value = user.date_creation || user.date_joined || null;
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const fullName = (user: AdminPlatformUser) => {
  const name = `${user.first_name || ""} ${user.last_name || ""}`.trim();
  return name || "Sans nom";
};

const profileType = (
  user: AdminPlatformUser,
): Exclude<ProfileFilter, "ALL"> => {
  const isProprietaire = user.nombre_biens > 0;
  const isClient = user.client_info !== null && user.client_info !== undefined;

  if (isClient && isProprietaire) return "MIXTE";
  if (isClient) return "CLIENT";
  if (isProprietaire) return "PROPRIETAIRE";
  return "STANDARD";
};

const hasIdentityDoc = (user: AdminPlatformUser) =>
  Boolean(
    user.client_info?.carte_identite?.id ||
    user.proprietaire_info?.carte_identite?.id,
  );

const formatDate = (value?: string | null) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export default function AdminUsersTableClient({ users }: Props) {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRoleFilter>("ALL");
  const [emailVerified, setEmailVerified] = useState<BoolFilter>("ALL");
  const [documents, setDocuments] = useState<BoolFilter>("ALL");
  const [active, setActive] = useState<BoolFilter>("ALL");
  const [identityDoc, setIdentityDoc] = useState<BoolFilter>("ALL");
  const [profile, setProfile] = useState<ProfileFilter>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("recent");

  const normalizedQuery = query.trim().toLowerCase();

  const filteredUsers = useMemo(() => {
    const base = users.filter((user) => {
      if (role !== "ALL" && user.role !== role) return false;
      if (emailVerified === "YES" && !user.email_verifie) return false;
      if (emailVerified === "NO" && user.email_verifie) return false;
      if (documents === "YES" && !user.documents_complets) return false;
      if (documents === "NO" && user.documents_complets) return false;
      if (active === "YES" && !user.is_active) return false;
      if (active === "NO" && user.is_active) return false;
      if (identityDoc === "YES" && !hasIdentityDoc(user)) return false;
      if (identityDoc === "NO" && hasIdentityDoc(user)) return false;
      if (profile !== "ALL" && profileType(user) !== profile) return false;

      if (!normalizedQuery) return true;
      const searchText = [
        fullName(user),
        user.email,
        user.username,
        user.telephone || "",
      ]
        .join(" ")
        .toLowerCase();
      return searchText.includes(normalizedQuery);
    });

    const sorted = [...base];
    sorted.sort((a, b) => {
      if (sortKey === "recent") return dateValue(b) - dateValue(a);
      if (sortKey === "oldest") return dateValue(a) - dateValue(b);
      if (sortKey === "name_asc") return fullName(a).localeCompare(fullName(b));
      return fullName(b).localeCompare(fullName(a));
    });

    return sorted;
  }, [
    users,
    role,
    emailVerified,
    documents,
    active,
    identityDoc,
    profile,
    normalizedQuery,
    sortKey,
  ]);

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">
            Registre utilisateurs
          </h2>
          <p className="text-sm text-neutral-500">
            Filtrage multi-critères et accès direct aux fiches complètes.
          </p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700">
          Resultats:{" "}
          <span className="font-semibold">{filteredUsers.length}</span> /{" "}
          {users.length}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Rechercher (nom, email, username, téléphone)"
          className="h-10 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
        />

        <select
          value={role}
          onChange={(event) => setRole(event.target.value as UserRoleFilter)}
          className="h-10 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
        >
          <option value="ALL">Tous les rôles</option>
          <option value="ADMIN">Admin</option>
          <option value="USER">Utilisateur</option>
        </select>

        <select
          value={emailVerified}
          onChange={(event) =>
            setEmailVerified(event.target.value as BoolFilter)
          }
          className="h-10 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
        >
          <option value="ALL">Email: Tous</option>
          <option value="YES">Email vérifié</option>
          <option value="NO">Email non vérifié</option>
        </select>

        <select
          value={documents}
          onChange={(event) => setDocuments(event.target.value as BoolFilter)}
          className="h-10 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
        >
          <option value="ALL">Documents: Tous</option>
          <option value="YES">Documents complets</option>
          <option value="NO">Documents incomplets</option>
        </select>

        <select
          value={active}
          onChange={(event) => setActive(event.target.value as BoolFilter)}
          className="h-10 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
        >
          <option value="ALL">Statut compte: Tous</option>
          <option value="YES">Actif</option>
          <option value="NO">Inactif</option>
        </select>

        <select
          value={identityDoc}
          onChange={(event) => setIdentityDoc(event.target.value as BoolFilter)}
          className="h-10 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
        >
          <option value="ALL">Pièce identité: Tous</option>
          <option value="YES">Document présent</option>
          <option value="NO">Sans document</option>
        </select>

        <select
          value={profile}
          onChange={(event) => setProfile(event.target.value as ProfileFilter)}
          className="h-10 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
        >
          <option value="ALL">Type profil: Tous</option>
          <option value="STANDARD">Standard</option>
          <option value="CLIENT">Client</option>
          <option value="PROPRIETAIRE">Propriétaire</option>
          <option value="MIXTE">Mixte</option>
        </select>

        <select
          value={sortKey}
          onChange={(event) => setSortKey(event.target.value as SortKey)}
          className="h-10 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
        >
          <option value="recent">Tri: Plus récent</option>
          <option value="oldest">Tri: Plus ancien</option>
          <option value="name_asc">Tri: Nom A-Z</option>
          <option value="name_desc">Tri: Nom Z-A</option>
        </select>
      </div>

      <div className="mt-5 overflow-x-auto rounded-xl border border-neutral-200">
        <table className="min-w-full divide-y divide-neutral-200 text-sm">
          <thead className="bg-neutral-50">
            <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <th className="px-4 py-3">Utilisateur</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Documents</th>
              <th className="px-4 py-3">Profil</th>
              <th className="px-4 py-3">Biens publiés</th>
              <th className="px-4 py-3">Création</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200 bg-white">
            {filteredUsers.length === 0 ? (
              <tr>
                <td
                  className="px-4 py-6 text-center text-neutral-500"
                  colSpan={8}
                >
                  Aucun utilisateur ne correspond aux filtres.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/dashboard/utilisateurs/${user.id}`}
                      className="font-medium text-neutral-900 underline-offset-2 hover:underline"
                    >
                      {fullName(user)}
                    </Link>
                    <div className="text-xs text-neutral-500">
                      @{user.username}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-neutral-300 px-2 py-1 text-xs font-medium text-neutral-700">
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-neutral-800">{user.email}</div>
                    <div className="mt-1 flex gap-2 text-xs">
                      <span
                        className={
                          user.email_verifie
                            ? "text-emerald-700"
                            : "text-amber-700"
                        }
                      >
                        {user.email_verifie ? "Vérifié" : "Non vérifié"}
                      </span>
                      <span
                        className={
                          user.is_active ? "text-sky-700" : "text-rose-700"
                        }
                      >
                        {user.is_active ? "Actif" : "Inactif"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {user.documents_complets ? "Complets" : "Incomplets"}
                    <div className="text-xs text-neutral-500">
                      {hasIdentityDoc(user) ? "Pièce présente" : "Sans pièce"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {profileType(user)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-neutral-900">
                      {user.nombre_biens}
                    </div>
                    <div className="text-xs text-neutral-500">
                      {user.nombre_biens === 0
                        ? "Aucun bien"
                        : user.nombre_biens === 1
                          ? "1 bien"
                          : `${user.nombre_biens} biens`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-700">
                    {formatDate(user.date_creation || user.date_joined)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/dashboard/utilisateurs/${user.id}`}
                      className="inline-flex rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-800 hover:bg-neutral-100"
                    >
                      Voir fiche
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
