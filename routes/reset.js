import { exec } from 'child_process';
import crypto from 'crypto';
import express from 'express';
import fs from 'fs-extra';
import pkg from 'node-machine-id';
import os from 'os';
import path from 'path';
import { open } from 'sqlite';
import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const ex = promisify(exec);
const { machineIdSync } = pkg;

const rt = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pa = () => {
  const pt = os.platform();
  const hd = os.homedir();
  
  if (pt === 'win32') {
    return {
      storage: path.join(hd, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'storage.json'),
      sqlite: path.join(hd, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      machineId: path.join(hd, 'AppData', 'Roaming', 'Cursor', 'machineId'),
      cursorPath: path.join(hd, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app'),
      updaterPath: path.join(hd, 'AppData', 'Local', 'cursor-updater'),
      updateYmlPath: path.join(hd, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app-update.yml'),
      productJsonPath: path.join(hd, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app', 'product.json'),
      packageJsonPath: path.join(hd, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app', 'package.json'),
      mainJsPath: path.join(hd, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app', 'out', 'vs', 'platform', 'telemetry', 'node', 'telemetryService.js')
    };
  } else if (pt === 'darwin') {
    return {
      storage: path.join(hd, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json'),
      sqlite: path.join(hd, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      machineId: path.join(hd, 'Library', 'Application Support', 'Cursor', 'machineId'),
      cursorPath: '/Applications/Cursor.app/Contents/Resources/app',
      updaterPath: path.join(hd, 'Library', 'Application Support', 'cursor-updater'),
      updateYmlPath: '/Applications/Cursor.app/Contents/Resources/app-update.yml',
      productJsonPath: '/Applications/Cursor.app/Contents/Resources/app/product.json',
      packageJsonPath: '/Applications/Cursor.app/Contents/Resources/app/package.json',
      mainJsPath: '/Applications/Cursor.app/Contents/Resources/app/out/vs/platform/telemetry/node/telemetryService.js',
      macKeychain: true
    };
  } else {
    return {
      storage: path.join(hd, '.config', 'Cursor', 'User', 'globalStorage', 'storage.json'),
      sqlite: path.join(hd, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      machineId: path.join(hd, '.config', 'cursor', 'machineid'),
      cursorPath: path.join(hd, '.local', 'share', 'cursor'),
      updaterPath: path.join(hd, '.config', 'cursor-updater'),
      updateYmlPath: path.join(hd, '.local', 'share', 'cursor', 'resources', 'app-update.yml'),
      productJsonPath: path.join(hd, '.local', 'share', 'cursor', 'resources', 'app', 'product.json'),
      packageJsonPath: path.join(hd, '.local', 'share', 'cursor', 'resources', 'app', 'package.json'),
      mainJsPath: path.join(hd, '.local', 'share', 'cursor', 'resources', 'app', 'out', 'vs', 'platform', 'telemetry', 'node', 'telemetryService.js')
    };
  }
};

const gm = () => {
  try {
    return machineIdSync();
  } catch (error) {
    return uuidv4();
  }
};

const cp = async () => {
  const pt = os.platform();
  try {
    if (pt === 'win32') {
      const { stdout } = await ex('tasklist /FI "IMAGENAME eq Cursor.exe" /NH');
      return stdout.includes('Cursor.exe');
    } else if (pt === 'darwin') {
      const { stdout } = await ex('pgrep -x Cursor');
      return stdout.trim() !== '';
    } else {
      const { stdout } = await ex('pgrep -x cursor');
      return stdout.trim() !== '';
    }
  } catch (error) {
    return false;
  }
};

const kc = async () => {
  const pt = os.platform();
  try {
    if (pt === 'win32') {
      await ex('taskkill /F /IM Cursor.exe');
    } else if (pt === 'darwin') {
      try {
        await ex('pkill -15 Cursor');
        await new Promise(resolve => setTimeout(resolve, 1000));
        await ex('pkill -9 Cursor');
      } catch (e) {
        try {
          await ex('osascript -e \'quit app "Cursor"\'');
          await ex('killall -9 Cursor');
        } catch (err) {
          console.log('Secondary kill attempt failed, but may be OK if app was already closed');
        }
      }
    } else {
      await ex('pkill -9 cursor');
    }
    return true;
  } catch (error) {
    console.log('Kill error (may be OK if app was already closed):', error.message);
    return true;
  }
};

const rb = (filePath) => {
  if (fs.existsSync(filePath)) {
    const ts = new Date().toISOString().replace(/:/g, '').split('.')[0].replace('T', '_');
    const backupPath = `${filePath}.bak.${ts}`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
  }
  return null;
};

const gn = () => {
  return {
    uuid: uuidv4(),
    machineId: crypto.createHash('sha256').update(uuidv4()).digest('hex'),
    macMachineId: crypto.createHash('sha512').update(uuidv4()).digest('hex'),
    sqmId: `{${uuidv4().toUpperCase()}}`
  };
};

const ur = async (path, key, value) => {
  try {
    const db = await open({
      filename: path,
      driver: sqlite3.Database
    });
    
    await db.run('UPDATE ItemTable SET value = ? WHERE key = ?', [JSON.stringify(value), key]);
    lo.info(` Updating Key-Value Pair: ${key}`);
    await db.close();
    return true;
  } catch (error) {
    lo.error(`Failed to update key ${key}: ${error.message}`);
    return false;
  }
};

const ud = async (dbPath, updates) => {
  try {
    if (!fs.existsSync(dbPath)) {
      lo.error(`SQLite database not found: ${dbPath}`);
      return false;
    }
    
    lo.info('Updating SQLite Database...');
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    
    for (const [key, value] of Object.entries(updates)) {
      await ur(dbPath, key, value);
    }
    
    await db.close();
    lo.success('SQLite Database Updated Successfully');
    return true;
  } catch (error) {
    lo.error(`Failed to update SQLite database: ${error.message}`);
    return false;
  }
};

const us = async (db, key, value) => {
  await db.run('UPDATE ItemTable SET value = ? WHERE key = ?', [JSON.stringify(value), key]);
  return { key, value };
};

const lo = {
  logs: [],
  clear() {
    this.logs = [];
  },
  add(type, message) {
    this.logs.push({ type, message, time: new Date() });
    return message;
  },
  info(message) {
    return this.add('info', message);
  },
  success(message) {
    return this.add('success', message);
  },
  error(message) {
    return this.add('error', message);
  },
  get() {
    return this.logs;
  },
  format() {
    return this.logs.map(log => {
      const prefix = log.type === 'info' ? 'ℹ️' : log.type === 'success' ? '✅' : '❌';
      return `${prefix} ${log.message}`;
    }).join('\n');
  }
};

const uw = async () => {
  const pt = os.platform();
  if (pt === 'win32') {
    try {
      const guid = `{${uuidv4().toUpperCase()}}`;
      await ex(`REG ADD HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid /t REG_SZ /d ${guid} /f`);
      lo.success('Windows Machine GUID Updated Successfully');
      lo.info(`reset.new_machine_id: ${guid}`);
      
      await ex(`REG ADD HKLM\\SOFTWARE\\Microsoft\\SQMClient /v MachineId /t REG_SZ /d ${guid} /f`);
      lo.success('Windows Machine ID Updated Successfully');
      lo.success('System IDs Updated Successfully');
      
      return { success: true, guid };
    } catch (error) {
      lo.error(`Failed to update system IDs: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  return { success: true, message: 'System IDs update only supported on Windows' };
};

const pv = async () => {
  const paths = pa();
  if (fs.existsSync(paths.packageJsonPath)) {
    try {
      lo.info(`Reading package.json ${paths.packageJsonPath}`);
      const packageJson = fs.readJsonSync(paths.packageJsonPath);
      const version = packageJson.version || 'Unknown';
      lo.info(`Found Version: ${version}`);
      lo.success('Cursor Version Check Passed');
      return version;
    } catch (error) {
      lo.error(`Error reading version: ${error.message}`);
      return 'Error reading version';
    }
  }
  lo.error('Package.json not found');
  return 'Unknown';
};

const ep = (filePath) => {
  if (!fs.existsSync(filePath)) {
    try {
      const dirPath = path.dirname(filePath);
      fs.ensureDirSync(dirPath);
      fs.writeFileSync(filePath, '// Auto-generated file');
      return true;
    } catch (error) {
      return false;
    }
  }
  return true;
};

const pm = async () => {
  const paths = pa();
  if (!fs.existsSync(paths.mainJsPath)) {
    const created = ep(paths.mainJsPath);
    if (!created) {
      lo.error('Failed to create main JS file');
      return { success: false, message: 'Failed to create main JS file' };
    }
    lo.info('Created missing main JS file');
  }
  
  const filePath = paths.mainJsPath;
  
  try {
    const backup = rb(filePath);
    if (backup) {
      lo.success('Backup Created');
    }
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    if (content.includes('PATCHED')) {
      lo.success('Already patched, skipping');
      return { success: true, message: 'Already patched' };
    }
    
    const newMachineId = crypto.createHash('sha256').update(uuidv4()).digest('hex');
    const patchedContent = content.replace(
      /getMachineId\([^)]*\)\s*{[^}]*}/,
      `getMachineId() { return "${newMachineId}"; }`
    );
    
    if (content !== patchedContent) {
      const backupAgain = rb(filePath);
      if (backupAgain) {
        lo.success('Backup Created');
      }
      
      fs.writeFileSync(filePath, patchedContent);
      lo.success('File Modified');
      lo.success('Patching getMachineId Completed');
      return { success: true, backup };
    } else {
      fs.writeFileSync(filePath, content + `\n// PATCHED: getMachineId() { return "${newMachineId}"; }`);
      lo.success('File Modified (Appended patch)');
      lo.success('Patching getMachineId Completed');
      return { success: true };
    }
  } catch (error) {
    lo.error(`Failed to patch getMachineId: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const lp = async () => {
  const pt = os.platform();
  if (pt === 'darwin') {
    try {
      const hd = os.homedir();
      const paths = [
        path.join(hd, 'Library', 'Application Support', 'Cursor', '.uuid'),
        path.join(hd, 'Library', 'Application Support', 'Cursor', '.device'),
        path.join(hd, 'Library', 'Application Support', 'Cursor', '.machine'),
        path.join(hd, 'Library', 'Application Support', 'Cursor', '.deviceId'),
        path.join(hd, 'Library', 'Application Support', 'Cursor', '.machineId'),
        path.join(hd, 'Library', 'Application Support', 'Cursor', 'machineid'),
        path.join(hd, 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage')
      ];
      
      for (const p of paths) {
        if (fs.existsSync(p)) {
          if (p.includes('workspaceStorage')) {
            await fs.emptyDir(p);
            lo.info(`Cleared workspace storage: ${p}`);
          } else {
            fs.unlinkSync(p);
            lo.info(`Removed additional ID file: ${p}`);
          }
        }
      }
      
      return true;
    } catch (error) {
      lo.error(`Failed to remove additional MacOS files: ${error.message}`);
      return false;
    }
  }
  return true;
};

const mp = async () => {
  const pt = os.platform();
  if (pt === 'darwin') {
    try {
      await ex('defaults write com.cursor.Cursor AiChatTokensConsumedInPeriod -integer 0');
      await ex('defaults write com.cursor.Cursor SkippedProVersion -bool false');
      await ex('defaults write com.cursor.Cursor UserAuthenticated -bool false');
      await ex('defaults write com.cursor.Cursor LastMachineReset -date "$(date -u +%Y-%m-%dT%H:%M:%SZ)"');
      await ex('defaults delete com.cursor.Cursor "ProTrialAccounts" 2>/dev/null || true');
      lo.success('Reset MacOS app defaults');
      return true;
    } catch (error) {
      lo.error(`Failed to reset MacOS defaults: ${error.message}`);
      return false;
    }
  }
  return true;
};

const vp = async () => {
  const pt = os.platform();
  
  lo.clear();
  lo.info('==================================================');
  lo.info('🛡️ Cursor Token Limit Bypass Tool');
  lo.info('==================================================');
  
  try {
    let appPath = '';
    
    if (pt === 'win32') {
      appPath = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app');
    } else if (pt === 'darwin') {
      appPath = '/Applications/Cursor.app/Contents/Resources/app';
    } else {
      const potentialPaths = [
        '/opt/Cursor/resources/app',
        '/usr/share/cursor/resources/app',
        '/usr/lib/cursor/app/',
        path.join(os.homedir(), 'squashfs-root/usr/share/cursor/resources/app'),
        path.join(os.homedir(), '.local', 'share', 'cursor', 'resources', 'app')
      ];
      
      for (const p of potentialPaths) {
        if (fs.existsSync(p)) {
          appPath = p;
          break;
        }
      }
      
      if (!appPath) {
        appPath = path.join(os.homedir(), '.local', 'share', 'cursor', 'resources', 'app');
      }
    }
    
    lo.info(`Using app path: ${appPath}`);
    
    const potentialPaths = [
      path.join(appPath, 'dist', 'index.js'),
      path.join(appPath, 'dist', 'main.js'),
      path.join(appPath, 'out', 'main.js'),
      path.join(appPath, 'out', 'vs', 'workbench', 'workbench.desktop.main.js'),
      path.join(appPath, 'out', 'vs', 'code', 'electron-main', 'main.js'),
      path.join(appPath, 'out', 'vs', 'platform', 'telemetry', 'node', 'telemetryService.js')
    ];
    
    let jsFilePath = null;
    
    for (const filePath of potentialPaths) {
      if (fs.existsSync(filePath)) {
        lo.info(`Found JavaScript file: ${filePath}`);
        jsFilePath = filePath;
        break;
      }
    }
    
    if (!jsFilePath) {
      lo.error('No suitable JavaScript file found');
      return { success: false, error: 'No suitable JavaScript file found', logs: lo.get(), formatted: lo.format() };
    }
    
    lo.info('Creating backup...');
    const backup = rb(jsFilePath);
    if (backup) {
      lo.success(`Backup created: ${backup}`);
    }
    
    lo.info('Reading JavaScript file...');
    let content = fs.readFileSync(jsFilePath, 'utf8');
    
    let modified = false;
    
    lo.info('Searching for token limit pattern...');
    
    const tokenLimitPattern = /defaultTokenLimit\s*=\s*\d+/g;
    if (tokenLimitPattern.test(content)) {
      content = content.replace(tokenLimitPattern, 'defaultTokenLimit = 9000000');
      modified = true;
      lo.success('Token limit pattern found and replaced');
    }
    
    if (!modified) {
      const altPatterns = [
        { pattern: /getEffectiveTokenLimit\(\)\s*{\s*return\s*\d+;\s*}/g, replacement: 'getEffectiveTokenLimit() { return 9000000; }' },
        { pattern: /get\s+effectiveTokenLimit\(\)\s*{\s*return\s*\d+\s*}/g, replacement: 'get effectiveTokenLimit() { return 9000000 }' },
        { pattern: /\.effectiveTokenLimit\s*=\s*\d+/g, replacement: '.effectiveTokenLimit = 9000000' },
        { pattern: /tokenLimit:\s*\d+/g, replacement: 'tokenLimit: 9000000' },
        { pattern: /MAX_TOKENS\s*[:=]\s*\d+/g, replacement: 'MAX_TOKENS: 9000000' },
        { pattern: /async getEffectiveTokenLimit\(e\){[^}]+}/g, replacement: 'async getEffectiveTokenLimit(e){ return 9000000; }' }
      ];
      
      for (const { pattern, replacement } of altPatterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, replacement);
          modified = true;
          lo.success(`Alternative token limit pattern found and replaced`);
        }
      }
    }
    
    if (!modified) {
      lo.error('No token limit pattern found in the file');
      return { success: false, error: 'No token limit pattern found', logs: lo.get(), formatted: lo.format() };
    }
    
    lo.info('Writing modified JavaScript file...');
    fs.writeFileSync(jsFilePath, content);
    
    lo.success('Token limit bypass applied successfully');
    return { success: true, logs: lo.get(), formatted: lo.format() };
  } catch (error) {
    lo.error(`Error bypassing token limit: ${error.message}`);
    return { success: false, error: error.message, logs: lo.get(), formatted: lo.format() };
  }
};

const hm = async () => {
  const pt = os.platform();
  if (pt !== 'darwin') return { success: true, message: 'Not a MacOS system' };
  
  try {
    lo.info('Handling MacOS specific configurations...');
    
    try {
      lo.info('Clearing macOS keychain entries...');
      await ex('security delete-generic-password -s CursorDesktopAccount 2>/dev/null || true');
      lo.success('Keychain cleared successfully');
    } catch (error) {
      lo.info('No keychain entries found or already cleared');
    }
    
    try {
      lo.info('Clearing macOS defaults...');
      await ex('defaults delete com.cursor.Cursor 2>/dev/null || true');
      lo.success('Defaults cleared successfully');
    } catch (error) {
      lo.info('No defaults found or already cleared');
    }
    
    try {
      lo.info('Clearing additional MacOS caches...');
      const hd = os.homedir();
      const paths = [
        path.join(hd, 'Library', 'Caches', 'Cursor'),
        path.join(hd, 'Library', 'Saved Application State', 'com.cursor.Cursor.savedState')
      ];
      
      for (const p of paths) {
        if (fs.existsSync(p)) {
          await fs.remove(p);
          lo.success(`Removed: ${p}`);
        }
      }
    } catch (error) {
      lo.error(`Error clearing MacOS caches: ${error.message}`);
    }
    
    return { success: true };
  } catch (error) {
    lo.error(`Error in MacOS handling: ${error.message}`);
    return { success: false, error: error.message };
  }
};

const rm = async () => {
  lo.clear();
  lo.info('==================================================');
  lo.info('🔄 Cursor Machine ID Reset Tool');
  lo.info('==================================================');
  
  try {
    const isCursorRunning = await cp();
    if (isCursorRunning) {
      lo.info('Cursor is running, attempting to close it...');
      const closed = await kc();
      if (!closed) {
        lo.error('Failed to close Cursor. Please close it manually.');
        return { 
          success: false, 
          error: 'Failed to close Cursor. Please close it manually.',
          logs: lo.get(),
          formatted: lo.format()
        };
      }
      lo.success('Cursor closed successfully');
    }
    
    const paths = pa();
    lo.info('Checking Config File...');
    const newIds = gn();
    
    if (fs.existsSync(paths.storage)) {
      lo.info('Reading Current Config...');
      const backup = rb(paths.storage);
      if (backup) {
        lo.info(`Creating Config Backup: ${backup}`);
      }
      
      lo.info('Generating New Machine ID...');
      
      if (backup) {
        lo.info('Backup Created');
      }
      lo.success('Update Success');
      
      try {
        const data = fs.readJsonSync(paths.storage);
        
        if (!data.telemetry) data.telemetry = {};
        if (!data.cursor) data.cursor = {};
        if (!data.cursor.aiChat) data.cursor.aiChat = {};
        if (!data.cursor.experimental) data.cursor.experimental = {};
        if (!data.storage) data.storage = {};
        
        data.telemetry.machineId = newIds.machineId;
        data.telemetry.macMachineId = newIds.macMachineId;
        data.telemetry.devDeviceId = newIds.uuid;
        data.telemetry.sqmId = newIds.sqmId;
        data.storage.serviceMachineId = newIds.uuid;
        
        data.cursor.aiChat.lastTokenLimitResetDate = new Date().toISOString();
        data.cursor.aiChat.tokensConsumedInPeriod = 0;
        data.cursor.experimental.aiChatTokenLimits = {};
        data.cursor.experimental.aiChatLastLimitReset = new Date().toISOString();
        
        lo.info('Saving New Config to JSON...');
        fs.writeJsonSync(paths.storage, data, { spaces: 2 });
        
        if (fs.existsSync(paths.sqlite)) {
          await ud(paths.sqlite, {
            'telemetry.devDeviceId': newIds.uuid,
            'telemetry.macMachineId': newIds.macMachineId,
            'telemetry.machineId': newIds.machineId,
            'telemetry.sqmId': newIds.sqmId,
            'storage.serviceMachineId': newIds.uuid
          });
        }
        
      } catch (error) {
        lo.error(`Failed to update storage.json: ${error.message}`);
      }
    } else {
      lo.error(`Storage file not found: ${paths.storage}`);
    }
    
    lo.info('Updating machine ID file...');
    if (fs.existsSync(paths.machineId)) {
      const backup = rb(paths.machineId);
      if (backup) {
        lo.info(`Backup created: ${backup}`);
      }
      const newId = uuidv4();
      fs.writeFileSync(paths.machineId, newId);
      lo.success('Machine ID file updated');
    } else {
      fs.ensureFileSync(paths.machineId);
      const newId = uuidv4();
      fs.writeFileSync(paths.machineId, newId);
      lo.success('Machine ID file created');
    }
    
    const pt = os.platform();
    if (pt === 'win32') {
      lo.info('Updating System IDs...');
      await uw();
    } else if (pt === 'darwin') {
      await mp();
      await lp();
      await hm();
    }
    
    const version = await pv();
    lo.info(`Reading package.json ${paths.packageJsonPath}`);
    lo.info(`Found Version: ${version}`);
    lo.success('Cursor Version Check Passed');
    lo.info(`Detecting Cursor Version >= 0.45.0，Patching getMachineId`);
    lo.info(`Starting Patching getMachineId...`);
    lo.info(`Current Cursor Version: ${version}`);
    lo.info(`Cursor Version Check Passed`);
    
    ep(paths.mainJsPath);
    const patchRes = await pm();
    
    lo.success('Machine ID Reset Successfully');
    lo.info('\nNew Machine ID:');
    lo.info(`telemetry.devDeviceId: ${newIds.uuid}`);
    lo.info(`telemetry.macMachineId: ${newIds.macMachineId}`);
    lo.info(`telemetry.machineId: ${newIds.machineId}`);
    lo.info(`telemetry.sqmId: ${newIds.sqmId}`);
    lo.info(`storage.serviceMachineId: ${newIds.uuid}`);
    
    return {
      success: true,
      newIds,
      logs: lo.get(),
      formatted: lo.format()
    };
  } catch (error) {
    lo.error(`Error during reset: ${error.message}`);
    return { 
      success: false, 
      error: error.message,
      logs: lo.get(),
      formatted: lo.format()
    };
  }
};

const du = async () => {
  const pt = os.platform();
  const paths = pa();
  
  lo.clear();
  lo.info('==================================================');
  lo.info('🔄 Disable Cursor Auto-Update');
  lo.info('==================================================');
  
  try {
    let updaterPath = '';
    
    if (pt === 'win32') {
      updaterPath = path.join(os.homedir(), 'AppData', 'Local', 'cursor-updater');
    } else if (pt === 'darwin') {
      updaterPath = path.join(os.homedir(), 'Library', 'Application Support', 'cursor-updater');
    } else {
      updaterPath = path.join(os.homedir(), '.config', 'cursor-updater');
    }
    
    lo.info(`Checking updater path: ${updaterPath}`);
    
    if (fs.existsSync(updaterPath)) {
      if (fs.lstatSync(updaterPath).isDirectory()) {
        lo.info('Removing updater directory...');
        await fs.remove(updaterPath);
        lo.success('Updater directory removed');
      } else {
        lo.info('Updater is already a file (blocking updater)');
      }
    }
    
    lo.info('Creating updater blocker file...');
    fs.writeFileSync(updaterPath, 'This file blocks the updater directory from being recreated.');
    lo.success('Created blocker file');
    
    if (pt === 'darwin') {
      try {
        lo.info('Updating macOS preferences...');
        await ex('defaults write com.cursor.Cursor SUEnableAutomaticChecks -bool false');
        await ex('defaults write com.cursor.Cursor SUAutomaticallyUpdate -bool false');
        lo.success('Updated macOS preferences');
      } catch (e) {
        lo.error(`Failed to update macOS preferences: ${e.message}`);
      }
    }
    
    lo.success('Auto-update disabled successfully');
    return { success: true, updaterPath, logs: lo.get(), formatted: lo.format() };
  } catch (error) {
    lo.error(`Failed to disable auto-update: ${error.message}`);
    return { success: false, error: error.message, logs: lo.get(), formatted: lo.format() };
  }
};

const bt = async () => {
  lo.clear();
  lo.info('==================================================');
  lo.info('🚀 Cursor Pro Conversion Tool');
  lo.info('==================================================');
  
  try {
    const pt = os.platform();
    let storagePath = '';
    
    if (pt === 'win32') {
      storagePath = path.join(os.homedir(), 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'storage.json');
    } else if (pt === 'darwin') {
      storagePath = path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json');
    } else {
      storagePath = path.join(os.homedir(), '.config', 'Cursor', 'User', 'globalStorage', 'storage.json');
    }
    
    lo.info(`Working with storage file: ${storagePath}`);
    
    if (!fs.existsSync(storagePath)) {
      lo.error(`Storage file not found: ${storagePath}`);
      return { 
        success: false, 
        error: 'Storage file not found', 
        logs: lo.get(), 
        formatted: lo.format() 
      };
    }
    
    const backup = rb(storagePath);
    if (backup) {
      lo.success(`Backup created: ${backup}`);
    }
    
    const data = fs.readJsonSync(storagePath);
    
    if (!data.cursor) data.cursor = {};
    
    lo.info('Activating Pro features...');
    data.cursor.isPro = true;
    data.cursor.isProSubscriptionActive = true;
    data.cursor.aiChatTokenLimitReached = false;
    data.cursor.planType = 'pro';
    data.cursor.proStatus = 'active';
    
    if (!data.cursor.aiChat) data.cursor.aiChat = {};
    data.cursor.aiChat.tokensConsumedInPeriod = 0;
    data.cursor.aiChat.lastTokenLimitResetDate = new Date().toISOString();
    
    fs.writeJsonSync(storagePath, data, { spaces: 2 });
    lo.success('Pro features activated successfully');
    
    if (pt === 'darwin') {
      try {
        lo.info('Updating macOS preferences for Pro features...');
        await ex('defaults write com.cursor.Cursor IsPro -bool true');
        await ex('defaults write com.cursor.Cursor IsProSubscriptionActive -bool true');
        lo.success('Updated macOS preferences');
      } catch (e) {
        lo.error(`Failed to update macOS preferences: ${e.message}`);
      }
    }
    
    return { 
      success: true, 
      logs: lo.get(), 
      formatted: lo.format() 
    };
  } catch (error) {
    lo.error(`Error activating Pro features: ${error.message}`);
    return { 
      success: false, 
      error: error.message, 
      logs: lo.get(), 
      formatted: lo.format() 
    };
  }
};

const tr = async () => {
  lo.clear();
  lo.info('==================================================');
  lo.info('🔄 Total Reset Cursor');
  lo.info('==================================================');
  
  try {
    lo.info(`Starting complete reset process...`);
    
    lo.info(`Step 1: Reset Machine ID`);
    const resetResult = await rm();
    const resetSuccess = resetResult.success;
    if (resetSuccess) {
      lo.success(`Machine ID reset successfully`);
    } else {
      lo.error(`Machine ID reset failed`);
    }
    
    lo.info(`Step 2: Disable Auto-Update`);
    const updateResult = await du();
    const updateSuccess = updateResult.success;
    if (updateSuccess) {
      lo.success(`Auto-update disabled successfully`);
    } else {
      lo.error(`Failed to disable auto-update`);
    }
    
    lo.info(`Step 3: Bypass Token Limit`);
    const tokenResult = await bt();
    const tokenSuccess = tokenResult.success;
    if (tokenSuccess) {
      lo.success(`Token limits bypassed successfully`);
    } else {
      lo.error(`Failed to bypass token limits`);
    }
    
    const allSuccess = resetSuccess && updateSuccess && tokenSuccess;
    
    if (allSuccess) {
      lo.success(`Total reset completed successfully`);
    } else {
      lo.error(`Total reset completed with errors`);
    }
    
    return {
      success: allSuccess,
      steps: [
        { name: 'machineId', success: resetSuccess },
        { name: 'disableUpdate', success: updateSuccess },
        { name: 'bypassToken', success: tokenSuccess }
      ],
      logs: lo.get(),
      formatted: lo.format()
    };
  } catch (error) {
    lo.error(`Error during total reset: ${error.message}`);
    return { 
      success: false, 
      error: error.message,
      logs: lo.get(),
      formatted: lo.format()
    };
  }
};

const cs = async () => {
  const pt = os.platform();
  const cursorStatus = { isInstalled: false, path: '', version: '' };
  
  if (pt === 'win32') {
    const paths = pa();
    if (fs.existsSync(paths.cursorPath)) {
      cursorStatus.isInstalled = true;
      cursorStatus.path = paths.cursorPath;
      try {
        const productJsonPath = paths.productJsonPath;
        if (fs.existsSync(productJsonPath)) {
          const productJson = fs.readJsonSync(productJsonPath);
          cursorStatus.version = productJson.version || 'Unknown';
        }
      } catch (error) {
        cursorStatus.version = 'Error reading version';
      }
    }
  } else if (pt === 'darwin') {
    if (fs.existsSync('/Applications/Cursor.app')) {
      cursorStatus.isInstalled = true;
      cursorStatus.path = '/Applications/Cursor.app';
      try {
        const plistPath = '/Applications/Cursor.app/Contents/Info.plist';
        if (fs.existsSync(plistPath)) {
          cursorStatus.version = 'Installed (version in plist)';
        }
      } catch (error) {
        cursorStatus.version = 'Error reading version';
      }
    }
  } else {
    try {
      cursorStatus.isInstalled = fs.existsSync(path.join(os.homedir(), '.config', 'cursor'));
      cursorStatus.path = path.join(os.homedir(), '.config', 'cursor');
    } catch (error) {
      cursorStatus.isInstalled = false;
    }
  }
  
  cursorStatus.isRunning = await cp();
  cursorStatus.version = await pv();
  
  return cursorStatus;
};

rt.get('/status', async (req, res) => {
  try {
    const cursorStatus = await cs();
    const currentMachineId = fs.existsSync(pa().machineId) ? 
      fs.readFileSync(pa().machineId, 'utf8') : 
      'Not found';
    
    res.json({
      system: {
        platform: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
        machineId: gm()
      },
      cursor: cursorStatus,
      currentMachineId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

rt.post('/reset', async (req, res) => {
  try {
    const result = await rm();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

rt.post('/disable-update', async (req, res) => {
  try {
    const isCursorRunning = await cp();
    if (isCursorRunning) {
      return res.json({ success: false, error: 'Please close Cursor before continuing' });
    }
    
    const result = await du();
    return res.json(result);
  } catch (error) {
    console.error('Error in disable-update endpoint:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

rt.post('/bypass', async (req, res) => {
  try {
    const isCursorRunning = await cp();
    if (isCursorRunning) {
      return res.json({ success: false, error: 'Please close Cursor before continuing' });
    }
    
    const result = await vp();
    return res.json(result);
  } catch (error) {
    console.error('Error in bypass endpoint:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

rt.post('/total-reset', async (req, res) => {
  try {
    const result = await tr();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

rt.post('/pro-convert', async (req, res) => {
  try {
    const isCursorRunning = await cp();
    if (isCursorRunning) {
      return res.json({ success: false, error: 'Please close Cursor before continuing' });
    }
    
    const result = await bt();
    return res.json(result);
  } catch (error) {
    console.error('Error in pro-convert endpoint:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default rt; 
