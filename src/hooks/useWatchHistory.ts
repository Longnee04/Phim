'use client';

import { useState, useEffect, useCallback } from 'react';

export interface WatchHistoryItem {
  slug: string;
  name: string;
  poster_url: string;
  thumb_url: string;
  episode_slug: string;
  episode_name: string;
  server_index: number;
  current_time: number;
  duration: number;
  updated_at: number;
}

export function useWatchHistory() {
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem('lphim_history');
      if (item) {
        setHistory(JSON.parse(item));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveHistory = (newHistory: WatchHistoryItem[]) => {
    setHistory(newHistory);
    try {
      window.localStorage.setItem('lphim_history', JSON.stringify(newHistory));
    } catch (e) {
      console.error(e);
    }
  };

  const addToHistory = useCallback(
    (item: Omit<WatchHistoryItem, 'updated_at'>) => {
      const existingIdx = history.findIndex((h) => h.slug === item.slug);
      let updated: WatchHistoryItem[] = [];

      const newItem: WatchHistoryItem = {
        ...item,
        updated_at: Date.now(),
      };

      if (existingIdx >= 0) {
        updated = [...history];
        updated.splice(existingIdx, 1);
        updated.unshift(newItem);
      } else {
        updated = [newItem, ...history.slice(0, 29)];
      }

      saveHistory(updated);
    },
    [history]
  );

  const getMovieProgress = useCallback(
    (slug: string): WatchHistoryItem | undefined => {
      return history.find((h) => h.slug === slug);
    },
    [history]
  );

  const removeFromHistory = (slug: string) => {
    const filtered = history.filter((h) => h.slug !== slug);
    saveHistory(filtered);
  };

  return { history, isLoaded, addToHistory, getMovieProgress, removeFromHistory };
}
