# KN Studio

โปรแกรมช่วยเขียนแบบเหล็กเสริมและคำนวณตัดเหล็ก (KN-Detail · Bar Cut) ของ KTY Construction

- เว็บ / มือถือ: `https://kong2540.github.io/KN-Studio/` (ต้องออนไลน์)
- ทำงานบนเบราว์เซอร์อย่างเดียว (Chrome / Edge / Safari) · ติดตั้งเป็นแอปจากเบราว์เซอร์ได้ (เมนู ⋮ → ติดตั้งแอป)
- เชื่อม AutoCAD ผ่านไฟล์ DXF: ส่งออก (เลือกรุ่น R12–2018) และนำเข้ากริด เสา คาน จากแบบ AutoCAD
- บัญชีผู้ใช้แยกจาก KTY Hub: สมัคร → ยืนยันอีเมล → แอดมินอนุมัติและกำหนดสิทธิ์

---

## ติดตั้งครั้งแรก (ทำครั้งเดียว)

### 1. Supabase
1. เข้า <https://supabase.com> → **New project** ตั้งชื่อ `kn-studio` เลือก Region **Southeast Asia (Singapore)**
2. **SQL Editor → New query** วางเนื้อหาไฟล์ `supabase/schema.sql` ทั้งหมด แล้วกด **Run**
3. **Authentication → URL Configuration**
   - Site URL: `https://kong2540.github.io/KN-Studio/`
   - Redirect URLs: เพิ่ม `https://kong2540.github.io/KN-Studio/`
4. **Project Settings → API** คัดลอก **Project URL** และ **Publishable key** (anon public) ไปใส่ใน `config.js`
   > ห้ามใส่ `service_role` / secret key ในไฟล์ใด ๆ ของ repo นี้

### 2. GitHub Pages
1. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น repo `KN-Studio` (รวม `.nojekyll`, `vendor`, `supabase`)
2. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main` / `(root)` → Save
3. เปิด `https://kong2540.github.io/KN-Studio/` แล้ว **สมัครด้วย kittiwat.nach@gmail.com**
   บัญชีนี้จะเป็นแอดมินอัตโนมัติ (ยืนยันอีเมลก่อนเข้าสู่ระบบ)

---

## การทำงานของสิทธิ์

| ส่วน | ค่าที่ตั้งได้ |
|---|---|
| KN-Detail · คาน, Bar Cut, ตั้งค่ามาตรฐาน | ไม่เห็น / ดูอย่างเดียว / แก้ไขได้ |
| ส่งออก DXF / ไฟล์ | ได้ / ไม่ได้ |

- แอดมินตั้งสิทธิ์ตั้งต้นของแต่ละบทบาท และปรับรายคนได้ที่ **หน้าแอดมิน**
- แอดมินแก้ช่องข้อมูลในหน้าสมัครสมาชิกได้เอง (เพิ่ม/ลบ/เรียง/บังคับกรอก)
- ข้อมูลโครงการเก็บที่ Supabase ป้องกันด้วย Row Level Security: เห็นเฉพาะโครงการของตัวเองหรือที่ถูกแชร์

## AutoCAD (DXF)
- ส่งออก: แผ่นงานคาน / ทั้งโครงการ / แปลน → เลือกรุ่น AutoCAD ได้ (R12, 2000, 2004, 2007, 2010, 2013, 2018) · ภาษาไทยใช้ฟอนต์ที่ตั้งไว้ (ค่าเริ่มต้น TH Sarabun New)
- นำเข้า: AutoCAD → `SAVEAS` เป็น DXF → KN Studio หน้าแปลน → **นำเข้าจาก AutoCAD (DXF)** → เลือกเลเยอร์กริด / เสา / คาน
- ไฟล์ .dwg เปิดในเบราว์เซอร์ไม่ได้ ต้องบันทึกเป็น .dxf ก่อน

## โครงสร้างไฟล์
```
index.html        แอปหลัก (KN-Detail, Bar Cut, ตั้งค่า)
kn-auth.js        บัญชี สิทธิ์ โครงการ ซิงก์ และหน้าแอดมิน
kn.css            หน้าตาหน้าเข้าสู่ระบบและหน้าแอดมิน
config.js         Supabase URL + publishable key
vendor/supabase.js  supabase-js 2.45.4
supabase/schema.sql ตาราง สิทธิ์ และค่าเริ่มต้น
```
