const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { app } = require('electron');
const WebSocket = require('ws');
const https = require('https');

class QZTrayManager {
  constructor() {
    this.qzProcess = null;
    this.qzSocket = null;
    this.isConnected = false;
    this.maxRetries = 10;
    this.retryDelay = 2000; // 2 seconds
    this.installAttempted = false;
    this.qzTrayVersion = '2.2.5'; // Current stable version
    this.downloadTimeout = 300000; // 5 minutes
    
    // QZ-Tray download URLs
    this.downloadUrls = {
      win32: {
        x86_64: `https://github.com/qzind/qz/releases/download/v${this.qzTrayVersion}/qz-tray-${this.qzTrayVersion}-x86_64.exe`,
        arm64: `https://github.com/qzind/qz/releases/download/v${this.qzTrayVersion}/qz-tray-${this.qzTrayVersion}-arm64.exe`
      },
      darwin: {
        arm64: `https://github.com/qzind/qz/releases/download/v${this.qzTrayVersion}/qz-tray-${this.qzTrayVersion}-arm64.pkg`,
        x86_64: `https://github.com/qzind/qz/releases/download/v${this.qzTrayVersion}/qz-tray-${this.qzTrayVersion}-x86_64.pkg`
      },
      linux: {
        x86_64: `https://github.com/qzind/qz/releases/download/v${this.qzTrayVersion}/qz-tray-${this.qzTrayVersion}-x86_64.run`,
        arm64: `https://github.com/qzind/qz/releases/download/v${this.qzTrayVersion}/qz-tray-${this.qzTrayVersion}-arm64.run`,
        riscv64: `https://github.com/qzind/qz/releases/download/v${this.qzTrayVersion}/qz-tray-${this.qzTrayVersion}-riscv64.run`
      }
    };
  }

  /**
   * Get the cache directory for QZ-Tray downloads
   */
  getCacheDirectory() {
    const userDataPath = app.getPath('userData');
    const cacheDir = path.join(userDataPath, 'qz-tray-cache');
    
    // Create cache directory if it doesn't exist
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
    
    return cacheDir;
  }

  /**
   * Get the download URL for the current platform and architecture
   */
  getDownloadUrl() {
    const platform = process.platform;
    const arch = process.arch;
    
    const platformUrls = this.downloadUrls[platform];
    if (!platformUrls) {
      throw new Error(`Unsupported platform: ${platform}`);
    }
    
    let archKey = arch;
    if (platform === 'win32') {
      archKey = arch === 'arm64' ? 'arm64' : 'x86_64';
    } else if (platform === 'darwin') {
      archKey = arch === 'arm64' ? 'arm64' : 'x86_64';
    } else if (platform === 'linux') {
      archKey = arch === 'arm64' ? 'arm64' : arch === 'riscv64' ? 'riscv64' : 'x86_64';
    }
    
    const url = platformUrls[archKey];
    if (!url) {
      throw new Error(`Unsupported architecture: ${arch} for platform: ${platform}`);
    }
    
    return url;
  }

  /**
   * Get the local file path for the downloaded installer
   */
  getLocalInstallerPath() {
    const platform = process.platform;
    const arch = process.arch;
    const cacheDir = this.getCacheDirectory();
    
    let filename;
    if (platform === 'win32') {
      const winArch = arch === 'arm64' ? 'arm64' : 'x86_64';
      filename = `qz-tray-${this.qzTrayVersion}-${winArch}.exe`;
    } else if (platform === 'darwin') {
      const macArch = arch === 'arm64' ? 'arm64' : 'x86_64';
      filename = `qz-tray-${this.qzTrayVersion}-${macArch}.pkg`;
    } else if (platform === 'linux') {
      const linuxArch = arch === 'arm64' ? 'arm64' : arch === 'riscv64' ? 'riscv64' : 'x86_64';
      filename = `qz-tray-${this.qzTrayVersion}-${linuxArch}.run`;
    }
    
    return path.join(cacheDir, filename);
  }

