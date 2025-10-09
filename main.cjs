const { app, BrowserWindow, dialog, shell, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const QZTrayManager = require('./qz-tray-manager.cjs');

// Initialize QZ-Tray manager
const qzTrayManager = new QZTrayManager();

// IPC handlers for QZ-Tray
ipcMain.handle('qz-tray-status', () => {
  return qzTrayManager.getStatus();
});

ipcMain.handle('qz-tray-restart', async () => {
  qzTrayManager.stop();
  await new Promise(resolve => setTimeout(resolve, 1000));
  return await qzTrayManager.initialize();
});

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify = false; // We want manual control
autoUpdater.autoDownload = false; // Don't auto-download, ask user first

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info.version);
  
  const response = dialog.showMessageBoxSync(null, {
    type: 'info',
    title: 'Update Available',
    message: `A new version (${info.version}) is available!`,
    detail: 'Would you like to download and install the update? The application will restart after installation.',
    buttons: ['Download & Install', 'Later', 'View Release Notes'],
    defaultId: 0,
    cancelId: 1
  });

  if (response === 0) {
    // User chose to download and install
    autoUpdater.downloadUpdate();
    
    // Show progress dialog
    const progressDialog = new BrowserWindow({
      width: 400,
      height: 200,
      parent: BrowserWindow.getAllWindows()[0],
      modal: true,
      show: false,
      resizable: false,
      title: 'Downloading Update...',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });

    progressDialog.loadHTML(`
      <html>
        <head>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 30px;
              text-align: center;
              background: #f5f5f5;
            }
            .progress-container {
              width: 100%;
              height: 20px;
              background: #ddd;
              border-radius: 10px;
              margin: 20px 0;
              overflow: hidden;
            }
            .progress-bar {
              height: 100%;
              background: #4CAF50;
              width: 0%;
              border-radius: 10px;
              transition: width 0.3s ease;
            }
            .status { color: #666; margin-top: 10px; }
          </style>
        </head>
        <body>
          <h3>Downloading Update...</h3>
          <div class="progress-container">
            <div class="progress-bar" id="progress"></div>
          </div>
          <div class="status" id="status">Preparing download...</div>
        </body>
      </html>
    `);
    
    progressDialog.show();

    // Update progress
    autoUpdater.on('download-progress', (progressObj) => {
      const percent = Math.round(progressObj.percent);
      progressDialog.webContents.executeJavaScript(`
        document.getElementById('progress').style.width = '${percent}%';
        document.getElementById('status').textContent = 'Downloaded ${percent}% (${Math.round(progressObj.transferred / 1024 / 1024)} MB / ${Math.round(progressObj.total / 1024 / 1024)} MB)';
      `);
    });

    autoUpdater.on('update-downloaded', () => {
      progressDialog.close();
      
      const restartResponse = dialog.showMessageBoxSync(null, {
        type: 'info',
        title: 'Update Downloaded',
        message: 'Update has been downloaded successfully!',
        detail: 'The application will now restart to install the update.',
        buttons: ['Restart Now', 'Restart Later'],
        defaultId: 0
      });

      if (restartResponse === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  } else if (response === 2) {
    // User chose to view release notes
    shell.openExternal(`https://github.com/neulink/pharmacy-electron/releases/tag/v${info.version}`);
  }
});

autoUpdater.on('update-not-available', () => {
  console.log('Update not available.');
});

autoUpdater.on('error', (err) => {
  console.error('Error in auto-updater:', err);
  dialog.showErrorBox('Update Error', `An error occurred while checking for updates: ${err.message}`);
});

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
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
  mainWindow.loadURL('https://pharma.neulink.cloud');

  // Add top padding after the page loads to account for transparent titlebar
  mainWindow.webContents.once('dom-ready', () => {
    const isLinux = process.platform === 'linux';
    const isDarwin = process.platform === 'darwin';
    const isWin32 = process.platform === 'win32';
    
    // All platforms except Linux get padding for titlebar
    const topPadding = isLinux ? '0px' : '40px';
    
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
      /* Add space for Windows controls on the right and ensure proper padding */
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
      
      /* Ensure Windows gets proper spacing from window controls */
      body {
        margin-top: 0px !important;
        min-height: calc(100vh - 40px) !important;
      }
      
      /* Add extra safety margin for Windows titlebar overlay */
      html {
        padding-top: 5px !important;
      }
      
      /* Prevent content from going under Windows titlebar overlay */
      * {
        margin-top: 0 !important;
      }
      
      /* Specific rule for main content containers */
      main, .main, #main, .app, #app, .container, #container {
        padding-top: 10px !important;
      }
      ` : ''}
    `;
    
    mainWindow.webContents.insertCSS(css);
  });

  // Only open dev tools in development mode
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Disable right-click context menu in production to prevent dev tools access
  if (process.env.NODE_ENV !== 'development') {
    mainWindow.webContents.on('context-menu', (e) => {
      e.preventDefault();
    });
  }

  // Prevent new window creation and dev tools shortcuts
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Block dev tools shortcuts in production
  if (process.env.NODE_ENV !== 'development') {
    mainWindow.webContents.on('before-input-event', (event, input) => {
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

app.whenReady().then(() => {
  createWindow();
  
  // Create application menu
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => {
            autoUpdater.checkForUpdates();
          }
        },
        { type: 'separator' },
        {
          label: 'QZ-Tray Status',
          click: () => {
            const status = qzTrayManager.getStatus();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'QZ-Tray Status',
              message: `Process Running: ${status.processRunning ? 'Yes' : 'No'}\nWebSocket Connected: ${status.connected ? 'Yes' : 'No'}`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Restart QZ-Tray',
          click: async () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Restarting QZ-Tray',
              message: 'Restarting QZ-Tray service...',
              buttons: ['OK']
            });
            
            qzTrayManager.stop();
            setTimeout(async () => {
              const success = await qzTrayManager.initialize();
              dialog.showMessageBox(mainWindow, {
                type: success ? 'info' : 'error',
                title: 'QZ-Tray Restart',
                message: success ? 'QZ-Tray restarted successfully!' : 'Failed to restart QZ-Tray',
                buttons: ['OK']
              });
            }, 1000);
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { label: 'About ' + app.getName(), role: 'about' },
        { type: 'separator' },
        {
          label: 'Check for Updates...',
          click: () => {
            autoUpdater.checkForUpdates();
          }
        },
        { type: 'separator' },
        {
          label: 'QZ-Tray Status',
          click: () => {
            const status = qzTrayManager.getStatus();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'QZ-Tray Status',
              message: `Process Running: ${status.processRunning ? 'Yes' : 'No'}\nWebSocket Connected: ${status.connected ? 'Yes' : 'No'}`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'Restart QZ-Tray',
          click: async () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Restarting QZ-Tray',
              message: 'Restarting QZ-Tray service...',
              buttons: ['OK']
            });
            
            qzTrayManager.stop();
            setTimeout(async () => {
              const success = await qzTrayManager.initialize();
              dialog.showMessageBox(mainWindow, {
                type: success ? 'info' : 'error',
                title: 'QZ-Tray Restart',
                message: success ? 'QZ-Tray restarted successfully!' : 'Failed to restart QZ-Tray',
                buttons: ['OK']
              });
            }, 1000);
          }
        },
        { type: 'separator' },
        { label: 'Services', role: 'services', submenu: [] },
        { type: 'separator' },
        { label: 'Hide ' + app.getName(), accelerator: 'Command+H', role: 'hide' },
        { label: 'Hide Others', accelerator: 'Command+Shift+H', role: 'hideothers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Command+Q', click: () => app.quit() }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
  
  // Initialize QZ-Tray
  console.log('Starting QZ-Tray initialization...');
  
  // Create progress window for QZ-Tray download if needed
  let progressWindow = null;
  
  const showDownloadProgress = (progress) => {
    if (!progressWindow) {
      progressWindow = new BrowserWindow({
        width: 400,
        height: 200,
        parent: mainWindow,
        modal: true,
        show: true,
        resizable: false,
        title: 'Downloading QZ-Tray...',
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false
        }
      });

      progressWindow.loadHTML(`
        <html>
          <head>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                padding: 30px;
                text-align: center;
                background: #f5f5f5;
                margin: 0;
              }
              .progress-container {
                width: 100%;
                height: 20px;
                background: #ddd;
                border-radius: 10px;
                margin: 20px 0;
                overflow: hidden;
              }
              .progress-bar {
                height: 100%;
                background: #4CAF50;
                width: 0%;
                border-radius: 10px;
                transition: width 0.3s ease;
              }
              .status { 
                color: #666; 
                margin-top: 10px; 
                font-size: 14px;
              }
              h3 {
                margin-top: 0;
                color: #333;
              }
            </style>
          </head>
          <body>
            <h3>🖨️ Setting up QZ-Tray</h3>
            <p>Downloading printer support...</p>
            <div class="progress-container">
              <div class="progress-bar" id="progress"></div>
            </div>
            <div class="status" id="status">Preparing download...</div>
          </body>
        </html>
      `);
    }

    if (progress && progressWindow && !progressWindow.isDestroyed()) {
      progressWindow.webContents.executeJavaScript(`
        document.getElementById('progress').style.width = '${progress.percent}%';
        document.getElementById('status').textContent = 'Downloaded ${progress.downloadedMB} MB / ${progress.totalMB} MB (${progress.percent}%)';
      `);
    }
  };
  
  qzTrayManager.initialize(showDownloadProgress).then(success => {
    if (progressWindow && !progressWindow.isDestroyed()) {
      progressWindow.close();
      progressWindow = null;
    }
    
    if (success) {
      console.log('QZ-Tray initialized successfully');
    } else {
      console.warn('QZ-Tray initialization failed - printing features may not be available');
    }
  }).catch(error => {
    if (progressWindow && !progressWindow.isDestroyed()) {
      progressWindow.close();
      progressWindow = null;
    }
    console.error('QZ-Tray initialization error:', error);
  });
  
  // Check for updates after app is ready (only in production)
  if (process.env.NODE_ENV !== 'development') {
    // Check for updates 5 seconds after startup
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 5000);
    
    // Also check for updates every 4 hours
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 4 * 60 * 60 * 1000); // 4 hours in milliseconds
  }
});

app.on('window-all-closed', () => {
  // macOS convention
  if (process.platform !== 'darwin') {
    // Stop QZ-Tray when app closes
    qzTrayManager.stop();
    app.quit();
  }
});

app.on('before-quit', () => {
  // Stop QZ-Tray when app is about to quit
  qzTrayManager.stop();
});

app.on('activate', () => {
  // macOS convention
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
