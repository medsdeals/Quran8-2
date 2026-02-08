// src/store/mushafStore.ts
import { create } from 'zustand';
import { DownloadProgress } from '../types';

interface MushafState {
    currentMushafId: number | null;
    currentPage: number;
    installedMushafs: number[];
    downloadProgress: Record<number, DownloadProgress>;
    isLoading: boolean;

    setCurrentMushaf: (id: number) => void;
    setCurrentPage: (page: number) => void;
    addInstalledMushaf: (id: number) => void;
    removeInstalledMushaf: (id: number) => void;
    setDownloadProgress: (id: number, progress: DownloadProgress) => void;
    clearDownloadProgress: (id: number) => void;
    setInstalledMushafs: (ids: number[]) => void;
    setLoading: (loading: boolean) => void;
}

export const useMushafStore = create<MushafState>((set) => ({
    currentMushafId: null,
    currentPage: 1,
    installedMushafs: [],
    downloadProgress: {},
    isLoading: false,

    setCurrentMushaf: (id) => set({ currentMushafId: id, currentPage: 1 }),

    setCurrentPage: (page) => set({ currentPage: page }),

    addInstalledMushaf: (id) => set((state) => ({
        installedMushafs: state.installedMushafs.includes(id)
            ? state.installedMushafs
            : [...state.installedMushafs, id]
    })),

    removeInstalledMushaf: (id) => set((state) => ({
        installedMushafs: state.installedMushafs.filter(m => m !== id)
    })),

    setDownloadProgress: (id, progress) => set((state) => ({
        downloadProgress: { ...state.downloadProgress, [id]: progress }
    })),

    clearDownloadProgress: (id) => set((state) => {
        const { [id]: _, ...rest } = state.downloadProgress;
        return { downloadProgress: rest };
    }),

    setInstalledMushafs: (ids) => set({ installedMushafs: ids }),

    setLoading: (loading) => set({ isLoading: loading })
}));
