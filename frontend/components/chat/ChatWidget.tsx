"use client";

import { useEffect, useState } from "react";
import { BsChatDotsFill } from "react-icons/bs";
import ChatWindow from "./ChatWindow";
import { useAuth } from "@/contexts/AuthContext";

export default function ChatWidget() {
  const { currentUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [initialConversationId, setInitialConversationId] = useState<
    string | undefined
  >(undefined);
  const [unreadCount, setUnreadCount] = useState(0);

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

  // Fetch unread messages count
  useEffect(() => {
    if (!currentUser?.accessToken || open) return;

    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"}/chat/conversations`,
          {
            headers: {
              Authorization: `Bearer ${currentUser.accessToken}`,
            },
            cache: "no-store",
          },
        );
        if (response.ok) {
          const data = await response.json();
          const total = (data as any[]).reduce(
            (sum, conv) => sum + (conv.unread_count || 0),
            0,
          );
          setUnreadCount(total);
        }
      } catch (error) {
        console.error("Error fetching unread count:", error);
      }
    };

    fetchUnreadCount();

    // Poll every 10 seconds when chat is closed
    const interval = setInterval(fetchUnreadCount, 10000);
    return () => clearInterval(interval);
  }, [currentUser?.accessToken, open]);

  const handleClose = () => {
    setOpen(false);
    // Reset unread count when opening the chat
    setUnreadCount(0);
  };

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
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow-md">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
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
            onClose={handleClose}
          />
        </div>
      ) : null}
    </>
  );
}
