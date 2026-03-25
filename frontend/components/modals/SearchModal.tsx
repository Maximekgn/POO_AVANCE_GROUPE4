"use client";

import qs from "query-string";
import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import useSearchModal from "@/app/(site)/hooks/useSearchModal";

import Modal from "./Modal";
import Heading from "../Heading";

const SearchModal = () => {
  const router = useRouter();
  const searchModal = useSearchModal();
  const params = useSearchParams();

  const [searchText, setSearchText] = useState(params?.get("search") || "");

  const onSubmit = useCallback(async () => {
    let currentQuery = {};

    if (params) {
      currentQuery = qs.parse(params.toString());
    }

    const updatedQuery: any = {
      ...currentQuery,
    };

    const normalizedSearch = searchText.trim();
    if (normalizedSearch) {
      updatedQuery.search = normalizedSearch;
    } else {
      delete updatedQuery.search;
    }

    const url = qs.stringifyUrl(
      {
        url: "/",
        query: updatedQuery,
      },
      { skipNull: true },
    );

    searchModal.onClose();
    router.push(url);
  }, [searchModal, router, searchText, params]);

  const bodyContent = (
    <div className="flex flex-col gap-8">
      <Heading
        title="Que recherchez-vous ?"
        subtitle="Recherche automatique par nom, ville ou description"
      />
      <input
        value={searchText}
        onChange={(event) => setSearchText(event.target.value)}
        placeholder="Ex: studio, Abidjan, vue lagune..."
        className="w-full rounded-md border-2 border-neutral-300 p-4 outline-none transition focus:border-neutral-400"
      />
    </div>
  );

  return (
    <Modal
      isOpen={searchModal.isOpen}
      title="Filtres"
      actionLabel="Rechercher"
      onSubmit={onSubmit}
      onClose={searchModal.onClose}
      body={bodyContent}
    />
  );
};

export default SearchModal;
