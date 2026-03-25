export type ChatUser = {
  id: number;
  full_name: string;
  email: string;
  is_admin: boolean;
  is_online: boolean;
  conversation_id: string;
};

export type ChatMessage = {
  id: number;
  conversation_id: string;
  contenu: string;
  objet: string | null;
  lu: boolean;
  date_envoi: string;
  expediteur_id: number;
  expediteur_nom: string;
  destinataire_id: number;
  destinataire_nom: string;
};

export type ChatConversation = {
  conversation_id: string;
  other_user: {
    id: number;
    full_name: string;
    email: string;
    is_admin: boolean;
    is_online: boolean;
  };
  last_message: ChatMessage;
  unread_count: number;
};
