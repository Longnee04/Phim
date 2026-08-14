'use client';

import React from 'react';
import { Heart, Check, Plus } from 'lucide-react';
import { useMyList } from '@/hooks/useMyList';

interface BookmarkButtonProps {
  movie: {
    slug: string;
    name: string;
    origin_name?: string;
    poster_url: string;
    thumb_url: string;
    quality?: string;
    lang?: string;
    episode_current?: string;
    year?: number;
  };
  size?: 'sm' | 'md' | 'lg';
}

export function BookmarkButton({ movie, size = 'md' }: BookmarkButtonProps) {
  const { isInMyList, toggleMyList } = useMyList();
  const isSaved = isInMyList(movie.slug);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleMyList(movie);
  };

  if (size === 'sm') {
    return (
      <button
        onClick={handleClick}
        className={`p-2 rounded-xl border transition-all ${
          isSaved
            ? 'bg-primary/20 border-primary text-primary'
            : 'bg-[#181d26] border-[#273042] text-gray-300 hover:text-white'
        }`}
        title={isSaved ? 'Đã lưu vào danh sách' : 'Thêm vào danh sách'}
      >
        <Heart className={`w-4 h-4 ${isSaved ? 'fill-primary' : ''}`} />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border font-bold text-sm transition-all ${
        isSaved
          ? 'bg-primary/20 border-primary text-primary'
          : 'bg-[#181d26] hover:bg-[#232a38] border-[#273042] text-gray-200 hover:text-white'
      }`}
    >
      {isSaved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      <span>{isSaved ? 'Đã lưu trong danh sách' : 'Thêm vào Danh Sách'}</span>
    </button>
  );
}
