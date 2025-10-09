# QZ-Tray Integration Guide (Remote Download Version)

## Overview

This document describes the enhanced QZ-Tray integration in the Neulink Pharmacy Desktop App, featuring **remote download capabilities** that eliminate the need for bundled installers while ensuring users always get the latest QZ-Tray version.

## Key Features

### Remote Download System
- **No Bundled Files**: QZ-Tray installers are downloaded on-demand from GitHub
- **Always Latest**: Automatically fetches the current stable version (2.2.5+)
- **Smart Caching**: Downloads only once per version to user data directory
- **Smaller Installers**: Reduces app installer size by ~150MB
- **Platform Detection**: Automatically selects correct architecture and format

### Enhanced User Experience
- **Progress Feedback**: Visual progress during download with percentage and size info
- **Background Downloads**: Non-blocking downloads with progress dialog
- **Cache Management**: Users can view and clean cached QZ-Tray files
- **Version Tracking**: Displays current QZ-Tray version and cache status

## What is QZ-Tray?

QZ-Tray is a cross-platform print server that runs in the system tray, allowing web applications to print directly to local printers without browser limitations. It's essential for pharmacy applications that need to:

- Print prescriptions to thermal printers
- Print medication labels 
- Print receipts and invoices
- Access multiple printers simultaneously
- Bypass browser print dialogs

## Integration Architecture

```
┌─────────────────────┐    Auto-launch    ┌─────────────────────┐
│   Pharmacy Electron │ ────────────────→ │      QZ-Tray        │
│        App          │                   │   (Print Server)    │
│                     │    WebSocket      │                     │
│  ┌───────────────┐  │ ←─────────────────→ │     localhost:8181   │
│  │  Web Content  │  │                   │                     │
│  │ (pharma.neulink)│  │                   └─────────────────────┘
│  └───────────────┘  │                             │
└─────────────────────┘                             │
                                                    ▼
                                         ┌─────────────────────┐
                                         │   Local Printers    │
                                         │  • Thermal Printers │
                                         │  • Label Printers   │
                                         │  • Receipt Printers │
                                         │  • Standard Printers│
                                         └─────────────────────┘
```

## Files and Components

### Core Files

1. **`qz-tray-manager.cjs`** - Main QZ-Tray lifecycle management
2. **`main.cjs`** - Electron main process with QZ-Tray integration
3. **`preload.cjs`** - Secure API bridge for web content

### Bundled Installers → Remote Downloads

**Old System** (Bundled):
- QZ-Tray installers included in app bundle
- Large installer size (~150MB+ extra)
- Manual updates required for new QZ-Tray versions
- Multiple architecture files bundled

**New System** (Remote):
- QZ-Tray downloaded from `https://github.com/qzind/qz/releases/`
- Minimal app installer size
- Always latest QZ-Tray version
- Platform-specific downloads only

### Download URLs

The system fetches QZ-Tray from official GitHub releases:

**Windows**: 
- `qz-tray-2.2.5-x86_64.exe` (Intel/AMD)
- `qz-tray-2.2.5-arm64.exe` (ARM64)

**macOS**:
- `qz-tray-2.2.5-arm64.pkg` (Apple Silicon)  
- `qz-tray-2.2.5-x86_64.pkg` (Intel)

**Linux**:
- `qz-tray-2.2.5-x86_64.run` (Intel/AMD)
- `qz-tray-2.2.5-arm64.run` (ARM64)
- `qz-tray-2.2.5-riscv64.run` (RISC-V)

### Cache Management

Downloaded files are stored in:
- **Windows**: `%APPDATA%/pharmacy-electron/qz-tray-cache/`
- **macOS**: `~/Library/Application Support/pharmacy-electron/qz-tray-cache/`
- **Linux**: `~/.config/pharmacy-electron/qz-tray-cache/`

## QZ-Tray Manager Features

### Automatic Installation
- Detects if QZ-Tray is already installed
- Silently installs appropriate version for platform/architecture
- Handles installation errors gracefully

### Process Management
- Starts QZ-Tray automatically with the main app
- Monitors QZ-Tray process health
- Restarts QZ-Tray if needed
- Cleans up processes on app exit

### Connection Management
- Tests WebSocket connectivity on `localhost:8181`
- Implements retry logic with exponential backoff
- Provides connection status to the UI

### Platform-Specific Handling

#### Windows
- Uses NSIS installers with silent install (`/S`)
- Searches common installation paths
- Supports both x86_64 and ARM64 architectures

#### macOS
- Uses PKG installers with `installer` command
- Launches via `open -a "QZ Tray"`
- Currently supports ARM64 architecture

#### Linux
- Uses self-extracting `.run` installers
- Marks installers as executable automatically
- Supports multiple architectures (x86_64, ARM64, RISC-V)

## User Interface Integration

### Application Menu

The app menu includes QZ-Tray controls:

#### File Menu (Windows/Linux)
- **QZ-Tray Status** - Shows current status
- **Restart QZ-Tray** - Manually restart service

#### App Menu (macOS)
- Same QZ-Tray controls in the application menu

