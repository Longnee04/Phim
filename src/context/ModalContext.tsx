'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { MovieItem, MovieServer } from '@/types/movie';
import { getMovieDetail } from '@/lib/api';

interface ModalContextType {
  isOpen: boolean;
  movie: MovieItem | null;
  episodes: MovieServer[];
  isLoading: boolean;
  selectedServerIndex: number;
  selectedEpisodeSlug: string;
  isPlaying: boolean;
  openModal: (slug: string, autoPlay?: boolean) => Promise<void>;
  closeModal: () => void;
  setSelectedServerIndex: (index: number) => void;
  setSelectedEpisodeSlug: (slug: string) => void;
  setIsPlaying: (playing: boolean) => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [movie, setMovie] = useState<MovieItem | null>(null);
  const [episodes, setEpisodes] = useState<MovieServer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);
  const [selectedEpisodeSlug, setSelectedEpisodeSlug] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  const openModal = useCallback(async (slug: string, autoPlay: boolean = false) => {
    setIsOpen(true);
    setIsLoading(true);
    setIsPlaying(autoPlay);
    setMovie(null);
    setEpisodes([]);
    setSelectedEpisodeSlug('');

    try {
      const data = await getMovieDetail(slug);
      if (data && data.movie) {
        setMovie(data.movie);
        const eps = data.episodes || [];
        setEpisodes(eps);
        setSelectedServerIndex(0);
        if (eps.length > 0 && eps[0]?.server_data?.length > 0) {
          setSelectedEpisodeSlug(eps[0].server_data[0].slug);
        }
      }
    } catch (err) {
      console.error('Error loading movie modal:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    setIsPlaying(false);
    setMovie(null);
    setEpisodes([]);
    setSelectedEpisodeSlug('');
  }, []);

  return (
    <ModalContext.Provider
      value={{
        isOpen,
        movie,
        episodes,
        isLoading,
        selectedServerIndex,
        selectedEpisodeSlug,
        isPlaying,
        openModal,
        closeModal,
        setSelectedServerIndex,
        setSelectedEpisodeSlug,
        setIsPlaying,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}
