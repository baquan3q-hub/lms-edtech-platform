-- =========================================================================
-- LMS EDTECH PLATFORM - SEED 30 HỌC SINH, 30 PHỤ HUYNH, 5 GIÁO VIÊN
-- Trường: Trường THCS Nguyễn Du (Pilot) - Thuộc Quản Trị Của Thầy Long (thaylongcngd@gmail.com)
-- Mật khẩu chung: DemoPassword123@
-- Ngày tạo: 27/9/2026
-- =========================================================================

-- [A] ĐẢM BẢO TRƯỜNG THCS NGUYỄN DU TỒN TẠI
INSERT INTO public.schools (id, code, name, address, status, ai_enabled)
VALUES 
  ('00000000-0000-0000-0001-000000000000', 'THCS-NDU', 'Trường THCS Nguyễn Du (Pilot)', '44 Hàng Quạt, Hoàn Kiếm, Hà Nội', 'active', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active';

-- [B] TẠO 5 GIÁO VIÊN
INSERT INTO public.users (id, email, role, full_name, phone)
VALUES
  ('0c870bc5-6c66-4eeb-94b0-12db54763b38', 'gv.nam@nguyendu.edu.vn', 'teacher', 'Thầy Lê Hoàng Nam', '0912000001'),
  ('227698f8-d339-48a0-9462-2a995ad32968', 'gv.huong@nguyendu.edu.vn', 'teacher', 'Cô Trần Thị Hương', '0912000002'),
  ('630fb967-8e92-4289-a550-8a98eaf757de', 'gv.duc@nguyendu.edu.vn', 'teacher', 'Thầy Nguyễn Văn Đức', '0912000003'),
  ('132c13e0-7da7-4e7a-9cd4-dd39549c197c', 'gv.maianh@nguyendu.edu.vn', 'teacher', 'Cô Phạm Mai Anh', '0912000004'),
  ('5a1eb984-664c-4b43-bbff-984e2fbf8280', 'gv.huy@nguyendu.edu.vn', 'teacher', 'Thầy Đỗ Quang Huy', '0912000005')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'teacher';

-- [C] TẠO 30 HỌC SINH
INSERT INTO public.users (id, email, role, full_name, phone)
VALUES
  ('e780c1a5-8d4c-4709-a785-6d2d1815150e', 'hs101@nguyendu.edu.vn', 'student', 'Nguyễn Gia Bảo', '0922000001'),
  ('c8a22cef-fa64-4716-952b-a74a77283f1c', 'hs102@nguyendu.edu.vn', 'student', 'Trần Bảo An', '0922000002'),
  ('7efc7696-96ba-4b76-85e4-fb2d86b63eb9', 'hs103@nguyendu.edu.vn', 'student', 'Lê Minh Khang', '0922000003'),
  ('125f71ff-766c-4025-8548-56dd137d0faf', 'hs104@nguyendu.edu.vn', 'student', 'Phạm Tuấn Kiệt', '0922000004'),
  ('3c864c69-ad94-4e4b-b2dc-1a13f67d3a29', 'hs105@nguyendu.edu.vn', 'student', 'Hoàng Thùy Linh', '0922000005'),
  ('7b62bb5c-f683-45c3-b1f5-8242bc3bd68a', 'hs106@nguyendu.edu.vn', 'student', 'Vũ Đức Anh', '0922000006'),
  ('187fb7bf-8b10-4800-b390-04d53aec6053', 'hs107@nguyendu.edu.vn', 'student', 'Đỗ Khánh Vy', '0922000007'),
  ('c1b38154-4532-445a-a4ce-664de7904448', 'hs108@nguyendu.edu.vn', 'student', 'Bùi Gia Hưng', '0922000008'),
  ('b197310d-78cd-46ef-91b7-cc9f649ce7dd', 'hs109@nguyendu.edu.vn', 'student', 'Ngô Phương Thảo', '0922000009'),
  ('c4f04ad9-f254-4b0c-91da-7d8d2417f5ed', 'hs110@nguyendu.edu.vn', 'student', 'Phan Anh Tuấn', '0922000010'),
  ('fd180f65-7c11-4b84-a9ca-78a104c5dbf6', 'hs111@nguyendu.edu.vn', 'student', 'Trịnh Hải Nam', '0922000011'),
  ('d9c63b5b-9642-415c-a1a0-c0197aa10c47', 'hs112@nguyendu.edu.vn', 'student', 'Dương Thu Trang', '0922000012'),
  ('952dcef9-93df-46d8-8bcb-3367517f0950', 'hs113@nguyendu.edu.vn', 'student', 'Đặng Quốc Huy', '0922000013'),
  ('5e41ad67-817a-4cfe-9461-be206f690a91', 'hs114@nguyendu.edu.vn', 'student', 'Lý Bảo Ngọc', '0922000014'),
  ('9354549e-2a80-4199-983a-66e1e567b062', 'hs115@nguyendu.edu.vn', 'student', 'Mai Văn Quyết', '0922000015'),
  ('c727bda8-a8bd-4190-8f19-10c3526e4c28', 'hs116@nguyendu.edu.vn', 'student', 'Hà Kiều Oanh', '0922000016'),
  ('3bb813cb-f26d-4586-a868-e07148ad7a16', 'hs117@nguyendu.edu.vn', 'student', 'Lương Hoàng Long', '0922000017'),
  ('67935c84-0f96-45d1-9102-0b5d5ab3858c', 'hs118@nguyendu.edu.vn', 'student', 'Đinh Diệu Linh', '0922000018'),
  ('acdc8423-ec20-44de-9b58-44e029067a72', 'hs119@nguyendu.edu.vn', 'student', 'Chu Tiến Đạt', '0922000019'),
  ('b8334714-f03f-4ef8-8270-7e630c0c8a60', 'hs120@nguyendu.edu.vn', 'student', 'Đoàn Thanh Trúc', '0922000020'),
  ('9fc701a3-f78c-4108-9144-78a0215450c6', 'hs121@nguyendu.edu.vn', 'student', 'Cao Mạnh Thắng', '0922000021'),
  ('5b0b64ba-423f-4834-aa8b-783d1c8e6712', 'hs122@nguyendu.edu.vn', 'student', 'Hồ Ngọc Hà', '0922000022'),
  ('1d8a3613-9b87-409a-982b-5631b96ef7ad', 'hs123@nguyendu.edu.vn', 'student', 'Tống Đức Duy', '0922000023'),
  ('4489b513-6c3f-4b78-9573-06d8dd3f1a37', 'hs124@nguyendu.edu.vn', 'student', 'Tạ Thị Ánh', '0922000024'),
  ('1ddfce74-65da-4546-be7d-c4dc3ee33e8c', 'hs125@nguyendu.edu.vn', 'student', 'Quách Tuấn Du', '0922000025'),
  ('cde16464-6215-4f3d-85ee-71c062eb2b40', 'hs126@nguyendu.edu.vn', 'student', 'Nghiêm Minh Phương', '0922000026'),
  ('9ee978ad-91af-4458-a3b4-c9cbfc3e8dd3', 'hs127@nguyendu.edu.vn', 'student', 'Bạch Hồng Quân', '0922000027'),
  ('8229373c-e12d-469f-8707-4f59fcdf8d93', 'hs128@nguyendu.edu.vn', 'student', 'Lâm Thúy Nga', '0922000028'),
  ('54194fe5-0f75-4476-96bc-0a0ec6942fdb', 'hs129@nguyendu.edu.vn', 'student', 'Trương Hữu Phát', '0922000029'),
  ('c6a295bc-13cf-410c-b410-8275eedd0871', 'hs130@nguyendu.edu.vn', 'student', 'Vương Minh Châu', '0922000030')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'student';

-- [D] TẠO 30 PHỤ HUYNH
INSERT INTO public.users (id, email, role, full_name, phone)
VALUES
  ('0331b529-3d51-474a-b876-9cd568e2f8fa', 'ph101@nguyendu.edu.vn', 'parent', 'Nguyễn Văn Hùng (PH Nguyễn Gia Bảo)', '0933000001'),
  ('20bd1f20-9edf-4b44-b376-0ed9837441e6', 'ph102@nguyendu.edu.vn', 'parent', 'Trần Quốc Tuấn (PH Trần Bảo An)', '0933000002'),
  ('019faec0-d14d-4362-849f-641d36a273ee', 'ph103@nguyendu.edu.vn', 'parent', 'Lê Trọng Nghĩa (PH Lê Minh Khang)', '0933000003'),
  ('56beeafc-81fa-4504-b487-b79e2e429c12', 'ph104@nguyendu.edu.vn', 'parent', 'Phạm Văn Thành (PH Phạm Tuấn Kiệt)', '0933000004'),
  ('d5c5cb3c-0784-4cce-94fc-a2ac0a4b8fd6', 'ph105@nguyendu.edu.vn', 'parent', 'Hoàng Minh Trí (PH Hoàng Thùy Linh)', '0933000005'),
  ('1230cd11-a97a-40b3-b8ae-2557309ab9d3', 'ph106@nguyendu.edu.vn', 'parent', 'Vũ Đình Dũng (PH Vũ Đức Anh)', '0933000006'),
  ('1094809e-21cb-4c55-9ada-5619ac487420', 'ph107@nguyendu.edu.vn', 'parent', 'Đỗ Quang Hải (PH Đỗ Khánh Vy)', '0933000007'),
  ('3eb55042-a524-425c-bea1-066b9d436202', 'ph108@nguyendu.edu.vn', 'parent', 'Bùi Thanh Bình (PH Bùi Gia Hưng)', '0933000008'),
  ('75d96dfc-3611-4d72-813c-9bea93b87372', 'ph109@nguyendu.edu.vn', 'parent', 'Ngô Đức Thắng (PH Ngô Phương Thảo)', '0933000009'),
  ('6c1456a6-7a7d-45ea-b584-86f1542e155e', 'ph110@nguyendu.edu.vn', 'parent', 'Phan Văn Phong (PH Phan Anh Tuấn)', '0933000010'),
  ('bc4d4362-6599-4376-ac71-829571622847', 'ph111@nguyendu.edu.vn', 'parent', 'Trịnh Quốc Đạt (PH Trịnh Hải Nam)', '0933000011'),
  ('15656738-44e5-44f4-ad2b-c33ff3cf7cf4', 'ph112@nguyendu.edu.vn', 'parent', 'Dương Văn Tiến (PH Dương Thu Trang)', '0933000012'),
  ('ff5dc090-c9ff-4da0-bfdb-adb4b67d83ee', 'ph113@nguyendu.edu.vn', 'parent', 'Đặng Hữu Phúc (PH Đặng Quốc Huy)', '0933000013'),
  ('615cb5e9-0492-48fb-bd5d-aa944b61c4f5', 'ph114@nguyendu.edu.vn', 'parent', 'Lý Quang Diệu (PH Lý Bảo Ngọc)', '0933000014'),
  ('d6e8caaf-ef5f-45f9-9532-79c5bf966469', 'ph115@nguyendu.edu.vn', 'parent', 'Mai Hồng Sơn (PH Mai Văn Quyết)', '0933000015'),
  ('89de99f1-487b-4f17-8969-c5a52746fd0f', 'ph116@nguyendu.edu.vn', 'parent', 'Hà Anh Tuấn (PH Hà Kiều Oanh)', '0933000016'),
  ('5038174e-0995-4bde-bcc5-813444cdba70', 'ph117@nguyendu.edu.vn', 'parent', 'Lương Thế Vinh (PH Lương Hoàng Long)', '0933000017'),
  ('0c4b1401-7164-49a7-b97b-75f1d0ea8ad9', 'ph118@nguyendu.edu.vn', 'parent', 'Đinh Trọng Hưng (PH Đinh Diệu Linh)', '0933000018'),
  ('31d8321a-f5f2-4c59-81bc-61b8fc4e838b', 'ph119@nguyendu.edu.vn', 'parent', 'Chu Văn Quý (PH Chu Tiến Đạt)', '0933000019'),
  ('8c54f1e6-6ca0-471e-b4fb-ec75e3ca6403', 'ph120@nguyendu.edu.vn', 'parent', 'Đoàn Minh Nhật (PH Đoàn Thanh Trúc)', '0933000020'),
  ('b9aae93a-3d95-4e60-a1db-c498382a2824', 'ph121@nguyendu.edu.vn', 'parent', 'Cao Văn Chiến (PH Cao Mạnh Thắng)', '0933000021'),
  ('7196c660-cfdc-4022-a89a-e5936db88cc6', 'ph122@nguyendu.edu.vn', 'parent', 'Hồ Thế Hiển (PH Hồ Ngọc Hà)', '0933000022'),
  ('80b4533d-cf93-416e-92a8-9e6c8f72ad9c', 'ph123@nguyendu.edu.vn', 'parent', 'Tống Quang Minh (PH Tống Đức Duy)', '0933000023'),
  ('f7bae190-27dc-484a-992b-715c4c401f17', 'ph124@nguyendu.edu.vn', 'parent', 'Tạ Văn Kiên (PH Tạ Thị Ánh)', '0933000024'),
  ('9c6e0ba7-8fdf-455b-9e0b-9af38dd76108', 'ph125@nguyendu.edu.vn', 'parent', 'Quách Văn Tài (PH Quách Tuấn Du)', '0933000025'),
  ('7fcfcb43-02d7-46c2-a742-1c99747e1b79', 'ph126@nguyendu.edu.vn', 'parent', 'Nghiêm Xuân Bách (PH Nghiêm Minh Phương)', '0933000026'),
  ('67e4bcc4-3544-4e3d-b5bc-31aaf9f9f5f9', 'ph127@nguyendu.edu.vn', 'parent', 'Bạch Văn Khoa (PH Bạch Hồng Quân)', '0933000027'),
  ('c4083025-e630-4947-a93e-3cdb8fcc2fed', 'ph128@nguyendu.edu.vn', 'parent', 'Lâm Văn Đông (PH Lâm Thúy Nga)', '0933000028'),
  ('32f23d7a-9a99-475c-b3ad-d333690e7a01', 'ph129@nguyendu.edu.vn', 'parent', 'Trương Công Định (PH Trương Hữu Phát)', '0933000029'),
  ('8717957d-a7f1-4d35-b00b-5cfaf1018bc5', 'ph130@nguyendu.edu.vn', 'parent', 'Vương Đình Huệ (PH Vương Minh Châu)', '0933000030')
ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'parent';

-- [E] GÁN THÀNH VIÊN TRƯỜNG THCS NGUYỄN DU (school_memberships)
INSERT INTO public.school_memberships (school_id, user_id, role, status)
VALUES
  ('00000000-0000-0000-0001-000000000000', '0c870bc5-6c66-4eeb-94b0-12db54763b38', 'teacher', 'active'),
  ('00000000-0000-0000-0001-000000000000', '227698f8-d339-48a0-9462-2a995ad32968', 'teacher', 'active'),
  ('00000000-0000-0000-0001-000000000000', '630fb967-8e92-4289-a550-8a98eaf757de', 'teacher', 'active'),
  ('00000000-0000-0000-0001-000000000000', '132c13e0-7da7-4e7a-9cd4-dd39549c197c', 'teacher', 'active'),
  ('00000000-0000-0000-0001-000000000000', '5a1eb984-664c-4b43-bbff-984e2fbf8280', 'teacher', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'e780c1a5-8d4c-4709-a785-6d2d1815150e', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '0331b529-3d51-474a-b876-9cd568e2f8fa', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'c8a22cef-fa64-4716-952b-a74a77283f1c', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '20bd1f20-9edf-4b44-b376-0ed9837441e6', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '7efc7696-96ba-4b76-85e4-fb2d86b63eb9', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '019faec0-d14d-4362-849f-641d36a273ee', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '125f71ff-766c-4025-8548-56dd137d0faf', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '56beeafc-81fa-4504-b487-b79e2e429c12', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '3c864c69-ad94-4e4b-b2dc-1a13f67d3a29', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'd5c5cb3c-0784-4cce-94fc-a2ac0a4b8fd6', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '7b62bb5c-f683-45c3-b1f5-8242bc3bd68a', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '1230cd11-a97a-40b3-b8ae-2557309ab9d3', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '187fb7bf-8b10-4800-b390-04d53aec6053', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '1094809e-21cb-4c55-9ada-5619ac487420', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'c1b38154-4532-445a-a4ce-664de7904448', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '3eb55042-a524-425c-bea1-066b9d436202', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'b197310d-78cd-46ef-91b7-cc9f649ce7dd', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '75d96dfc-3611-4d72-813c-9bea93b87372', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'c4f04ad9-f254-4b0c-91da-7d8d2417f5ed', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '6c1456a6-7a7d-45ea-b584-86f1542e155e', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'fd180f65-7c11-4b84-a9ca-78a104c5dbf6', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'bc4d4362-6599-4376-ac71-829571622847', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'd9c63b5b-9642-415c-a1a0-c0197aa10c47', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '15656738-44e5-44f4-ad2b-c33ff3cf7cf4', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '952dcef9-93df-46d8-8bcb-3367517f0950', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'ff5dc090-c9ff-4da0-bfdb-adb4b67d83ee', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '5e41ad67-817a-4cfe-9461-be206f690a91', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '615cb5e9-0492-48fb-bd5d-aa944b61c4f5', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '9354549e-2a80-4199-983a-66e1e567b062', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'd6e8caaf-ef5f-45f9-9532-79c5bf966469', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'c727bda8-a8bd-4190-8f19-10c3526e4c28', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '89de99f1-487b-4f17-8969-c5a52746fd0f', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '3bb813cb-f26d-4586-a868-e07148ad7a16', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '5038174e-0995-4bde-bcc5-813444cdba70', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '67935c84-0f96-45d1-9102-0b5d5ab3858c', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '0c4b1401-7164-49a7-b97b-75f1d0ea8ad9', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'acdc8423-ec20-44de-9b58-44e029067a72', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '31d8321a-f5f2-4c59-81bc-61b8fc4e838b', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'b8334714-f03f-4ef8-8270-7e630c0c8a60', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '8c54f1e6-6ca0-471e-b4fb-ec75e3ca6403', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '9fc701a3-f78c-4108-9144-78a0215450c6', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'b9aae93a-3d95-4e60-a1db-c498382a2824', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '5b0b64ba-423f-4834-aa8b-783d1c8e6712', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '7196c660-cfdc-4022-a89a-e5936db88cc6', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '1d8a3613-9b87-409a-982b-5631b96ef7ad', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '80b4533d-cf93-416e-92a8-9e6c8f72ad9c', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '4489b513-6c3f-4b78-9573-06d8dd3f1a37', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'f7bae190-27dc-484a-992b-715c4c401f17', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '1ddfce74-65da-4546-be7d-c4dc3ee33e8c', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '9c6e0ba7-8fdf-455b-9e0b-9af38dd76108', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'cde16464-6215-4f3d-85ee-71c062eb2b40', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '7fcfcb43-02d7-46c2-a742-1c99747e1b79', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '9ee978ad-91af-4458-a3b4-c9cbfc3e8dd3', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '67e4bcc4-3544-4e3d-b5bc-31aaf9f9f5f9', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '8229373c-e12d-469f-8707-4f59fcdf8d93', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'c4083025-e630-4947-a93e-3cdb8fcc2fed', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', '54194fe5-0f75-4476-96bc-0a0ec6942fdb', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '32f23d7a-9a99-475c-b3ad-d333690e7a01', 'parent', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'c6a295bc-13cf-410c-b410-8275eedd0871', 'student', 'active'),
  ('00000000-0000-0000-0001-000000000000', '8717957d-a7f1-4d35-b00b-5cfaf1018bc5', 'parent', 'active')
ON CONFLICT (school_id, user_id, role) DO UPDATE SET status = 'active';

-- [F] MÃ HỌC SINH ĐỊNH DANH (student_identifiers - Đăng nhập bằng mã HS101 - HS130)
INSERT INTO public.student_identifiers (school_id, user_id, student_code, status)
VALUES
  ('00000000-0000-0000-0001-000000000000', 'e780c1a5-8d4c-4709-a785-6d2d1815150e', 'HS101', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'c8a22cef-fa64-4716-952b-a74a77283f1c', 'HS102', 'active'),
  ('00000000-0000-0000-0001-000000000000', '7efc7696-96ba-4b76-85e4-fb2d86b63eb9', 'HS103', 'active'),
  ('00000000-0000-0000-0001-000000000000', '125f71ff-766c-4025-8548-56dd137d0faf', 'HS104', 'active'),
  ('00000000-0000-0000-0001-000000000000', '3c864c69-ad94-4e4b-b2dc-1a13f67d3a29', 'HS105', 'active'),
  ('00000000-0000-0000-0001-000000000000', '7b62bb5c-f683-45c3-b1f5-8242bc3bd68a', 'HS106', 'active'),
  ('00000000-0000-0000-0001-000000000000', '187fb7bf-8b10-4800-b390-04d53aec6053', 'HS107', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'c1b38154-4532-445a-a4ce-664de7904448', 'HS108', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'b197310d-78cd-46ef-91b7-cc9f649ce7dd', 'HS109', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'c4f04ad9-f254-4b0c-91da-7d8d2417f5ed', 'HS110', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'fd180f65-7c11-4b84-a9ca-78a104c5dbf6', 'HS111', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'd9c63b5b-9642-415c-a1a0-c0197aa10c47', 'HS112', 'active'),
  ('00000000-0000-0000-0001-000000000000', '952dcef9-93df-46d8-8bcb-3367517f0950', 'HS113', 'active'),
  ('00000000-0000-0000-0001-000000000000', '5e41ad67-817a-4cfe-9461-be206f690a91', 'HS114', 'active'),
  ('00000000-0000-0000-0001-000000000000', '9354549e-2a80-4199-983a-66e1e567b062', 'HS115', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'c727bda8-a8bd-4190-8f19-10c3526e4c28', 'HS116', 'active'),
  ('00000000-0000-0000-0001-000000000000', '3bb813cb-f26d-4586-a868-e07148ad7a16', 'HS117', 'active'),
  ('00000000-0000-0000-0001-000000000000', '67935c84-0f96-45d1-9102-0b5d5ab3858c', 'HS118', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'acdc8423-ec20-44de-9b58-44e029067a72', 'HS119', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'b8334714-f03f-4ef8-8270-7e630c0c8a60', 'HS120', 'active'),
  ('00000000-0000-0000-0001-000000000000', '9fc701a3-f78c-4108-9144-78a0215450c6', 'HS121', 'active'),
  ('00000000-0000-0000-0001-000000000000', '5b0b64ba-423f-4834-aa8b-783d1c8e6712', 'HS122', 'active'),
  ('00000000-0000-0000-0001-000000000000', '1d8a3613-9b87-409a-982b-5631b96ef7ad', 'HS123', 'active'),
  ('00000000-0000-0000-0001-000000000000', '4489b513-6c3f-4b78-9573-06d8dd3f1a37', 'HS124', 'active'),
  ('00000000-0000-0000-0001-000000000000', '1ddfce74-65da-4546-be7d-c4dc3ee33e8c', 'HS125', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'cde16464-6215-4f3d-85ee-71c062eb2b40', 'HS126', 'active'),
  ('00000000-0000-0000-0001-000000000000', '9ee978ad-91af-4458-a3b4-c9cbfc3e8dd3', 'HS127', 'active'),
  ('00000000-0000-0000-0001-000000000000', '8229373c-e12d-469f-8707-4f59fcdf8d93', 'HS128', 'active'),
  ('00000000-0000-0000-0001-000000000000', '54194fe5-0f75-4476-96bc-0a0ec6942fdb', 'HS129', 'active'),
  ('00000000-0000-0000-0001-000000000000', 'c6a295bc-13cf-410c-b410-8275eedd0871', 'HS130', 'active')
ON CONFLICT (school_id, student_code) DO UPDATE SET user_id = EXCLUDED.user_id, status = 'active';

-- [G] KÍCH HOẠT TÀI KHOẢN (status = 'used')
UPDATE public.account_activations SET status = 'used' WHERE user_id IN (
  'e780c1a5-8d4c-4709-a785-6d2d1815150e',
  'c8a22cef-fa64-4716-952b-a74a77283f1c',
  '7efc7696-96ba-4b76-85e4-fb2d86b63eb9',
  '125f71ff-766c-4025-8548-56dd137d0faf',
  '3c864c69-ad94-4e4b-b2dc-1a13f67d3a29',
  '7b62bb5c-f683-45c3-b1f5-8242bc3bd68a',
  '187fb7bf-8b10-4800-b390-04d53aec6053',
  'c1b38154-4532-445a-a4ce-664de7904448',
  'b197310d-78cd-46ef-91b7-cc9f649ce7dd',
  'c4f04ad9-f254-4b0c-91da-7d8d2417f5ed',
  'fd180f65-7c11-4b84-a9ca-78a104c5dbf6',
  'd9c63b5b-9642-415c-a1a0-c0197aa10c47',
  '952dcef9-93df-46d8-8bcb-3367517f0950',
  '5e41ad67-817a-4cfe-9461-be206f690a91',
  '9354549e-2a80-4199-983a-66e1e567b062',
  'c727bda8-a8bd-4190-8f19-10c3526e4c28',
  '3bb813cb-f26d-4586-a868-e07148ad7a16',
  '67935c84-0f96-45d1-9102-0b5d5ab3858c',
  'acdc8423-ec20-44de-9b58-44e029067a72',
  'b8334714-f03f-4ef8-8270-7e630c0c8a60',
  '9fc701a3-f78c-4108-9144-78a0215450c6',
  '5b0b64ba-423f-4834-aa8b-783d1c8e6712',
  '1d8a3613-9b87-409a-982b-5631b96ef7ad',
  '4489b513-6c3f-4b78-9573-06d8dd3f1a37',
  '1ddfce74-65da-4546-be7d-c4dc3ee33e8c',
  'cde16464-6215-4f3d-85ee-71c062eb2b40',
  '9ee978ad-91af-4458-a3b4-c9cbfc3e8dd3',
  '8229373c-e12d-469f-8707-4f59fcdf8d93',
  '54194fe5-0f75-4476-96bc-0a0ec6942fdb',
  'c6a295bc-13cf-410c-b410-8275eedd0871');

-- [H] LIÊN KẾT PHỤ HUYNH - HỌC SINH (parent_students)
INSERT INTO public.parent_students (id, parent_id, student_id, relationship, is_primary, school_id, verification_status)
VALUES
  ('00000000-0000-0004-0000-000000000101', '0331b529-3d51-474a-b876-9cd568e2f8fa', 'e780c1a5-8d4c-4709-a785-6d2d1815150e', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000102', '20bd1f20-9edf-4b44-b376-0ed9837441e6', 'c8a22cef-fa64-4716-952b-a74a77283f1c', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000103', '019faec0-d14d-4362-849f-641d36a273ee', '7efc7696-96ba-4b76-85e4-fb2d86b63eb9', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000104', '56beeafc-81fa-4504-b487-b79e2e429c12', '125f71ff-766c-4025-8548-56dd137d0faf', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000105', 'd5c5cb3c-0784-4cce-94fc-a2ac0a4b8fd6', '3c864c69-ad94-4e4b-b2dc-1a13f67d3a29', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000106', '1230cd11-a97a-40b3-b8ae-2557309ab9d3', '7b62bb5c-f683-45c3-b1f5-8242bc3bd68a', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000107', '1094809e-21cb-4c55-9ada-5619ac487420', '187fb7bf-8b10-4800-b390-04d53aec6053', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000108', '3eb55042-a524-425c-bea1-066b9d436202', 'c1b38154-4532-445a-a4ce-664de7904448', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000109', '75d96dfc-3611-4d72-813c-9bea93b87372', 'b197310d-78cd-46ef-91b7-cc9f649ce7dd', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000110', '6c1456a6-7a7d-45ea-b584-86f1542e155e', 'c4f04ad9-f254-4b0c-91da-7d8d2417f5ed', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000111', 'bc4d4362-6599-4376-ac71-829571622847', 'fd180f65-7c11-4b84-a9ca-78a104c5dbf6', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000112', '15656738-44e5-44f4-ad2b-c33ff3cf7cf4', 'd9c63b5b-9642-415c-a1a0-c0197aa10c47', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000113', 'ff5dc090-c9ff-4da0-bfdb-adb4b67d83ee', '952dcef9-93df-46d8-8bcb-3367517f0950', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000114', '615cb5e9-0492-48fb-bd5d-aa944b61c4f5', '5e41ad67-817a-4cfe-9461-be206f690a91', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000115', 'd6e8caaf-ef5f-45f9-9532-79c5bf966469', '9354549e-2a80-4199-983a-66e1e567b062', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000116', '89de99f1-487b-4f17-8969-c5a52746fd0f', 'c727bda8-a8bd-4190-8f19-10c3526e4c28', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000117', '5038174e-0995-4bde-bcc5-813444cdba70', '3bb813cb-f26d-4586-a868-e07148ad7a16', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000118', '0c4b1401-7164-49a7-b97b-75f1d0ea8ad9', '67935c84-0f96-45d1-9102-0b5d5ab3858c', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000119', '31d8321a-f5f2-4c59-81bc-61b8fc4e838b', 'acdc8423-ec20-44de-9b58-44e029067a72', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000120', '8c54f1e6-6ca0-471e-b4fb-ec75e3ca6403', 'b8334714-f03f-4ef8-8270-7e630c0c8a60', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000121', 'b9aae93a-3d95-4e60-a1db-c498382a2824', '9fc701a3-f78c-4108-9144-78a0215450c6', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000122', '7196c660-cfdc-4022-a89a-e5936db88cc6', '5b0b64ba-423f-4834-aa8b-783d1c8e6712', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000123', '80b4533d-cf93-416e-92a8-9e6c8f72ad9c', '1d8a3613-9b87-409a-982b-5631b96ef7ad', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000124', 'f7bae190-27dc-484a-992b-715c4c401f17', '4489b513-6c3f-4b78-9573-06d8dd3f1a37', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000125', '9c6e0ba7-8fdf-455b-9e0b-9af38dd76108', '1ddfce74-65da-4546-be7d-c4dc3ee33e8c', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000126', '7fcfcb43-02d7-46c2-a742-1c99747e1b79', 'cde16464-6215-4f3d-85ee-71c062eb2b40', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000127', '67e4bcc4-3544-4e3d-b5bc-31aaf9f9f5f9', '9ee978ad-91af-4458-a3b4-c9cbfc3e8dd3', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000128', 'c4083025-e630-4947-a93e-3cdb8fcc2fed', '8229373c-e12d-469f-8707-4f59fcdf8d93', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000129', '32f23d7a-9a99-475c-b3ad-d333690e7a01', '54194fe5-0f75-4476-96bc-0a0ec6942fdb', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified'),
  ('00000000-0000-0004-0000-000000000130', '8717957d-a7f1-4d35-b00b-5cfaf1018bc5', 'c6a295bc-13cf-410c-b410-8275eedd0871', 'Bố', true, '00000000-0000-0000-0001-000000000000', 'verified')
ON CONFLICT (id) DO UPDATE SET verification_status = 'verified';

-- [I] TẠO LỚP 9A1 VÀ GHI DANH 30 HỌC SINH
INSERT INTO public.classes (id, name, course_id, teacher_id, room, max_students, status, school_id)
VALUES 
  ('00000000-0000-0030-0000-000000000901', 'Lớp 9A1 - THCS Nguyễn Du', '9d0d01db-eddb-4383-bf69-59434d83839d', '0c870bc5-6c66-4eeb-94b0-12db54763b38', 'Phòng 201 - Nhà A', 40, 'active', '00000000-0000-0000-0001-000000000000')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, teacher_id = EXCLUDED.teacher_id, status = 'active';

-- Ghi danh 30 học sinh vào Lớp 9A1
INSERT INTO public.enrollments (student_id, class_id, status, enrolled_at)
VALUES
  ('e780c1a5-8d4c-4709-a785-6d2d1815150e', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('c8a22cef-fa64-4716-952b-a74a77283f1c', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('7efc7696-96ba-4b76-85e4-fb2d86b63eb9', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('125f71ff-766c-4025-8548-56dd137d0faf', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('3c864c69-ad94-4e4b-b2dc-1a13f67d3a29', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('7b62bb5c-f683-45c3-b1f5-8242bc3bd68a', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('187fb7bf-8b10-4800-b390-04d53aec6053', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('c1b38154-4532-445a-a4ce-664de7904448', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('b197310d-78cd-46ef-91b7-cc9f649ce7dd', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('c4f04ad9-f254-4b0c-91da-7d8d2417f5ed', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('fd180f65-7c11-4b84-a9ca-78a104c5dbf6', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('d9c63b5b-9642-415c-a1a0-c0197aa10c47', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('952dcef9-93df-46d8-8bcb-3367517f0950', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('5e41ad67-817a-4cfe-9461-be206f690a91', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('9354549e-2a80-4199-983a-66e1e567b062', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('c727bda8-a8bd-4190-8f19-10c3526e4c28', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('3bb813cb-f26d-4586-a868-e07148ad7a16', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('67935c84-0f96-45d1-9102-0b5d5ab3858c', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('acdc8423-ec20-44de-9b58-44e029067a72', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('b8334714-f03f-4ef8-8270-7e630c0c8a60', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('9fc701a3-f78c-4108-9144-78a0215450c6', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('5b0b64ba-423f-4834-aa8b-783d1c8e6712', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('1d8a3613-9b87-409a-982b-5631b96ef7ad', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('4489b513-6c3f-4b78-9573-06d8dd3f1a37', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('1ddfce74-65da-4546-be7d-c4dc3ee33e8c', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('cde16464-6215-4f3d-85ee-71c062eb2b40', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('9ee978ad-91af-4458-a3b4-c9cbfc3e8dd3', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('8229373c-e12d-469f-8707-4f59fcdf8d93', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('54194fe5-0f75-4476-96bc-0a0ec6942fdb', '00000000-0000-0030-0000-000000000901', 'active', now()),
  ('c6a295bc-13cf-410c-b410-8275eedd0871', '00000000-0000-0030-0000-000000000901', 'active', now())
ON CONFLICT (student_id, class_id) DO UPDATE SET status = 'active';

-- =========================================================================
-- [J] ĐIỂM DANH HÔM NAY: BUỔI HỌC VÀ BẢN GHI ĐIỂM DANH CỦA 30 HỌC SINH
-- 👉 BẠN CÓ THỂ ĐIỀU CHỈNH CÁC GIÁ TRỊ:
--    'present' : Có mặt
--    'late'    : Đi muộn
--    'excused' : Nghỉ có phép
--    'absent'  : Vắng không phép
-- =========================================================================

-- 1. Phiên điểm danh ngày hôm nay
INSERT INTO public.attendance_sessions (id, class_id, teacher_id, session_date, status, note)
VALUES 
  ('00000000-0000-0055-0000-000000000999', '00000000-0000-0030-0000-000000000901', '0c870bc5-6c66-4eeb-94b0-12db54763b38', CURRENT_DATE, 'closed', 'Điểm danh Lớp 9A1 ngày hôm nay')
ON CONFLICT (id) DO UPDATE SET session_date = CURRENT_DATE, status = 'closed';

-- 2. Chi tiết điểm danh của 30 học sinh hôm nay
INSERT INTO public.attendance_records (id, session_id, student_id, status, note, marked_by, marked_at)
VALUES
  ('00000000-0000-0060-0000-000000000101', '00000000-0000-0055-0000-000000000999', 'e780c1a5-8d4c-4709-a785-6d2d1815150e', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000102', '00000000-0000-0055-0000-000000000999', 'c8a22cef-fa64-4716-952b-a74a77283f1c', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000103', '00000000-0000-0055-0000-000000000999', '7efc7696-96ba-4b76-85e4-fb2d86b63eb9', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000104', '00000000-0000-0055-0000-000000000999', '125f71ff-766c-4025-8548-56dd137d0faf', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000105', '00000000-0000-0055-0000-000000000999', '3c864c69-ad94-4e4b-b2dc-1a13f67d3a29', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000106', '00000000-0000-0055-0000-000000000999', '7b62bb5c-f683-45c3-b1f5-8242bc3bd68a', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000107', '00000000-0000-0055-0000-000000000999', '187fb7bf-8b10-4800-b390-04d53aec6053', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000108', '00000000-0000-0055-0000-000000000999', 'c1b38154-4532-445a-a4ce-664de7904448', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000109', '00000000-0000-0055-0000-000000000999', 'b197310d-78cd-46ef-91b7-cc9f649ce7dd', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000110', '00000000-0000-0055-0000-000000000999', 'c4f04ad9-f254-4b0c-91da-7d8d2417f5ed', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000111', '00000000-0000-0055-0000-000000000999', 'fd180f65-7c11-4b84-a9ca-78a104c5dbf6', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000112', '00000000-0000-0055-0000-000000000999', 'd9c63b5b-9642-415c-a1a0-c0197aa10c47', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000113', '00000000-0000-0055-0000-000000000999', '952dcef9-93df-46d8-8bcb-3367517f0950', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000114', '00000000-0000-0055-0000-000000000999', '5e41ad67-817a-4cfe-9461-be206f690a91', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000115', '00000000-0000-0055-0000-000000000999', '9354549e-2a80-4199-983a-66e1e567b062', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000116', '00000000-0000-0055-0000-000000000999', 'c727bda8-a8bd-4190-8f19-10c3526e4c28', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000117', '00000000-0000-0055-0000-000000000999', '3bb813cb-f26d-4586-a868-e07148ad7a16', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000118', '00000000-0000-0055-0000-000000000999', '67935c84-0f96-45d1-9102-0b5d5ab3858c', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000119', '00000000-0000-0055-0000-000000000999', 'acdc8423-ec20-44de-9b58-44e029067a72', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000120', '00000000-0000-0055-0000-000000000999', 'b8334714-f03f-4ef8-8270-7e630c0c8a60', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000121', '00000000-0000-0055-0000-000000000999', '9fc701a3-f78c-4108-9144-78a0215450c6', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000122', '00000000-0000-0055-0000-000000000999', '5b0b64ba-423f-4834-aa8b-783d1c8e6712', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000123', '00000000-0000-0055-0000-000000000999', '1d8a3613-9b87-409a-982b-5631b96ef7ad', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000124', '00000000-0000-0055-0000-000000000999', '4489b513-6c3f-4b78-9573-06d8dd3f1a37', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000125', '00000000-0000-0055-0000-000000000999', '1ddfce74-65da-4546-be7d-c4dc3ee33e8c', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000126', '00000000-0000-0055-0000-000000000999', 'cde16464-6215-4f3d-85ee-71c062eb2b40', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000127', '00000000-0000-0055-0000-000000000999', '9ee978ad-91af-4458-a3b4-c9cbfc3e8dd3', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000128', '00000000-0000-0055-0000-000000000999', '8229373c-e12d-469f-8707-4f59fcdf8d93', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000129', '00000000-0000-0055-0000-000000000999', '54194fe5-0f75-4476-96bc-0a0ec6942fdb', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now()),
  ('00000000-0000-0060-0000-000000000130', '00000000-0000-0055-0000-000000000999', 'c6a295bc-13cf-410c-b410-8275eedd0871', 'present', 'Có mặt tại trường đầy đủ, đúng giờ', '0c870bc5-6c66-4eeb-94b0-12db54763b38', now())
ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, note = EXCLUDED.note, marked_at = now();

-- =========================================================================
-- [K] MẸO TIỆN ÍCH: CÁCH BẠN ĐIỀU CHỈNH TRẠNG THÁI ĐIỂM DANH NHANH TRÊN SQL
-- =========================================================================
-- Cách 1: Đổi tất cả học sinh thành có mặt hôm nay:
-- UPDATE public.attendance_records SET status = 'present', note = 'Có mặt đầy đủ' WHERE session_id = '00000000-0000-0055-0000-000000000999';

-- Cách 2: Đổi 1 học sinh cụ thể (ví dụ em Nguyễn Gia Bảo - HS101) thành vắng:
-- UPDATE public.attendance_records SET status = 'absent', note = 'Vắng' WHERE session_id = '00000000-0000-0055-0000-000000000999' AND student_id = 'e780c1a5-8d4c-4709-a785-6d2d1815150e';