### Status Information

Status dialog shows:
- **Process Running**: Whether QZ-Tray process is active
- **WebSocket Connected**: Whether WebSocket connection is established

## Web Content Integration

### Preload API

The preload script exposes QZ-Tray functionality:

```javascript
// Available in web content via window.electronAPI
{
  getQZTrayStatus: () => Promise<{processRunning: boolean, connected: boolean}>,
  restartQZTray: () => Promise<boolean>,
  qzTray: {
    websocketUrl: 'ws://localhost:8181',
    isAvailable: true
  }
}
```

### JavaScript Usage

Web content can interact with QZ-Tray:

```javascript
// Check if running in Electron with QZ-Tray
if (window.electronAPI && window.electronAPI.isElectron) {
  // Get QZ-Tray status
  const status = await window.electronAPI.getQZTrayStatus();
  
  // Connect to QZ-Tray
  const socket = new WebSocket(window.electronAPI.qzTray.websocketUrl);
  
  // Use QZ-Tray printing API
  socket.onopen = () => {
    // QZ-Tray is ready for printing commands
  };
}
```

## Startup Sequence

1. **App Launch**: Electron app starts
2. **QZ-Tray Check**: Manager checks if QZ-Tray is installed
3. **Installation**: If not installed, silently installs QZ-Tray
4. **Launch**: Starts QZ-Tray process
5. **Connection**: Establishes WebSocket connection
6. **Ready**: Printing functionality available to web content

## Error Handling

### Installation Failures
- Logs error details
- Continues app startup without QZ-Tray
- Shows user-friendly error messages

### Connection Failures
- Implements retry logic (10 attempts with 2-second delays)
- Graceful degradation - app works without printing
- Manual restart option available

### Process Crashes
- Detects when QZ-Tray process exits
- Provides restart functionality
- Maintains connection status

## Configuration

### Installation Paths

#### Windows
- `C:\Program Files\QZ Tray\`
- `C:\Program Files (x86)\QZ Tray\`
- `%USERPROFILE%\AppData\Local\QZ Tray\`

#### macOS
- `/Applications/QZ Tray.app`

#### Linux
- System PATH (accessible via `qz-tray` command)

### WebSocket Configuration
- **Port**: 8181 (QZ-Tray default)
- **Protocol**: WebSocket (ws://)
- **Host**: localhost only (security)

## Security Considerations

### Network Security
- QZ-Tray only accessible via localhost
- No external network exposure
- WebSocket connections from same machine only

### Installation Security
- Installers bundled with app (no downloads)
- Silent installation without user interaction
- Proper cleanup on uninstall

### Process Isolation
- QZ-Tray runs as separate process
- No elevated privileges required for normal operation
- Clean separation between app and print server

## Troubleshooting

### Common Issues

1. **QZ-Tray Not Starting**
   - Check if antivirus is blocking installation
   - Verify installer files are present in assets
   - Try manual restart from menu

2. **Connection Failures**
   - Ensure no firewall blocking localhost:8181
   - Check if another application is using port 8181
   - Verify QZ-Tray process is actually running

3. **Platform-Specific Issues**
   - **Windows**: May need to run as administrator for installation
   - **macOS**: Installer may require admin password
   - **Linux**: Ensure execute permissions on .run files

### Debugging

Enable debug logging by setting environment variable:
```bash
DEBUG=qz-tray npm start
```

Check system logs:
- **Windows**: Event Viewer
- **macOS**: Console.app
- **Linux**: journalctl or syslog

### Manual Testing

Test QZ-Tray connection manually:
```javascript
// In browser console
const ws = new WebSocket('ws://localhost:8181');
ws.onopen = () => console.log('QZ-Tray connected');
ws.onerror = () => console.log('QZ-Tray connection failed');
```

## Performance Considerations

### Startup Impact
- QZ-Tray adds ~2-5 seconds to app startup
- Installation (first run) adds 30-60 seconds
- Connection attempts have 20-second timeout

### Memory Usage
- QZ-Tray process: ~50-100MB RAM
- Minimal impact on main app performance
- WebSocket connections are lightweight

### Disk Space
- QZ-Tray installation: ~50MB
- Bundled installers: ~150MB total
- Log files: minimal (< 10MB)

## Future Enhancements

### Planned Features
- **Certificate Management**: Auto-install QZ-Tray certificates
- **Printer Discovery**: Automatic printer detection and setup
- **Print Queue Management**: Advanced queue monitoring
- **Custom Print Templates**: Pre-configured pharmacy templates

### Version Updates
- Automatic QZ-Tray version updates
- Compatibility checking between app and QZ-Tray versions
- Migration support for QZ-Tray settings

## Support and Maintenance

### Regular Maintenance
- Monitor QZ-Tray version releases
- Test with new printer drivers
- Update bundled installers as needed

### User Support
- Include QZ-Tray status in support tickets
- Provide QZ-Tray logs for troubleshooting
- Document printer-specific configurations

For additional support, refer to:
- QZ-Tray official documentation
- Pharmacy app troubleshooting guide
- Platform-specific installation guides
