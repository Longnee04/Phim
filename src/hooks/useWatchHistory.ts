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
  const [history, setHistory] = useState<WatchHistoryItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const item = window.localStorage.getItem('lphim_history');
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  });
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

  const saveHistory = useCallback((newHistory: WatchHistoryItem[]) => {
    setHistory(newHistory);
    try {
      window.localStorage.setItem('lphim_history', JSON.stringify(newHistory));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const addToHistory = useCallback(
    (item: Omit<WatchHistoryItem, 'updated_at'>) => {
      setHistory((prev) => {
        // Read latest from localStorage if available to prevent stale closure race conditions
        let currentList = prev;
        try {
          const itemRaw = window.localStorage.getItem('lphim_history');
          if (itemRaw) {
            const parsed = JSON.parse(itemRaw);
            if (Array.isArray(parsed) && parsed.length > currentList.length) {
              currentList = parsed;
            }
          }
        } catch {}

        const existingIdx = currentList.findIndex((h) => h.slug === item.slug);
        const newItem: WatchHistoryItem = {
          ...item,
          updated_at: Date.now(),
        };

        let updated: WatchHistoryItem[] = [];
        if (existingIdx >= 0) {
          updated = [...currentList];
          updated.splice(existingIdx, 1);
          updated.unshift(newItem);
        } else {
          updated = [newItem, ...currentList.slice(0, 49)];
        }

        try {
          window.localStorage.setItem('lphim_history', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }

        return updated;
      });
    },
    []
  );

  const getMovieProgress = useCallback(
    (slug: string): WatchHistoryItem | undefined => {
      const found = history.find((h) => h.slug === slug);
      if (found) return found;

      if (typeof window !== 'undefined') {
        try {
          const raw = window.localStorage.getItem('lphim_history');
          if (raw) {
            const list: WatchHistoryItem[] = JSON.parse(raw);
            return list.find((h) => h.slug === slug);
          }
        } catch {}
      }
      return undefined;
    },
    [history]
  );

  const removeFromHistory = useCallback((slug: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h.slug !== slug);
      try {
        window.localStorage.setItem('lphim_history', JSON.stringify(filtered));
      } catch (e) {
        console.error(e);
      }
      return filtered;
    });
  }, []);

  return { history, isLoaded, addToHistory, getMovieProgress, removeFromHistory };
}
