"use client";

import { useEffect, useState } from "react";

import { BsChatDotsFill } from "react-icons/bs";

import ChatWindow from "./ChatWindow";

type CurrentUserLite = {
  id: string | number;
  isAdmin: boolean;
  accessToken?: string;
};

type ChatWidgetProps = {
  currentUser: CurrentUserLite | null;
};

export default function ChatWidget({ currentUser }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<
    string | undefined
  >(undefined);

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<{ conversationId?: string }>;
      const conversationId = customEvent?.detail?.conversationId;
      if (typeof conversationId === "string" && conversationId.length > 0) {
        setInitialConversationId(conversationId);
      }
      setOpen(true);
    };

    window.addEventListener("chat:open", handler as EventListener);
    return () => {
      window.removeEventListener("chat:open", handler as EventListener);
    };
  }, []);

  if (!currentUser?.accessToken || currentUser.isAdmin) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="fixed bottom-5 right-5 z-40 inline-flex h-14 w-14 items-center justify-center rounded-full bg-neutral-900 text-white shadow-lg transition hover:scale-105 hover:bg-neutral-700"
        aria-label="Ouvrir la messagerie"
      >
        <BsChatDotsFill size={22} />
      </button>

      {open ? (
        <div className="fixed bottom-24 right-5 z-40 h-[560px] w-[min(94vw,390px)]">
          <ChatWindow
            currentUser={{ id: currentUser.id, isAdmin: currentUser.isAdmin }}
            accessToken={currentUser.accessToken}
            showConversationList
            conversationLayout="stacked"
            autoSelectFirstConversation={false}
            initialConversationId={initialConversationId}
          />
        </div>
      ) : null}
    </>
  );
}
