'use client';

import { useState, useEffect, useCallback } from 'react';

export interface MyListItem {
  slug: string;
  name: string;
  origin_name?: string;
  poster_url: string;
  thumb_url: string;
  quality?: string;
  lang?: string;
  episode_current?: string;
  year?: number;
  addedAt: number;
}

export function useMyList() {
  const [list, setList] = useState<MyListItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const item = window.localStorage.getItem('lphim_mylist');
      return item ? JSON.parse(item) : [];
    } catch {
      return [];
    }
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const item = window.localStorage.getItem('lphim_mylist');
      if (item) {
        setList(JSON.parse(item));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  const saveList = useCallback((newList: MyListItem[]) => {
    setList(newList);
    try {
      window.localStorage.setItem('lphim_mylist', JSON.stringify(newList));
    } catch (e) {
      console.error(e);
    }
  }, []);

  const isInMyList = useCallback(
    (slug: string) => {
      return list.some((item) => item.slug === slug);
    },
    [list]
  );

  const toggleMyList = useCallback((movie: Omit<MyListItem, 'addedAt'>) => {
    setList((prev) => {
      const exists = prev.some((item) => item.slug === movie.slug);
      let updated: MyListItem[] = [];
      if (exists) {
        updated = prev.filter((item) => item.slug !== movie.slug);
      } else {
        const newItem: MyListItem = { ...movie, addedAt: Date.now() };
        updated = [newItem, ...prev];
      }
      try {
        window.localStorage.setItem('lphim_mylist', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
  }, []);

  return { list, isLoaded, isInMyList, toggleMyList };
}
