"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import { FiHome, FiCheckCircle, FiLoader } from "react-icons/fi";

interface ActionableDemande {
    id: number;
    bien: {
        id: number;
        reference: string;
        titre: string;
        type_bien: string;
    };
    demandeur: {
        full_name: string;
    };
    montant_total: number;
    type_demande: string;
}

interface RentActionProps {
    otherUserId: number;
    accessToken: string;
    onSuccess?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

export default function RentAction({ otherUserId, accessToken, onSuccess }: RentActionProps) {
    const [demandes, setDemandes] = useState<ActionableDemande[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isFinalizing, setIsFinalizing] = useState<number | null>(null);

    useEffect(() => {
        const fetchActionable = async () => {
            try {
                const response = await axios.get(`${API_URL}/demandes-actions/actionable?other_user_id=${otherUserId}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                setDemandes(response.data);
            } catch (error) {
                console.error("Error fetching actionable demandes", error);
            }
        };

        if (otherUserId) {
            fetchActionable();
        }
    }, [otherUserId, accessToken]);

    const handleFinalize = async (demandeId: number) => {
        setIsFinalizing(demandeId);
        try {
            await axios.post(`${API_URL}/demandes-actions/${demandeId}/finaliser`, {}, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            toast.success("Location finalisée ! Le bail a été envoyé par e-mail.");
            // Refresh list
            setDemandes(prev => prev.filter(d => d.id !== demandeId));
            if (onSuccess) onSuccess();
        } catch (error: any) {
            toast.error(error.response?.data?.detail || "Erreur lors de la finalisation.");
        } finally {
            setIsFinalizing(null);
        }
    };

    if (demandes.length === 0) return null;

    return (
        <div className="bg-emerald-50 border-y border-emerald-100 px-4 py-3">
            <div className="flex flex-col gap-2">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                    Actions de location disponibles
                </p>
                <div className="flex flex-wrap gap-2">
                    {demandes.map(demande => (
                        <div 
                            key={demande.id}
                            className="flex items-center justify-between gap-4 bg-white border border-emerald-200 rounded-xl p-3 shadow-sm min-w-[280px] flex-1"
                        >
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                                    <FiHome size={20} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-neutral-900 truncate">
                                        {demande.bien.titre}
                                    </p>
                                    <p className="text-xs text-neutral-500">
                                        Réf: {demande.bien.reference} • {demande.bien.type_bien}
                                    </p>
                                </div>
                            </div>
                            
                            <button
                                onClick={() => handleFinalize(demande.id)}
                                disabled={isFinalizing !== null}
                                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                            >
                                {isFinalizing === demande.id ? (
                                    <FiLoader className="animate-spin" />
                                ) : (
                                    <FiCheckCircle />
                                )}
                                Faire louer
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
