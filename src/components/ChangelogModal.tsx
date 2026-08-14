'use client';

import React, { useState, useEffect } from 'react';

export function ChangelogModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Listen for custom trigger or bell click
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('open-changelog', handleOpen);
    return () => window.removeEventListener('open-changelog', handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="notification-modal"
      id="notification-modal"
      style={{ display: 'flex' }}
    >
      <div className="notification-modal__content">
        <div className="notification-modal__header">
          <h3><i className="fas fa-bell"></i> Nhật Ký Cập Nhật LPhim</h3>
          <button
            className="notification-modal__close"
            id="notification-close"
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setIsOpen(false)}
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        <div className="notification-body">
          <div className="changelog-item">
            <div className="changelog-version">
              Phiên bản 2.0 <span className="badge badge--new">Mới</span>
            </div>
            <div className="changelog-date">13/07/2026</div>
            <ul className="changelog-list">
              <li>
                <b>Nâng cấp giao diện 2.0:</b> Menu ngang nổi kính mờ (Glassmorphic Nav) siêu nhỏ gọn, căn thẳng hàng tăm tắp, hào quang nền động (Ambient Glow) biến đổi màu sắc theo slide phim.
              </li>
              <li>
                <b>Đồng bộ thẻ phim toàn trang:</b> Thống nhất hiệu ứng bo tròn 16px, hover thu phóng và tự động hiện các nút Phát nhanh, Thêm yêu thích, Xem chi tiết và năm phát hành ở tất cả các trang phụ.
              </li>
              <li>
                <b>Giao diện chi tiết kính mờ:</b> Khung chi tiết phim căn giữa lơ lửng được khoác lớp áo kính mờ cao cấp với hiệu ứng làm mờ hậu cảnh sâu.
              </li>
              <li>
                <b>Bổ sung thể loại Anime:</b> Tích hợp danh mục Anime Nhật Bản lọc tự động chính xác từ API.
              </li>
            </ul>
          </div>

          <div className="changelog-item">
            <div className="changelog-version">Phiên bản 1.3</div>
            <div className="changelog-date">10/07/2026</div>
            <ul className="changelog-list">
              <li>
                Tích hợp cơ chế <b>Tự chữa lành (Self-Healing)</b> cho trình phát video HLS, tự động kết nối lại khi mạng lag và tiếp tục phát tiếp từ giây bị gián đoạn.
              </li>
              <li>
                Nâng cấp dung lượng bộ nhớ đệm video lên 60 giây (60MB) giúp xem phim mượt mà.
              </li>
            </ul>
          </div>

          <div className="changelog-item">
            <div className="changelog-version">Phiên bản 1.2</div>
            <div className="changelog-date">09/07/2026</div>
            <ul className="changelog-list">
              <li>
                Nâng cấp bộ tìm kiếm thông minh: Ghi nhớ các từ khóa tìm kiếm gần nhất.
              </li>
              <li>
                Tối ưu hóa máy chủ ảnh phim dự phòng tự động để đảm bảo không bị lỗi ảnh nền.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
