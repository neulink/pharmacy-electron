# Neulink Pharmacy Desktop App

A cross-platform Electron wrapper for the Neulink Pharmacy web application.

## Features

- Cross-platform desktop application (Windows, macOS, Linux)
- Secure wrapper for https://pharma.neulink.cloud
- Developer tools disabled in production
- Full browser functionality (localStorage, cookies, etc.)
- **Auto-updating capabilities with user prompts**
- **Integrated QZ-Tray for direct printer access**
- Native OS integration
- Automatic update checks every 4 hours
- Manual update checking via application menu
- **Bundled QZ-Tray installers for all platforms**
- **Automatic QZ-Tray startup and management**
- **Remote QZ-Tray download** - no static assets, always latest version
- **Smart caching** - downloads only once per version
- **Download progress** - visual feedback during QZ-Tray setup

## Development

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- Windows, macOS, or Linux operating system

### Setup

```bash
# Clone the repository
git clone https://github.com/neulink/pharmacy-electron.git
cd pharmacy-electron

# Install dependencies
pnpm install

# Run in development mode (with dev tools enabled)
pnpm run dev

# Or run in production mode
pnpm start
```

**Note**: All scripts use `cross-env` for cross-platform compatibility, ensuring they work on Windows, macOS, and Linux.

### Building

```bash
# Build for current platform
pnpm run build

# Build for specific platforms
pnpm run build:win    # Windows
pnpm run build:mac    # macOS
pnpm run build:linux  # Linux

# Create package directory (for testing)
pnpm run pack
```

## Deployment

The application is automatically built and released via GitHub Actions when changes are pushed to the `main` branch. Slack notifications are sent for all build events.

### Release Process

1. Update version in `package.json`
2. Push to `main` branch
3. GitHub Actions will automatically:
   - Send Slack notification about the push
   - Build for Windows, macOS, and Linux
   - Create GitHub release with all platform binaries
   - Upload artifacts as release assets
   - Send Slack notifications for build status (success/failure/cancelled)
   - Send Slack notification when release is created

### Manual Release

You can also trigger a manual release by going to the Actions tab and running the "Build and Release Electron App" workflow.

### Slack Notifications

The workflow sends Slack notifications for:
- **Push events**: When code is pushed to main branch
- **Build status**: Success, failure, or cancellation for each platform
- **Release status**: When releases are created, fail, or are cancelled

All notifications are sent to the configured Slack webhook.

## Security

- Node.js integration is disabled in the renderer process
- Context isolation is enabled
- Developer tools are blocked in production builds
- Right-click context menu disabled in production
- Keyboard shortcuts for dev tools blocked

## Auto-Update Feature

The application includes a built-in auto-updater that:

- **Automatically checks for updates** every 4 hours when the app is running
- **Manual update checking** available via `File` → `Check for Updates` menu
- **User prompts** before downloading any updates - you choose when to install
- **Progress indication** during download with detailed progress bar
- **Release notes access** - view what's new before updating
- **Background downloads** - continue using the app while updates download
- **Safe installation** - app restarts automatically to install updates

### Update Process

1. App checks GitHub releases for newer versions
2. If update found, shows dialog with version info and options:
   - **Download & Install** - Downloads and prompts for restart
   - **Later** - Skip this update check
   - **View Release Notes** - Opens GitHub release page in browser
3. Download progress shown in modal dialog
4. After download, prompts to restart now or later
5. App restarts and update is installed automatically

**Note**: Auto-updates only work in production builds. Development builds skip update checks.

## QZ-Tray Integration

The application includes integrated QZ-Tray support for direct printer access:

### What is QZ-Tray?
QZ-Tray enables web applications to print directly to local printers, bypassing browser limitations. Perfect for:
- **Prescription printing** to thermal/receipt printers
- **Label printing** for medication bottles
- **Direct printer access** without browser print dialogs
- **Multiple printer support** and management

### Automatic Setup
- **Remote Download**: QZ-Tray downloaded directly from GitHub releases
- **Smart Caching**: Downloads only once per version to user data directory
- **Auto-Installation**: QZ-Tray automatically installs when first needed
- **Auto-Startup**: QZ-Tray starts automatically with the pharmacy app
- **Background Management**: QZ-Tray runs silently in the background
- **Progress Feedback**: Visual progress during download and installation

### Manual Controls
Available via application menu:
- **QZ-Tray Status**: Check if QZ-Tray is running and connected
- **Cache Management**: View and clean downloaded QZ-Tray files
- **Restart QZ-Tray**: Manually restart the QZ-Tray service
- **Connection Monitoring**: Real-time status of printer service
- **Version Information**: Current QZ-Tray version and cache details

### Web Integration
The pharmacy web app can access QZ-Tray via:
- **WebSocket Connection**: `ws://localhost:8181`
- **JavaScript API**: Full QZ-Tray printing capabilities
- **Automatic Detection**: App detects QZ-Tray availability
- **Graceful Fallback**: Works with or without QZ-Tray

## Linux Package Information

The Linux builds include proper package metadata:
- **Maintainer**: rishi@neulink.cloud
- **Vendor**: Neulink
- **Category**: Office applications
- **Desktop Integration**: Proper .desktop file with keywords and description

## Project Structure

```
├── main.cjs           # Main Electron process with QZ-Tray integration
├── preload.cjs        # Preload script for security and QZ-Tray API
├── qz-tray-manager.cjs # QZ-Tray lifecycle management
├── package.json       # Project configuration and build settings
├── assets/
│   └── icons/        # Application icons (QZ-Tray now downloaded remotely)
├── .github/
│   └── workflows/
│       └── build-and-release.yml  # CI/CD configuration
└── README.md
```

## License

MIT
