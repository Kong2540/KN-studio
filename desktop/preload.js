const { contextBridge } = require('electron');
contextBridge.exposeInMainWorld('knDesktop', { version: process.env.npm_package_version || '', platform: process.platform });
