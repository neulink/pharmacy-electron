const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: process.platform === 'win32' ? {
      color: '#00000000', // Transparent background
      symbolColor: '#666666', // Gray window controls
      height: 40 // Height of the titlebar area
    } : false,
    trafficLightPosition: process.platform === 'darwin' ? { x: 20, y: 15 } : undefined,
    frame: process.platform === 'linux' ? true : undefined, // Keep frame on Linux for better compatibility
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'), // optional, for extra security
      nodeIntegration: false // disable Node.js in renderer for security
    }
  });

  // Load the remote static site
  win.loadURL('https://pharma.neulink.cloud');

  // Add top padding after the page loads to account for transparent titlebar
  win.webContents.once('dom-ready', () => {
    const isLinux = process.platform === 'linux';
    const isDarwin = process.platform === 'darwin';
    const isWin32 = process.platform === 'win32';
    
    // Different padding for different platforms
    const topPadding = isLinux ? '0px' : '40px'; // Linux keeps standard titlebar
    
    const css = `
      body {
        padding-top: ${topPadding} !important;
        box-sizing: border-box !important;
      }
      
      ${!isLinux ? `
      /* Add a subtle draggable area at the top for macOS and Windows */
      body::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 40px;
        background: rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(20px);
        -webkit-backdrop-filter: blur(20px);
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        z-index: 9999;
        -webkit-app-region: drag;
        pointer-events: auto;
      }
      ` : ''}
      
      ${isDarwin ? `
      /* Ensure traffic lights area is not draggable on macOS */
      body::after {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100px;
        height: 40px;
        z-index: 10000;
        -webkit-app-region: no-drag;
        pointer-events: none;
      }
      ` : ''}
      
      ${isWin32 ? `
      /* Add space for Windows controls on the right */
      body::after {
        content: '';
        position: fixed;
        top: 0;
        right: 0;
        width: 140px;
        height: 40px;
        z-index: 10000;
        -webkit-app-region: no-drag;
        pointer-events: none;
      }
      ` : ''}
    `;
    
    win.webContents.insertCSS(css);
  });

  // Only open dev tools in development mode
  if (process.env.NODE_ENV === 'development') {
    win.webContents.openDevTools();
  }

  // Disable right-click context menu in production to prevent dev tools access
  if (process.env.NODE_ENV !== 'development') {
    win.webContents.on('context-menu', (e) => {
      e.preventDefault();
    });
  }

  // Prevent new window creation and dev tools shortcuts
  win.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Block dev tools shortcuts in production
  if (process.env.NODE_ENV !== 'development') {
    win.webContents.on('before-input-event', (event, input) => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (input.key === 'F12' || 
          (input.control && input.shift && input.key === 'I') ||
          (input.control && input.shift && input.key === 'J') ||
          (input.control && input.key === 'U')) {
        event.preventDefault();
      }
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  // macOS convention
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  // macOS convention
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
