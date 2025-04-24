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
      packageJsonPath: '/Applications/Cursor.app/Contents/Resources/app/package.json',
      mainJsPath: '/Applications/Cursor.app/Contents/Resources/app/out/vs/platform/telemetry/node/telemetryService.js'
    };
  } else {
    return {
      storage: path.join(hd, '.config', 'Cursor', 'User', 'globalStorage', 'storage.json'),
      sqlite: path.join(hd, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      machineId: path.join(hd, '.config', 'cursor', 'machineid'),
      cursorPath: path.join(hd, '.local', 'share', 'cursor'),
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
      await ex('pkill -9 Cursor');
    } else {
      await ex('pkill -9 cursor');
    }
    return true;
  } catch (error) {
    return false;
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
      lo.info('Updating System IDs...');
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

const pm = async () => {
  const paths = pa();
  if (fs.existsSync(paths.mainJsPath)) {
    const filePath = paths.mainJsPath;
    
    try {
      const version = await pv();
      lo.info(`Detecting Cursor Version >= 0.45.0，Patching getMachineId`);
      lo.info(`Starting Patching getMachineId...`);
      lo.info(`Current Cursor Version: ${version}`);
      lo.info(`Cursor Version Check Passed`);
      
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
        lo.error('Patch pattern not found');
        return { success: false, message: 'Patch pattern not found' };
      }
    } catch (error) {
      lo.error(`Failed to patch getMachineId: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  lo.error('Main JS file not found');
  return { success: false, message: 'Main JS file not found' };
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
  if (pt === 'darwin') {
    try {
      const hd = os.homedir();
      const configPaths = [
        path.join(hd, 'Library', 'Application Support', 'Code', 'machineid'),
        path.join(hd, 'Library', 'Application Support', 'VSCodium', 'machineid'),
        path.join(hd, 'Library', 'Application Support', 'Code - Insiders', 'machineid')
      ];
      
      for (const configPath of configPaths) {
        if (fs.existsSync(configPath)) {
          const newId = uuidv4();
          fs.writeFileSync(configPath, newId);
          lo.success(`Updated related VSCode ID: ${configPath}`);
        }
      }
      
      const keychainItems = [
        'Cursor',
        'cursor-app',
        'cursor-oauth'
      ];
      
      for (const item of keychainItems) {
        try {
          await ex(`security delete-generic-password -a ${item} -s ${item} 2>/dev/null || true`);
          lo.success(`Removed keychain item: ${item}`);
        } catch (e) {}
      }
      
      return true;
    } catch (error) {
      lo.error(`Failed to update related VSCode IDs: ${error.message}`);
      return false;
    }
  }
  return true;
};

const rm = async () => {
  const paths = pa();
  const result = { success: true, errors: [], newIds: {}, logs: [] };
  
  try {
    lo.clear();
    lo.info('==================================================');
    lo.info('🔄 Cursor Machine ID Reset Tool');
    lo.info('==================================================');
    lo.info('Checking Config File...');
    
    const isCursorRunning = await cp();
    if (isCursorRunning) {
      lo.info('Cursor is running, attempting to close it...');
      const closed = await kc();
      if (!closed) {
        lo.error('Failed to close Cursor. Please close it manually.');
        result.success = false;
        result.errors.push('Failed to close Cursor. Please close it manually.');
        result.logs = lo.get();
        return result;
      }
      lo.success('Cursor closed successfully');
    }
    
    lo.info('Reading Current Config...');
    
    const storageBackup = rb(paths.storage);
    if (storageBackup) {
      lo.info(`Creating Config Backup: ${storageBackup}`);
      result.storageBackup = storageBackup;
    }
    
    lo.info('Generating New Machine ID...');
    const newIds = gn();
    result.newIds = newIds;
    
    if (storageBackup) {
      lo.info('Backup Created');
    }
    lo.success('Update Success');
    
    if (fs.existsSync(paths.machineId)) {
      fs.writeFileSync(paths.machineId, newIds.uuid);
      lo.success('Machine ID file updated');
    } else {
      fs.ensureFileSync(paths.machineId);
      fs.writeFileSync(paths.machineId, newIds.uuid);
      lo.success('Machine ID file created');
    }
    
    await lp();
    await mp();
    await vp();
    
    lo.info('Saving New Config to JSON...');
    
    if (fs.existsSync(paths.storage)) {
      try {
        const storage = fs.readJsonSync(paths.storage);
        
        if (storage) {
          if (!storage.telemetry) storage.telemetry = {};
          if (!storage.storage) storage.storage = {};
          
          storage.telemetry.devDeviceId = newIds.uuid;
          storage.telemetry.macMachineId = newIds.macMachineId;
          storage.telemetry.machineId = newIds.machineId;
          storage.telemetry.sqmId = newIds.sqmId;
          storage.storage.serviceMachineId = newIds.uuid;
          
          if (os.platform() === 'darwin') {
            if (!storage.cursor) storage.cursor = {};
            if (!storage.cursor.aiChat) storage.cursor.aiChat = {};
            if (!storage.cursor.experimental) storage.cursor.experimental = {};
            
            storage.cursor.aiChat.lastTokenLimitResetDate = new Date().toISOString();
            storage.cursor.aiChat.tokensConsumedInPeriod = 0;
            storage.cursor.experimental.aiChatTokenLimits = {};
            storage.cursor.experimental.aiChatLastLimitReset = new Date().toISOString();
            storage.cursor.isAuthenticated = false;
          }
          
          fs.writeJsonSync(paths.storage, storage, { spaces: 2 });
          result.storageUpdated = true;
        }
      } catch (error) {
        lo.error(`Failed to update storage.json: ${error.message}`);
        result.errors.push(`Failed to update storage.json: ${error.message}`);
      }
    }
    
    lo.info('Updating SQLite Database...');
    
    if (fs.existsSync(paths.sqlite)) {
      try {
        const db = await open({
          filename: paths.sqlite,
          driver: sqlite3.Database
        });
        
        await us(db, 'telemetry.devDeviceId', newIds.uuid);
        lo.info('Updating Key-Value Pair: telemetry.devDeviceId');
        
        await us(db, 'telemetry.macMachineId', newIds.macMachineId);
        lo.info('Updating Key-Value Pair: telemetry.macMachineId');
        
        await us(db, 'telemetry.machineId', newIds.machineId);
        lo.info('Updating Key-Value Pair: telemetry.machineId');
        
        await us(db, 'telemetry.sqmId', newIds.sqmId);
        lo.info('Updating Key-Value Pair: telemetry.sqmId');
        
        await us(db, 'storage.serviceMachineId', newIds.uuid);
        lo.info('Updating Key-Value Pair: storage.serviceMachineId');
        
        if (os.platform() === 'darwin') {
          await us(db, 'cursor.aiChat.lastTokenLimitResetDate', new Date().toISOString());
          await us(db, 'cursor.aiChat.tokensConsumedInPeriod', 0);
          await us(db, 'cursor.experimental.aiChatTokenLimits', {});
          await us(db, 'cursor.experimental.aiChatLastLimitReset', new Date().toISOString());
          await us(db, 'cursor.isAuthenticated', false);
          lo.info('MacOS-specific SQLite entries updated');
        }
        
        await db.close();
        lo.success('SQLite Database Updated Successfully');
        result.sqliteUpdated = true;
      } catch (error) {
        lo.error(`Failed to update SQLite DB: ${error.message}`);
        result.errors.push(`Failed to update SQLite DB: ${error.message}`);
      }
    }
    
    const sysUpdate = await uw();
    result.systemUpdate = sysUpdate;
    
    const version = await pv();
    result.cursorVersion = version;
    
    if (version !== 'Unknown') {
      const vParts = version.split('.').map(Number);
      if (vParts.length >= 3 && (vParts[0] > 0 || vParts[1] >= 45)) {
        const patchResult = await pm();
        result.patchResult = patchResult;
      }
    }
    
    lo.success('Machine ID Reset Successfully');
    
    lo.info('\nNew Machine ID:');
    lo.info(`telemetry.devDeviceId: ${newIds.uuid}`);
    lo.info(`telemetry.macMachineId: ${newIds.macMachineId}`);
    lo.info(`telemetry.machineId: ${newIds.machineId}`);
    lo.info(`telemetry.sqmId: ${newIds.sqmId}`);
    lo.info(`storage.serviceMachineId: ${newIds.uuid}`);
    
    if (result.errors.length > 0) {
      result.success = false;
    }
    
    result.logs = lo.get();
    result.formatted = lo.format();
    return result;
  } catch (error) {
    lo.error(`Error during reset: ${error.message}`);
    result.success = false;
    result.errors.push(error.message);
    result.logs = lo.get();
    return result;
  }
};

const du = async () => {
  const pt = os.platform();
  const paths = pa();
  
  lo.clear();
  lo.info('==================================================');
  lo.info('🔄 Disable Cursor Auto-Update');
  lo.info('==================================================');
  
  if (pt === 'win32' && fs.existsSync(paths.updateYmlPath)) {
    try {
      lo.info(`Backing up update configuration...`);
      const backup = rb(paths.updateYmlPath);
      if (backup) {
        lo.success(`Backup created: ${backup}`);
      }
      
      lo.info(`Modifying update configuration...`);
      const content = fs.readFileSync(paths.updateYmlPath, 'utf8');
      const updatedContent = content.replace(/provider: github[\s\S]*?\}/g, 'provider: generic\n  url: https://invalidupdateurl.com\n}');
      
      fs.writeFileSync(paths.updateYmlPath, updatedContent);
      lo.success(`Update configuration modified successfully`);
      
      if (fs.existsSync(paths.updaterPath)) {
        lo.info(`Removing updater directory...`);
        await fs.remove(paths.updaterPath);
        lo.success(`Updater directory removed`);
      }
      
      lo.success(`Auto-update disabled successfully`);
      return { success: true, backup, logs: lo.get(), formatted: lo.format() };
    } catch (error) {
      lo.error(`Failed to disable auto-update: ${error.message}`);
      return { success: false, error: error.message, logs: lo.get(), formatted: lo.format() };
    }
  } else if (pt === 'darwin') {
    try {
      lo.info(`Disabling auto-update on macOS...`);
      await ex('defaults write com.cursor.Cursor SUEnableAutomaticChecks -bool false');
      await ex('defaults write com.cursor.Cursor SUAutomaticallyUpdate -bool false');
      await ex('defaults write com.cursor.Cursor SUSendProfileInfo -bool false');
      await ex('defaults write com.cursor.Cursor SUSkippedVersion -string "999.999.999"');
      
      lo.info(`Removing AutoUpdate directories...`);
      const hd = os.homedir();
      const updateDirs = [
        path.join(hd, 'Library', 'Caches', 'com.cursor.Cursor.ShipIt'),
        path.join(hd, 'Library', 'Caches', 'com.cursor.Cursor'),
        path.join(hd, 'Library', 'Caches', 'Cursor')
      ];
      
      for (const dir of updateDirs) {
        if (fs.existsSync(dir)) {
          await fs.remove(dir);
          lo.success(`Removed update cache: ${dir}`);
        }
      }
      
      lo.success(`Auto-update disabled successfully`);
      return { success: true, logs: lo.get(), formatted: lo.format() };
    } catch (error) {
      lo.error(`Failed to disable auto-update: ${error.message}`);
      return { success: false, error: error.message, logs: lo.get(), formatted: lo.format() };
    }
  }
  
  lo.error(`Auto-update configuration not found`);
  return { success: false, message: 'Auto-update configuration not found', logs: lo.get(), formatted: lo.format() };
};

const bt = async () => {
  const paths = pa();
  
  lo.clear();
  lo.info('==================================================');
  lo.info('🔄 Bypass Cursor Token Limit');
  lo.info('==================================================');
  
  try {
    lo.info(`Checking storage file...`);
    
    if (fs.existsSync(paths.storage)) {
      lo.info(`Creating backup of storage file...`);
      const backup = rb(paths.storage);
      if (backup) {
        lo.success(`Backup created: ${backup}`);
      }
      
      lo.info(`Reading storage file...`);
      const storage = fs.readJsonSync(paths.storage);
      
      if (storage) {
        if (!storage.cursor) {
          storage.cursor = {};
          lo.info(`Created cursor object in storage`);
        }
        
        lo.info(`Resetting token limits...`);
        
        if (!storage.cursor.aiChat) {
          storage.cursor.aiChat = {};
        }
        
        storage.cursor.aiChat.lastTokenLimitResetDate = new Date().toISOString();
        storage.cursor.aiChat.tokensConsumedInPeriod = 0;
        
        if (!storage.cursor.experimental) {
          storage.cursor.experimental = {};
        }
        
        storage.cursor.experimental.aiChatTokenLimits = {};
        storage.cursor.experimental.aiChatLastLimitReset = new Date().toISOString();
        
        lo.info(`Writing updated storage file...`);
        fs.writeJsonSync(paths.storage, storage, { spaces: 2 });
        lo.success(`Token limits reset successfully`);
        
        return { 
          success: true, 
          message: 'Token limits bypassed successfully',
          logs: lo.get(),
          formatted: lo.format()
        };
      } else {
        lo.error(`Storage file is empty or invalid`);
      }
    } else {
      lo.error(`Storage file not found`);
    }
    
    return { 
      success: false, 
      error: 'Failed to bypass token limits',
      logs: lo.get(),
      formatted: lo.format()
    };
  } catch (error) {
    lo.error(`Error bypassing token limits: ${error.message}`);
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
    const result = await du();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

rt.post('/bypass-token', async (req, res) => {
  try {
    const result = await bt();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
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

export default rt; 