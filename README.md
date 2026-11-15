# KN Studio

โปรแกรมช่วยเขียนแบบเหล็กเสริมและคำนวณตัดเหล็ก (KN-Detail · Bar Cut) ของ KTY Construction

- เว็บ / มือถือ: `https://kong2540.github.io/KN-Studio/` (ต้องออนไลน์)
- โปรแกรม PC: ไฟล์ `.exe` ในหน้า Releases (ใช้ออฟไลน์ได้ตามจำนวนวันที่แอดมินตั้ง)
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
1. อัปโหลดไฟล์ทั้งหมดในโฟลเดอร์นี้ขึ้น repo `KN-Studio` (รวม `.github`, `.nojekyll`, `vendor`, `supabase`, `desktop`)
2. **Settings → Pages** → Source: *Deploy from a branch* → Branch `main` / `(root)` → Save
3. เปิด `https://kong2540.github.io/KN-Studio/` แล้ว **สมัครด้วย kittiwat.nach@gmail.com**
   บัญชีนี้จะเป็นแอดมินอัตโนมัติ (ยืนยันอีเมลก่อนเข้าสู่ระบบ)

### 3. โปรแกรม PC (.exe)
1. แท็บ **Actions** → **Build KN Studio for Windows** → **Run workflow**
2. รอประมาณ 5–8 นาที ไฟล์จะขึ้นในหน้า **Releases**
   - `KN-Studio-Setup-x.y.z.exe` ตัวติดตั้ง
   - `KN-Studio-Portable-x.y.z.exe` ไม่ต้องติดตั้ง
3. ทุกครั้งที่แก้โปรแกรม กด Run workflow ใหม่ หรือ push แท็ก เช่น `v0.9.1`

> ไฟล์ .exe ยังไม่มี Code signing Windows จะขึ้น SmartScreen ตอนเปิดครั้งแรก → **More info → Run anyway**

---

## การทำงานของสิทธิ์

| ส่วน | ค่าที่ตั้งได้ |
|---|---|
| KN-Detail · คาน, Bar Cut, ตั้งค่ามาตรฐาน | ไม่เห็น / ดูอย่างเดียว / แก้ไขได้ |
| ส่งออก DXF / ไฟล์ | ได้ / ไม่ได้ |
| ดาวน์โหลดและใช้โปรแกรม PC | ได้ / ไม่ได้ |

- แอดมินตั้งสิทธิ์ตั้งต้นของแต่ละบทบาท และปรับรายคนได้ที่ **หน้าแอดมิน**
- แอดมินแก้ช่องข้อมูลในหน้าสมัครสมาชิกได้เอง (เพิ่ม/ลบ/เรียง/บังคับกรอก)
- ข้อมูลโครงการเก็บที่ Supabase ป้องกันด้วย Row Level Security: เห็นเฉพาะโครงการของตัวเองหรือที่ถูกแชร์

## ออฟไลน์ (เฉพาะโปรแกรม PC)
- ต้องล็อกอินออนไลน์อย่างน้อย 1 ครั้งในเครื่องนั้น
- ใช้ออฟไลน์ได้ต่อเนื่องตามจำนวนวันที่แอดมินตั้ง (หน้าแอดมิน → ระบบ) นับจากครั้งล่าสุดที่ตรวจสิทธิ์ออนไลน์
- งานที่แก้ตอนออฟไลน์เก็บในเครื่อง และซิงก์ขึ้นเซิร์ฟเวอร์อัตโนมัติเมื่อกลับมาออนไลน์ (ฉบับที่แก้ล่าสุดชนะ)

## โครงสร้างไฟล์
```
index.html        แอปหลัก (KN-Detail, Bar Cut, ตั้งค่า)
kn-auth.js        บัญชี สิทธิ์ โครงการ ซิงก์ และหน้าแอดมิน
kn.css            หน้าตาหน้าเข้าสู่ระบบและหน้าแอดมิน
config.js         Supabase URL + publishable key
vendor/supabase.js  supabase-js 2.45.4 (เก็บในเครื่องเพื่อให้ .exe ใช้ออฟไลน์ได้)
supabase/schema.sql ตาราง สิทธิ์ และค่าเริ่มต้น
desktop/          Electron สำหรับสร้าง .exe
.github/workflows/desktop.yml  สร้าง .exe อัตโนมัติ
```
