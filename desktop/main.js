// KN Studio · โปรแกรม PC (Electron) — ห่อหน้าเว็บเดียวกัน เปิดจากไฟล์ในเครื่อง ใช้ออฟไลน์ได้
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
if (!app.requestSingleInstanceLock()) app.quit();
let win = null;
function create() {
  win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600, backgroundColor: '#0B0B0D',
    title: 'KN Studio', icon: path.join(__dirname, 'icon.png'), show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'app', 'index.html'), { hash: 'home' });
  win.once('ready-to-show', () => { win.maximize(); win.show(); });
  // ลิงก์ภายนอก (ลืมรหัสผ่าน ดาวน์โหลด ฯลฯ) เปิดในเบราว์เซอร์
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (/^https?:/.test(url)) { e.preventDefault(); shell.openExternal(url); } });
  win.webContents.on('before-input-event', (e, i) => { if (i.key === 'F12' && i.control && i.shift) win.webContents.openDevTools(); });
}
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
