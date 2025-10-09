# Neulink Pharmacy Desktop App

A cross-platform Electron wrapper for the Neulink Pharmacy web application.

## Features

- Cross-platform desktop application (Windows, macOS, Linux)
- Secure wrapper for https://pharma.neulink.cloud
- Developer tools disabled in production
- Full browser functionality (localStorage, cookies, etc.)
- Auto-updating capabilities
- Native OS integration

## Development

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

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

The application is automatically built and released via GitHub Actions when changes are pushed to the `main` branch.

### Release Process

1. Update version in `package.json`
2. Push to `main` branch
3. GitHub Actions will automatically:
   - Build for Windows, macOS, and Linux
   - Create GitHub release with all platform binaries
   - Upload artifacts as release assets

### Manual Release

You can also trigger a manual release by going to the Actions tab and running the "Build and Release Electron App" workflow.

## Security

- Node.js integration is disabled in the renderer process
- Context isolation is enabled
- Developer tools are blocked in production builds
- Right-click context menu disabled in production
- Keyboard shortcuts for dev tools blocked

## Project Structure

```
├── main.cjs           # Main Electron process
├── preload.cjs        # Preload script for security
├── package.json       # Project configuration and build settings
├── .github/
│   └── workflows/
│       └── build-and-release.yml  # CI/CD configuration
└── README.md
```

## License

MIT
