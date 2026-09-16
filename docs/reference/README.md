# Tham chiếu thiết kế UI

Thư mục này ghi lại nguồn cảm hứng giao diện của Splitz. Ảnh gốc không được lưu
trong repo; phần mô tả dưới đây đủ để hiểu và đối chiếu khi sửa UI.

## Nguồn cảm hứng: app "Mintro" (finance UI kit)

Phong cách lấy cảm hứng (KHÔNG sao chép màu gốc — Splitz đổi sang XANH DƯƠNG):

- **Bố cục mobile-first**, khung bo góc rất lớn (~28-32px), nhiều khoảng trắng.
- **Số tài chính cỡ rất lớn, đậm** (vd "$56,857.30") là tâm điểm mỗi màn.
- **Thẻ kiểu credit card** gradient, có ánh sáng/độ bóng, xếp chồng nhẹ.
- **Glassmorphism**: thẻ mờ, đổ bóng mềm, viền sáng.
- **Bottom navigation nổi** dạng pill, có **nút tròn gradient ở GIỮA** (scan/hành động chính).
- **Icon tròn** cho hành động nhanh (Quick Send: avatar bạn bè hình tròn).
- **Minh hoạ 3D** (túi tiền có cánh) + các ngôi sao/đồng xu lấp lánh.
- Mintro gốc dùng tím/hồng pastel. → **Splitz thay bằng gradient XANH DƯƠNG → CYAN/INDIGO.**

Các màn tham chiếu chính:
1. Onboarding/Login: tiêu đề lớn 2 dòng, minh hoạ 3D giữa, nút Login/Register + "Continue with Apple".
2. Home/Wallet: "Total Balance" số lớn, thẻ card gradient lướt ngang, hàng icon hành động, "Quick Send" avatar tròn.
3. Pay Bill/Spending: 2 ô số liệu trên cùng, "Upcoming Payment" dạng grid icon tròn, ô "Essential Spending" gradient.

### Cách Splitz áp dụng (đối chiếu)
- Hero card gradient xanh ở Home = tinh thần "Total Balance" của Mintro.
- BottomNav nổi + nút "+" gradient giữa = giống thanh nav Mintro.
- Avatar tròn gradient cho thành viên = giống "Quick Send".
- Glass + animation (float, fade-up, shimmer, press) = giữ cảm giác premium.
