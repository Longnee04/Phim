import React from 'react';
import { Metadata } from 'next';
import MyListClient from './MyListClient';

export const metadata: Metadata = {
  title: 'Danh Sách Phim Của Tôi | LPHIM',
  description: 'Quản lý danh sách các bộ phim yêu thích và xem sau của bạn tại LPhim',
};

export default function MyListPage() {
  return <MyListClient />;
}
