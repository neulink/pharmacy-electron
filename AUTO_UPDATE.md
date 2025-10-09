# Auto-Update Feature Documentation

## Overview

The Neulink Pharmacy Desktop App includes a built-in auto-updater powered by `electron-updater` that automatically checks for and installs updates from GitHub releases.

## How It Works

### Automatic Update Checks
- **Startup Check**: The app checks for updates 5 seconds after startup (production only)
- **Periodic Checks**: Updates are checked every 4 hours while the app is running
- **Manual Checks**: Users can manually check via `File` → `Check for Updates` menu

### Update Process Flow

1. **Update Detection**: App queries GitHub API for new releases
2. **User Notification**: If update found, shows dialog with options:
   - Download & Install
   - Later (skip this check)
   - View Release Notes (opens GitHub page)
3. **Download**: If user accepts, shows progress dialog with:
   - Progress percentage
   - Download speed
   - Size information
4. **Installation**: After download, prompts user to restart
5. **Update Applied**: App restarts and update is installed

### User Experience

- **Non-Intrusive**: Updates never interrupt user workflow
- **User Control**: All downloads require user approval
- **Progress Visibility**: Clear progress indication during downloads
- **Flexible Timing**: User chooses when to install updates

## Technical Implementation

### Configuration

The auto-updater is configured in `package.json`:

```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "neulink",
      "repo": "pharmacy-electron"
    }
  }
}
```

### GitHub Integration

- Updates are distributed via GitHub Releases
- Auto-updater metadata files are automatically generated:
  - `latest.yml` - Windows/Linux update info
  - `latest-mac.yml` - macOS update info

### Security

- Updates are only checked/downloaded from the official GitHub repository
- All update metadata is cryptographically signed by electron-builder
- Downloads are verified before installation

## Development vs Production

- **Development Mode**: Auto-updates are completely disabled
- **Production Mode**: Full auto-update functionality enabled

## Platform Support

### Windows
- Updates distributed as NSIS installers (`.exe`)
- Supports delta updates for smaller downloads
- Automatic elevation for installation if needed

### macOS
- Updates distributed as DMG or ZIP files
- Supports both Intel and Apple Silicon architectures
- Preserves app signing and notarization

### Linux
- Updates distributed as AppImage, DEB, RPM, or TAR.GZ
- AppImage supports auto-updates out of the box
- Package formats may require manual installation

## Files Generated

During build, electron-builder generates these auto-updater files:

- `latest.yml` or `latest-linux.yml` - Update metadata for Windows/Linux
- `latest-mac.yml` - Update metadata for macOS
- Application installers with embedded update capabilities

## GitHub Actions Integration

The CI/CD pipeline automatically:

1. Builds apps with auto-update capability
2. Generates update metadata files
3. Uploads both apps and metadata to GitHub Releases
4. Makes updates discoverable to existing app installations

## Troubleshooting

### Common Issues

1. **Updates Not Found**
   - Check internet connectivity
   - Verify GitHub repository is accessible
   - Ensure running production build (not development)

2. **Download Failures**
   - Check available disk space
   - Verify GitHub release assets are accessible
   - Try manual update check from menu

3. **Installation Failures**
   - Ensure app has write permissions
   - Check if antivirus is blocking installation
   - Try running as administrator (Windows)

### Logs

Auto-updater logs can be found in:
- **Windows**: `%APPDATA%/pharmacy-electron/logs/`
- **macOS**: `~/Library/Logs/pharmacy-electron/`
- **Linux**: `~/.config/pharmacy-electron/logs/`

## Future Enhancements

Potential improvements:
- Delta updates for smaller download sizes
- Background silent updates (with user preference)
- Rollback capability for failed updates
- Custom update channels (beta, stable)
- Code signing for enhanced security

## Support

For auto-update related issues:
1. Check this documentation
2. Review app logs
3. Test manual update check
4. Report issues via GitHub Issues with:
   - Platform and version
   - Error messages
   - Log files (if available)
