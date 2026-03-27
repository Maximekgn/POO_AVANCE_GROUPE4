"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { FiChevronLeft, FiSend } from "react-icons/fi";
import RentAction from "./RentAction";
import { ChatConversation, ChatMessage, ChatUser } from "./types";

type CurrentUserLite = {
  id: string | number;
  isAdmin: boolean;
};

type ChatWindowProps = {
  currentUser: CurrentUserLite;
  accessToken: string;
  showConversationList?: boolean;
  restrictToAdmins?: boolean;
  conversationLayout?: "split" | "stacked";
  autoSelectFirstConversation?: boolean;
  initialConversationId?: string;
  className?: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

const buildWsUrl = (token: string) => {
  const wsBase = API_URL.replace(/^http/i, "ws").replace(/\/api\/?$/, "");
  return `${wsBase}/ws/chat/?token=${encodeURIComponent(token)}`;
};

const toNumber = (value: string | number) => {
  const n = Number(value);
  return isNaN(n) ? null : n;
};

const sortConversations = (items: ChatConversation[]) =>
  [...items].sort((a, b) => {
    const aDate = new Date(a.last_message?.date_envoi || 0).getTime();
    const bDate = new Date(b.last_message?.date_envoi || 0).getTime();
    return bDate - aDate;
  });

const formatTime = (dateIso?: string) => {
  if (!dateIso) return "";
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export default function ChatWindow({
  currentUser,
  accessToken,
  showConversationList = true,
  restrictToAdmins = false,
  conversationLayout = "split",
  autoSelectFirstConversation = true,
  initialConversationId,
  className = "",
}: ChatWindowProps) {
  const currentUserId = useMemo(
    () => toNumber(currentUser.id),
    [currentUser.id],
  );
  const [contacts, setContacts] = useState<ChatUser[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(initialConversationId || null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [typingUsers, setTypingUsers] = useState<number[]>([]);
  const [input, setInput] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [stackedView, setStackedView] = useState<"list" | "chat">(
    initialConversationId
      ? "chat"
      : conversationLayout === "stacked"
        ? "list"
        : "chat",
  );

  const socketRef = useRef<WebSocket | null>(null);
  const typingTimeoutRef = useRef<number | null>(null);
  const contactsRef = useRef<ChatUser[]>([]);
  const activeConversationRef = useRef<string | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const heartbeatTimeoutRef = useRef<number | null>(null);
  const maxReconnectAttempts = 10;
  const baseReconnectDelay = 1000; // 1 second

  const activeConversation = useMemo(
    () =>
      conversations.find(
        (item) => item.conversation_id === activeConversationId,
      ) || null,
    [conversations, activeConversationId],
  );

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    activeConversationRef.current = activeConversationId;
  }, [activeConversationId]);

  const clearReconnectTimeout = () => {
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  };

  const clearHeartbeat = () => {
    if (heartbeatTimeoutRef.current) {
      window.clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  };

  const setupHeartbeat = () => {
    clearHeartbeat();
    heartbeatTimeoutRef.current = window.setTimeout(() => {
      if (
        socketRef.current &&
        socketRef.current.readyState === WebSocket.OPEN
      ) {
        socketRef.current.send(JSON.stringify({ type: "heartbeat" }));
        setupHeartbeat();
      }
    }, 30000); // Send heartbeat every 30 seconds
  };

  const connectWebSocket = () => {
    clearReconnectTimeout();

    if (
      socketRef.current &&
      socketRef.current.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    const socket = new WebSocket(buildWsUrl(accessToken));
    socketRef.current = socket;

    socket.onopen = () => {
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      setupHeartbeat();
      if (activeConversationRef.current) {
        sendSocketEventInternal(socket, {
          action: "join_conversation",
          conversation_id: activeConversationRef.current,
        });
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      clearHeartbeat();

      // Attempt to reconnect
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay =
          baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current);
        reconnectAttemptsRef.current += 1;
        reconnectTimeoutRef.current = window.setTimeout(
          connectWebSocket,
          delay,
        );
      }
    };

    socket.onerror = () => {
      setIsConnected(false);
      clearHeartbeat();
    };

    socket.onmessage = (event) => {
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(event.data || "{}");
      } catch {
        return;
      }
      const eventType = payload.type as string;

      // Ignore heartbeat responses
      if (eventType === "heartbeat") {
        return;
      }

      if (eventType === "chat.message") {
        const newMessage = payload.message as ChatMessage;

        setConversations((prev) => {
          const existing = prev.find(
            (item) => item.conversation_id === newMessage.conversation_id,
          );

          if (!existing) {
            let otherUser = contactsRef.current.find(
              (item) =>
                item.id ===
                (newMessage.expediteur_id === currentUserId
                  ? newMessage.destinataire_id
                  : newMessage.expediteur_id),
            );
            if (!otherUser) {
              const targetId =
                newMessage.expediteur_id === currentUserId
                  ? newMessage.destinataire_id
                  : newMessage.expediteur_id;
              otherUser = {
                id: targetId,
                full_name: `Utilisateur #${targetId}`,
                email: "Inconnu",
                is_admin: false,
                is_online: false,
                conversation_id: newMessage.conversation_id,
              };
            }

            const created: ChatConversation = {
              conversation_id: newMessage.conversation_id,
              other_user: {
                id: otherUser.id,
                full_name: otherUser.full_name,
                email: otherUser.email,
                is_admin: otherUser.is_admin,
                is_online: otherUser.is_online,
              },
              last_message: newMessage,
              unread_count:
                newMessage.destinataire_id === currentUserId &&
                activeConversationRef.current !== newMessage.conversation_id
                  ? 1
                  : 0,
            };

            return sortConversations([created, ...prev]);
          }

          const unreadIncrement =
            newMessage.destinataire_id === currentUserId &&
            activeConversationRef.current !== newMessage.conversation_id
              ? 1
              : 0;

          return sortConversations(
            prev.map((item) =>
              item.conversation_id === newMessage.conversation_id
                ? {
                    ...item,
                    last_message: newMessage,
                    unread_count: item.unread_count + unreadIncrement,
                  }
                : item,
            ),
          );
        });

        if (newMessage.conversation_id === activeConversationRef.current) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      }

      if (eventType === "chat.conversation_update") {
        const newMessage = payload.message as ChatMessage;
        const convId = payload.conversation_id as string;

        setConversations((prev) => {
          const existing = prev.find((item) => item.conversation_id === convId);

          if (!existing) {
            let otherUser = contactsRef.current.find(
              (item) =>
                item.id ===
                (newMessage.expediteur_id === currentUserId
                  ? newMessage.destinataire_id
                  : newMessage.expediteur_id),
            );
            if (!otherUser) {
              const targetId =
                newMessage.expediteur_id === currentUserId
                  ? newMessage.destinataire_id
                  : newMessage.expediteur_id;
              otherUser = {
                id: targetId,
                full_name: `Utilisateur #${targetId}`,
                email: "Inconnu",
                is_admin: false,
                is_online: false,
                conversation_id: newMessage.conversation_id,
              };
            }

            const created: ChatConversation = {
              conversation_id: convId,
              other_user: {
                id: otherUser.id,
                full_name: otherUser.full_name,
                email: otherUser.email,
                is_admin: otherUser.is_admin,
                is_online: otherUser.is_online,
              },
              last_message: newMessage,
              unread_count:
                newMessage.destinataire_id === currentUserId &&
                activeConversationRef.current !== convId
                  ? 1
                  : 0,
            };
            return sortConversations([created, ...prev]);
          }

          const unreadIncrement =
            newMessage.destinataire_id === currentUserId &&
            activeConversationRef.current !== convId
              ? 1
              : 0;

          return sortConversations(
            prev.map((item) =>
              item.conversation_id === convId
                ? {
                    ...item,
                    last_message: newMessage,
                    unread_count: item.unread_count + unreadIncrement,
                  }
                : item,
            ),
          );
        });

        if (convId === activeConversationRef.current) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) return prev;
            return [...prev, newMessage];
          });
        }
      }

      if (eventType === "chat.typing") {
        const senderId = Number(payload.user_id);
        const isTyping = Boolean(payload.is_typing);
        const conversationId = String(payload.conversation_id || "");

        if (
          conversationId !== activeConversationRef.current ||
          Number.isNaN(senderId)
        ) {
          return;
        }

        setTypingUsers((prev) => {
          if (isTyping) {
            return prev.includes(senderId) ? prev : [...prev, senderId];
          }
          return prev.filter((item) => item !== senderId);
        });
      }

      if (eventType === "presence.status") {
        const userId = Number(payload.user_id);
        const isOnline = Boolean(payload.is_online);

        setContacts((prev) =>
          prev.map((contact) =>
            contact.id === userId
              ? { ...contact, is_online: isOnline }
              : contact,
          ),
        );

        setConversations((prev) =>
          prev.map((conversation) =>
            conversation.other_user.id === userId
              ? {
                  ...conversation,
                  other_user: {
                    ...conversation.other_user,
                    is_online: isOnline,
                  },
                }
              : conversation,
          ),
        );
      }
    };
  };

  const activeContact = useMemo(() => {
    if (activeConversation) {
      return {
        id: activeConversation.other_user.id,
        full_name: activeConversation.other_user.full_name,
        email: activeConversation.other_user.email,
        is_admin: activeConversation.other_user.is_admin,
        is_online: activeConversation.other_user.is_online,
        conversation_id: activeConversation.conversation_id,
      };
    }

    if (activeConversationId) {
      const parts = activeConversationId.split("_");

      // Identification strategy:
      // 1. First, look for the ID that matches someone in our contact list.
      // 2. Since the current user is normally excluded from his own contact list,
      // this will reliably pick the "other" person.
      let targetIdStr = parts.find((p) =>
        contacts.some((c) => c.id === Number(p)),
      );

      // 3. Fallback to the simple "not me" logic if the contact list strategy failed
      if (!targetIdStr && currentUserId !== null) {
        targetIdStr = parts.find((p) => Number(p) !== currentUserId);
      }

      if (targetIdStr) {
        const targetId = Number(targetIdStr);
        const contact = contacts.find((c) => c.id === targetId);
        if (contact) {
          return {
            id: contact.id,
            full_name: contact.full_name,
            email: contact.email,
            is_admin: contact.is_admin,
            is_online: contact.is_online,
            conversation_id: activeConversationId,
          };
        } else {
          // Fallback if contact does not exist yet (start new conversation)
          return {
            id: targetId,
            full_name: `Nouvelle conversation`,
            email: "En attente du premier message...",
            is_admin: false,
            is_online: false,
            conversation_id: activeConversationId,
          };
        }
      }
    }

    return null;
  }, [activeConversation, activeConversationId, contacts, currentUserId]);

  const sendSocketEvent = (payload: Record<string, unknown>) => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      return;
    }
    socketRef.current.send(JSON.stringify(payload));
  };

  const sendSocketEventInternal = (
    socket: WebSocket,
    payload: Record<string, unknown>,
  ) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(payload));
    }
  };

  const fetchContacts = async () => {
    const response = await fetch(`${API_URL}/chat/contacts`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return [] as ChatUser[];
    }

    const data = (await response.json()) as ChatUser[];
    if (!Array.isArray(data)) {
      return [] as ChatUser[];
    }

    const filtered = restrictToAdmins
      ? data.filter((item) => item.is_admin)
      : data;

    setContacts(filtered);
    return filtered;
  };

  const fetchConversations = async () => {
    const response = await fetch(`${API_URL}/chat/conversations`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return [] as ChatConversation[];
    }

    const data = (await response.json()) as ChatConversation[];
    const filtered = Array.isArray(data)
      ? data.filter((item) =>
          restrictToAdmins ? item.other_user.is_admin : true,
        )
      : [];

    const sorted = sortConversations(filtered);
    setConversations(sorted);
    return sorted;
  };

  const fetchMessages = async (conversationId: string) => {
    const response = await fetch(
      `${API_URL}/chat/conversations/${conversationId}/messages`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return;
    }

    const data = (await response.json()) as ChatMessage[];
    setMessages(Array.isArray(data) ? data : []);
  };

  const markConversationRead = async (conversationId: string) => {
    await fetch(`${API_URL}/chat/conversations/${conversationId}/read`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }).catch(() => undefined);

    sendSocketEvent({ action: "mark_read", conversation_id: conversationId });

    setConversations((prev) =>
      prev.map((item) =>
        item.conversation_id === conversationId
          ? { ...item, unread_count: 0 }
          : item,
      ),
    );
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      const [loadedContacts, loadedConversations] = await Promise.all([
        fetchContacts(),
        fetchConversations(),
      ]);

      if (!isMounted) {
        return;
      }

      if (initialConversationId) {
        setActiveConversationId(initialConversationId);
        if (conversationLayout === "stacked") {
          setStackedView("chat");
        }
        return;
      }

      if (!autoSelectFirstConversation) {
        return;
      }

      if (loadedConversations.length > 0) {
        setActiveConversationId(loadedConversations[0].conversation_id);
        return;
      }

      if (loadedContacts.length > 0) {
        setActiveConversationId(loadedContacts[0].conversation_id);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, [
    accessToken,
    restrictToAdmins,
    autoSelectFirstConversation,
    initialConversationId,
    conversationLayout,
  ]);

  useEffect(() => {
    setStackedView(conversationLayout === "stacked" ? "list" : "chat");
  }, [conversationLayout]);

  useEffect(() => {
    connectWebSocket();

    return () => {
      clearReconnectTimeout();
      clearHeartbeat();
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [accessToken, currentUserId]);

  useEffect(() => {
    if (!activeConversationId) {
      return;
    }

    fetchMessages(activeConversationId);
    markConversationRead(activeConversationId);
    sendSocketEvent({
      action: "join_conversation",
      conversation_id: activeConversationId,
    });

    return () => {
      sendSocketEvent({
        action: "leave_conversation",
        conversation_id: activeConversationId,
      });
    };
  }, [activeConversationId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
      clearReconnectTimeout();
      clearHeartbeat();
    };
  }, []);

  const handleConversationSelect = (conversationId: string) => {
    setTypingUsers([]);
    setActiveConversationId(conversationId);
    if (conversationLayout === "stacked") {
      setStackedView("chat");
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);

    if (!activeConversationId) {
      return;
    }

    sendSocketEvent({
      action: "typing",
      conversation_id: activeConversationId,
      is_typing: true,
    });

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      sendSocketEvent({
        action: "typing",
        conversation_id: activeConversationId,
        is_typing: false,
      });
    }, 1200);
  };

  const handleSend = (event: FormEvent) => {
    event.preventDefault();

    if (!input.trim() || !activeContact || !activeConversationId) {
      return;
    }

    sendSocketEvent({
      action: "send_message",
      conversation_id: activeConversationId,
      destinataire_id: activeContact.id,
      contenu: input.trim(),
    });

    setInput("");
    sendSocketEvent({
      action: "typing",
      conversation_id: activeConversationId,
      is_typing: false,
    });
  };

  const typingLabel =
    typingUsers.length > 0 && activeConversation
      ? `${activeConversation.other_user.full_name} est en train d'ecrire...`
      : "";

  const isStacked = conversationLayout === "stacked";
  const showListPane =
    showConversationList && (!isStacked || stackedView === "list");
  const showChatPane = !isStacked || stackedView === "chat";

  return (
    <div
      className={`flex h-full w-full overflow-hidden rounded-2xl border border-neutral-200 bg-white ${className}`}
    >
      {showListPane ? (
        <aside
          className={`border-r border-neutral-200 bg-neutral-50 ${
            isStacked
              ? "flex w-full flex-col"
              : "hidden w-72 lg:flex lg:flex-col"
          }`}
        >
          <div className="border-b border-neutral-200 px-4 py-3">
            <p className="text-sm font-semibold text-neutral-700">
              Conversations
            </p>
            <p className="text-xs text-neutral-500">
              {isConnected ? "Connecte en temps reel" : "Connexion en cours..."}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {conversations.length === 0 ? (
              <p className="rounded-xl bg-white px-3 py-4 text-sm text-neutral-500">
                Aucune conversation pour le moment.
              </p>
            ) : null}
            {conversations.map((conversation) => (
              <button
                key={conversation.conversation_id}
                type="button"
                onClick={() =>
                  handleConversationSelect(conversation.conversation_id)
                }
                className={`mb-2 w-full rounded-xl px-3 py-2 text-left transition ${
                  conversation.conversation_id === activeConversationId
                    ? "bg-neutral-900 text-white"
                    : "bg-white hover:bg-neutral-100"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">
                    {conversation.other_user.full_name}
                  </p>
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      conversation.other_user.is_online
                        ? "bg-emerald-400"
                        : "bg-neutral-300"
                    }`}
                  />
                </div>
                <p className="mt-1 truncate text-xs opacity-80">
                  {conversation.last_message?.contenu ||
                    "Nouvelle conversation"}
                </p>
                <div className="mt-1 flex items-center justify-between text-[11px] opacity-75">
                  <span>
                    {formatTime(conversation.last_message?.date_envoi)}
                  </span>
                  {conversation.unread_count > 0 ? (
                    <span className="rounded-full bg-emerald-500 px-2 py-0.5 font-semibold text-white">
                      {conversation.unread_count}
                    </span>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        </aside>
      ) : null}

      {showChatPane ? (
        <section className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-neutral-200 px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                {isStacked && showConversationList ? (
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                    onClick={() => setStackedView("list")}
                    aria-label="Retour aux conversations"
                  >
                    <FiChevronLeft size={16} />
                  </button>
                ) : null}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-neutral-900">
                    {activeContact?.full_name || "Messagerie"}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {activeContact
                      ? activeContact.is_online
                        ? "En ligne"
                        : "Hors ligne"
                      : "Selectionnez une conversation"}
                  </p>
                </div>
              </div>
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  activeContact?.is_online ? "bg-emerald-400" : "bg-neutral-300"
                }`}
              />
            </div>
          </header>

          {activeContact ? (
            <RentAction
              otherUserId={activeContact.id}
              accessToken={accessToken}
              onSuccess={fetchConversations}
            />
          ) : null}

          <div className="flex-1 overflow-y-auto bg-neutral-50 px-4 py-3">
            <div className="space-y-2">
              {messages.map((message) => {
                const isMine = message.expediteur_id === currentUserId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                        isMine
                          ? "bg-neutral-900 text-white"
                          : "bg-white text-neutral-800"
                      }`}
                    >
                      <p>{message.contenu}</p>
                      <p
                        className={`mt-1 text-[11px] ${
                          isMine ? "text-neutral-300" : "text-neutral-500"
                        }`}
                      >
                        {formatTime(message.date_envoi)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            {typingLabel ? (
              <p className="mt-3 text-xs italic text-neutral-500">
                {typingLabel}
              </p>
            ) : null}
          </div>

          {activeContact ? (
            <form
              onSubmit={handleSend}
              className="border-t border-neutral-200 bg-white p-3"
            >
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(event) => handleInputChange(event.target.value)}
                  placeholder="Ecrire un message..."
                  className="h-10 flex-1 rounded-xl border border-neutral-300 px-3 text-sm outline-none transition focus:border-neutral-900"
                  disabled={!activeContact}
                />
                <button
                  type="submit"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-black"
                  disabled={!activeContact || !input.trim()}
                >
                  <FiSend size={16} />
                </button>
              </div>
            </form>
          ) : (
            <div className="border-t border-neutral-200 bg-white p-3 text-sm text-neutral-500">
              Selectionnez d'abord une conversation pour commencer le chat.
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}
