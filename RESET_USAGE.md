# Standalone Cursor Reset Tool

A standalone Node.js script that resets Cursor IDE machine IDs and enables Pro features without requiring a web server.

## Features

- **Machine ID Reset** - Generate new UUIDs and update all relevant files
- **Cross-platform support** - Windows, macOS, and Linux
- **Cursor version 1.2.1 support** - Works with latest Cursor IDE version
- **File backup system** - Creates timestamped backups before modifications
- **SQLite database updates** - Updates state.vscdb with new machine IDs
- **Registry updates** (Windows) - Updates Windows registry entries
- **macOS system updates** - Updates macOS platform UUID and keychain
- **Linux system updates** - Updates Linux identity files
- **Workbench patching** - Modifies workbench.desktop.main.js for UI changes
- **Version detection** - Checks Cursor version and applies appropriate patches
- **getMachineId patching** - Patches getMachineId function for version >= 0.45.0
- **Token limit bypass** - Removes restrictions on token usage
- **Pro trial conversion** - Access Pro features without subscription
- **Auto-update prevention** - Stops Cursor from updating

## Usage

### Prerequisites

- Node.js installed
- Administrator/sudo privileges (required for system file modifications)

### Running the Script

```bash
# Windows (run as Administrator)
node reset.js

# macOS/Linux (run with sudo)
sudo node reset.js
```

### What the script does

1. **Detects your platform** (Windows, macOS, or Linux)
2. **Resets Machine ID** - Generates new machine identifiers
3. **Resets Token Limits** - Bypasses AI completion token restrictions
4. **Disables Auto-Updates** - Prevents Cursor from updating
5. **Enables Pro Features** - Activates Pro functionality
6. **Creates Backups** - All modified files are backed up with timestamps

### Output

The script provides detailed logging of all operations:

```
🔄 Starting Cursor Reset Tool...
ℹ️ Platform detected: windows
📋 Step 1: Resetting Machine ID...
✅ Machine ID reset completed
📋 Step 2: Resetting Token Limits...
✅ Token limits reset completed
📋 Step 3: Disabling Auto-Updates...
✅ Auto-updates disabled successfully
📋 Step 4: Enabling Pro Features...
✅ Pro features enabled successfully
🎉 Cursor reset completed successfully!
```

## Important Notes

- **Close Cursor IDE** before running the script
- **Run with administrator privileges** to modify system files
- **Backup important data** before running (script creates automatic backups)
- **Restart Cursor** after running the script for changes to take effect

## File Locations

### Windows
- Machine ID: `%APPDATA%\Cursor\machineId`
- Storage: `%APPDATA%\Cursor\User\globalStorage\storage.json`
- Database: `%APPDATA%\Cursor\User\globalStorage\state.vscdb`

### macOS
- Machine ID: `~/Library/Application Support/Cursor/machineId`
- Storage: `~/Library/Application Support/Cursor/User/globalStorage/storage.json`
- Database: `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb`

### Linux
- Machine ID: `~/.config/Cursor/machineId`
- Storage: `~/.config/Cursor/User/globalStorage/storage.json`
- Database: `~/.config/Cursor/User/globalStorage/state.vscdb`

## Troubleshooting

- **Permission denied**: Run with administrator/sudo privileges
- **Database not found**: Install and run Cursor IDE at least once
- **Script fails**: Check if Cursor is fully closed before running

## Disclaimer

This tool is for educational purposes. Consider supporting Cursor development by purchasing a legitimate license if you find their product valuable.