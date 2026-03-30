import { create } from "zustand";

interface BailModalState {
  isOpen: boolean;
  listingId?: string;
  onOpen: (listingId?: string) => void;
  onClose: () => void;
}

const useBailModal = create<BailModalState>((set) => ({
  isOpen: false,
  listingId: undefined,
  onOpen: (listingId) => set({ isOpen: true, listingId }),
  onClose: () => set({ isOpen: false, listingId: undefined }),
}));

export default useBailModal;
