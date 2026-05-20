# TODO - Cải tiến WebPhim

- [x] (Step 1) Tối ưu `loadAllRows()` fetch dữ liệu song song + cache đơn giản
- [x] (Step 2) Lazy-load ảnh poster trong `renderRow()` (loading/decoding)
- [x] (Step 3) Chống race condition trong `openModal()` bằng AbortController/request token


- [x] (Step 4) Robustify parse dữ liệu: category/country/episodes có thể rỗng/thiếu

- [x] (Step 5) UX: hỗ trợ đóng modal bằng ESC + restore focus

- [x] (Step 6) Accessibility: thêm aria tối thiểu cho modal/controls

- [x] (Step 7) Dọn cleanup code thừa, format lại chỗ cần

- [ ] (Step 8) Test thủ công: load trang, click modal liên tục, ESC đóng, cuộn trang