  /**
   * Download QZ-Tray installer with progress callback
   */
  async downloadQZTray(onProgress = null) {
    const url = this.getDownloadUrl();
    const localPath = this.getLocalInstallerPath();
    
    // Check if file already exists and is valid
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      if (stats.size > 0) {
        console.log('QZ-Tray installer already cached:', localPath);
        return localPath;
      }
    }
    
    console.log('Downloading QZ-Tray from:', url);
    console.log('Saving to:', localPath);
    
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(localPath);
      let downloadedBytes = 0;
      let totalBytes = 0;
      
      const request = https.get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 302 || response.statusCode === 301) {
          const redirectUrl = response.headers.location;
          console.log('Following redirect to:', redirectUrl);
          file.close();
          fs.unlinkSync(localPath);
          
          // Recursively follow redirect
          https.get(redirectUrl, (redirectResponse) => {
            handleResponse(redirectResponse);
          }).on('error', reject);
          return;
        }
        
        handleResponse(response);
      });
      
      function handleResponse(response) {
        if (response.statusCode !== 200) {
          file.close();
          fs.unlinkSync(localPath);
          reject(new Error(`Download failed with status: ${response.statusCode}`));
          return;
        }
        
        totalBytes = parseInt(response.headers['content-length'], 10) || 0;
        
        response.on('data', (chunk) => {
          downloadedBytes += chunk.length;
          
          if (onProgress && totalBytes > 0) {
            const percent = Math.round((downloadedBytes / totalBytes) * 100);
            onProgress({
              percent,
              downloadedBytes,
              totalBytes,
              downloadedMB: (downloadedBytes / 1024 / 1024).toFixed(1),
              totalMB: (totalBytes / 1024 / 1024).toFixed(1)
            });
          }
        });
        
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          console.log('QZ-Tray download completed:', localPath);
          resolve(localPath);
        });
      }
      
      request.on('error', (error) => {
        file.close();
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
        reject(error);
      });
      
      // Set download timeout
      request.setTimeout(this.downloadTimeout, () => {
        request.abort();
        file.close();
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
        reject(new Error('Download timeout'));
      });
    });
  }

  /**
   * Get the appropriate QZ-Tray installer path (now uses cache)
   */
  getQZTrayInstallerPath() {
    // Now returns the cached local path
    return this.getLocalInstallerPath();
  }

  /**
   * Check if QZ-Tray is already installed on the system
   */
  async isQZTrayInstalled() {
    return new Promise((resolve) => {
      const platform = process.platform;
      
      if (platform === 'win32') {
        // Check Windows registry or common installation paths
        const commonPaths = [
          path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'QZ Tray'),
          path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'QZ Tray'),
          path.join(os.homedir(), 'AppData', 'Local', 'QZ Tray')
        ];
        
        for (const checkPath of commonPaths) {
          if (fs.existsSync(path.join(checkPath, 'qz-tray.exe'))) {
            resolve(true);
            return;
          }
        }
      } else if (platform === 'darwin') {
        // Check macOS Applications folder
        const appPath = '/Applications/QZ Tray.app';
        if (fs.existsSync(appPath)) {
          resolve(true);
          return;
        }
      } else if (platform === 'linux') {
        // Check for QZ-Tray in common Linux paths
        exec('which qz-tray', (error) => {
          resolve(!error);
          return;
        });
        return;
      }
      
      resolve(false);
    });
  }

  /**
   * Install QZ-Tray silently (now downloads first if needed)
   */
  async installQZTray(onProgress = null) {
    if (this.installAttempted) {
      console.log('QZ-Tray installation already attempted');
      return false;
    }

    this.installAttempted = true;
    
    try {
      // Download QZ-Tray installer first
      console.log('Downloading QZ-Tray installer...');
      const installerPath = await this.downloadQZTray(onProgress);
      
      if (!installerPath || !fs.existsSync(installerPath)) {
        console.error('QZ-Tray installer download failed');
        return false;
      }

      console.log('Installing QZ-Tray from:', installerPath);

      return new Promise((resolve) => {
        const platform = process.platform;
        let installCommand;
        let installArgs = [];

        if (platform === 'win32') {
          // Windows: Silent installation
          installCommand = installerPath;
          installArgs = ['/S']; // Silent install flag for NSIS
        } else if (platform === 'darwin') {
          // macOS: Install package
          installCommand = 'installer';
          installArgs = ['-pkg', installerPath, '-target', '/'];
        } else if (platform === 'linux') {
          // Linux: Make executable and run
          fs.chmodSync(installerPath, '755');
          installCommand = installerPath;
          installArgs = ['--mode', 'unattended'];
        }

        const installProcess = spawn(installCommand, installArgs, {
          stdio: 'ignore',
          detached: true
        });

        installProcess.on('close', (code) => {
          console.log(`QZ-Tray installation finished with code: ${code}`);
          resolve(code === 0);
        });

        installProcess.on('error', (error) => {
          console.error('QZ-Tray installation error:', error);
          resolve(false);
        });

        // Timeout after 60 seconds
        setTimeout(() => {
          installProcess.kill();
          console.error('QZ-Tray installation timed out');
          resolve(false);
        }, 60000);
      });
      
    } catch (error) {
      console.error('Error downloading/installing QZ-Tray:', error);
      return false;
    }
  }

  /**
   * Start QZ-Tray process with optional progress callback
   */
  async startQZTray(onProgress = null) {
    if (this.qzProcess) {
      console.log('QZ-Tray is already running');
      return true;
    }

    // First check if QZ-Tray is installed
    const isInstalled = await this.isQZTrayInstalled();
    
    if (!isInstalled) {
      console.log('QZ-Tray not installed, attempting installation...');
      const installSuccess = await this.installQZTray(onProgress);
      
      if (!installSuccess) {
        console.error('Failed to install QZ-Tray');
        return false;
      }
      
      // Wait a bit for installation to complete
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    return new Promise((resolve) => {
      const platform = process.platform;
      let qzCommand;
      let qzArgs = [];

      if (platform === 'win32') {
        // Windows: Look for QZ-Tray executable
        const commonPaths = [
          path.join(process.env.PROGRAMFILES || 'C:\\Program Files', 'QZ Tray', 'qz-tray.exe'),
          path.join(process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)', 'QZ Tray', 'qz-tray.exe'),
          path.join(os.homedir(), 'AppData', 'Local', 'QZ Tray', 'qz-tray.exe')
        ];
        
        for (const exePath of commonPaths) {
          if (fs.existsSync(exePath)) {
            qzCommand = exePath;
            break;
          }
        }
      } else if (platform === 'darwin') {
        // macOS: Use open command to launch app
        qzCommand = 'open';
        qzArgs = ['-a', 'QZ Tray'];
      } else if (platform === 'linux') {
        // Linux: Try to run qz-tray command
        qzCommand = 'qz-tray';
      }

      if (!qzCommand) {
        console.error('QZ-Tray executable not found');
        resolve(false);
        return;
      }

      console.log('Starting QZ-Tray:', qzCommand, qzArgs);

      this.qzProcess = spawn(qzCommand, qzArgs, {
        stdio: 'ignore',
        detached: true
      });

      this.qzProcess.on('error', (error) => {
        console.error('Failed to start QZ-Tray:', error);
        this.qzProcess = null;
        resolve(false);
      });

      this.qzProcess.on('exit', (code) => {
        console.log('QZ-Tray process exited with code:', code);
        this.qzProcess = null;
        this.isConnected = false;
      });

      // Give QZ-Tray time to start
      setTimeout(() => {
        console.log('QZ-Tray startup initiated');
        resolve(true);
      }, 2000);
    });
  }

  /**
   * Test connection to QZ-Tray WebSocket
   */
  async testConnection() {
    return new Promise((resolve) => {
      try {
        // Test if QZ-Tray WebSocket is available
        const testSocket = new WebSocket('ws://localhost:8181');
        
        testSocket.onopen = () => {
          console.log('QZ-Tray WebSocket connection successful');
          testSocket.close();
          this.isConnected = true;
          resolve(true);
        };

        testSocket.onerror = () => {
          console.log('QZ-Tray WebSocket connection failed');
          this.isConnected = false;
          resolve(false);
        };

        testSocket.onclose = () => {
          // Connection was opened and closed normally
        };

        // Timeout after 5 seconds
        setTimeout(() => {
          if (testSocket.readyState === WebSocket.CONNECTING) {
            testSocket.close();
            resolve(false);
          }
        }, 5000);

      } catch (error) {
        console.error('Error testing QZ-Tray connection:', error);
        resolve(false);
      }
    });
  }

  /**
   * Initialize QZ-Tray with retries and optional progress callback
   */
  async initialize(onProgress = null) {
    console.log('Initializing QZ-Tray...');
    
    // First try to connect to existing QZ-Tray instance
    const connected = await this.testConnection();
    if (connected) {
      console.log('QZ-Tray already running and accessible');
      return true;
    }

    // Start QZ-Tray (which includes download if needed)
    const started = await this.startQZTray(onProgress);
    if (!started) {
      console.error('Failed to start QZ-Tray');
      return false;
    }

    // Retry connection with backoff
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      console.log(`Attempting to connect to QZ-Tray (${attempt}/${this.maxRetries})...`);
      
      await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      
      const connected = await this.testConnection();
      if (connected) {
        console.log('Successfully connected to QZ-Tray');
        return true;
      }
    }

    console.error('Failed to connect to QZ-Tray after all retries');
    return false;
  }

  /**
   * Stop QZ-Tray process
   */
  stop() {
    if (this.qzProcess) {
      console.log('Stopping QZ-Tray process...');
      this.qzProcess.kill();
      this.qzProcess = null;
    }
    this.isConnected = false;
  }

  /**
   * Check for latest QZ-Tray version on GitHub
   */
  async getLatestVersion() {
    return new Promise((resolve) => {
      const options = {
        hostname: 'api.github.com',
        path: '/repos/qzind/qz/releases/latest',
        headers: {
          'User-Agent': 'Neulink-Pharmacy-App'
        }
      };

      const req = https.get(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const release = JSON.parse(data);
            const version = release.tag_name.replace(/^v/, ''); // Remove 'v' prefix
            resolve(version);
          } catch (error) {
            console.error('Error parsing GitHub API response:', error);
            resolve(this.qzTrayVersion); // Fallback to current version
          }
        });
      });

      req.on('error', (error) => {
        console.error('Error checking for latest QZ-Tray version:', error);
        resolve(this.qzTrayVersion); // Fallback to current version
      });

      req.setTimeout(10000, () => {
        req.abort();
        resolve(this.qzTrayVersion); // Fallback to current version
      });
    });
  }

  /**
   * Clean old cached QZ-Tray files
   */
  cleanCache() {
    try {
      const cacheDir = this.getCacheDirectory();
      const files = fs.readdirSync(cacheDir);
      
      for (const file of files) {
        // Keep only the current version, remove older ones
        if (!file.includes(this.qzTrayVersion)) {
          const filePath = path.join(cacheDir, file);
          fs.unlinkSync(filePath);
          console.log('Removed old QZ-Tray cache file:', filePath);
        }
      }
    } catch (error) {
      console.error('Error cleaning QZ-Tray cache:', error);
    }
  }

  /**
   * Get cache status and size
   */
  getCacheInfo() {
    try {
      const cacheDir = this.getCacheDirectory();
      const files = fs.readdirSync(cacheDir);
      let totalSize = 0;
      
      const fileInfo = files.map(file => {
        const filePath = path.join(cacheDir, file);
        const stats = fs.statSync(filePath);
        totalSize += stats.size;
        
        return {
          name: file,
          size: stats.size,
          sizeMB: (stats.size / 1024 / 1024).toFixed(1),
          modified: stats.mtime
        };
      });
      
      return {
        cacheDir,
        files: fileInfo,
        totalSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(1)
      };
    } catch (error) {
      return {
        cacheDir: this.getCacheDirectory(),
        files: [],
        totalSize: 0,
        totalSizeMB: '0.0'
      };
    }
  }

  /**
   * Get connection status with additional info
   */
  getStatus() {
    const cacheInfo = this.getCacheInfo();
    
    return {
      processRunning: !!this.qzProcess,
      connected: this.isConnected,
      version: this.qzTrayVersion,
      cache: cacheInfo,
      installAttempted: this.installAttempted
    };
  }
}

module.exports = QZTrayManager;
