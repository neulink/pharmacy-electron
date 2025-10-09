const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
    // App information
    getVersion: () => ipcRenderer.invoke('app-version'),
    
    // File system operations
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    
    // Menu events
    onMenuNew: (callback) => ipcRenderer.on('menu-new', callback),
    
    // Platform information
    platform: process.platform,
    
    // QZ-Tray specific helpers for Electron environment
    isElectron: true,
    
    // Printing helpers
    print: () => ipcRenderer.invoke('print-window'),
    
    // Debug helpers for troubleshooting
    getAppPaths: () => ipcRenderer.invoke('get-app-paths'),
    
    // Remove listeners
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel)
});

// Security: Remove any potential Node.js APIs that might leak through
delete window.require;
delete window.exports;
delete window.module;
