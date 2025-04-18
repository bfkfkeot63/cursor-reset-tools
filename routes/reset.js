import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import pkg from 'node-machine-id';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const { machineIdSync } = pkg;

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pa = () => {
  const platform = os.platform();
  const homeDir = os.homedir();
  
  if (platform === 'win32') {
    return {
      storage: path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'storage.json'),
      sqlite: path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      machineId: path.join(homeDir, 'AppData', 'Roaming', 'Cursor', 'machineId'),
      cursorPath: path.join(homeDir, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app'),
      updaterPath: path.join(homeDir, 'AppData', 'Local', 'cursor-updater'),
      updateYmlPath: path.join(homeDir, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app-update.yml'),
      productJsonPath: path.join(homeDir, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app', 'product.json')
    };
  } else if (platform === 'darwin') {
    return {
      storage: path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json'),
      sqlite: path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      machineId: path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'machineId')
    };
  } else {
    return {
      storage: path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage', 'storage.json'),
      sqlite: path.join(homeDir, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb'),
      machineId: path.join(homeDir, '.config', 'cursor', 'machineid')
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
  const platform = os.platform();
  try {
    if (platform === 'win32') {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq Cursor.exe" /NH');
      return stdout.includes('Cursor.exe');
    } else if (platform === 'darwin') {
      const { stdout } = await execAsync('pgrep -x Cursor');
      return stdout.trim() !== '';
    } else {
      const { stdout } = await execAsync('pgrep -x cursor');
      return stdout.trim() !== '';
    }
  } catch (error) {
    return false;
  }
};

const rd = (file) => {
  try {
    if (fs.existsSync(file)) {
      try {
        fs.removeSync(file);
        return { success: true };
      } catch (err) {
        if (err.code === 'EBUSY' || err.code === 'EPERM') {
          return { success: false, error: 'busy' };
        }
        return { success: false, error: err.message };
      }
    }
    return { success: false, error: 'not_found' };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const rt = async (file, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    const result = rd(file);
    if (result.success) {
      return { success: true };
    }
    
    if (result.error !== 'busy') {
      return result;
    }
    
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  
  return { success: false, error: `File is still in use after ${maxRetries} attempts` };
};

const rm = async () => {
  const paths = pa();
  const result = { success: true, errors: [] };
  
  try {
    const isCursorRunning = await cp();
    if (isCursorRunning) {
      result.success = false;
      result.errors.push('Cursor is currently running. Please close it before resetting.');
      return result;
    }
    
    if (fs.existsSync(paths.machineId)) {
      const deleteResult = await rt(paths.machineId);
      if (deleteResult.success) {
        const newMachineId = uuidv4();
        fs.writeFileSync(paths.machineId, newMachineId);
        result.newMachineId = newMachineId;
      } else {
        result.errors.push(`Failed to delete machine ID: ${deleteResult.error}`);
        result.success = false;
      }
    } else {
      const newMachineId = uuidv4();
      fs.ensureFileSync(paths.machineId);
      fs.writeFileSync(paths.machineId, newMachineId);
      result.newMachineId = newMachineId;
      result.created = true;
    }
    
    if (fs.existsSync(paths.storage)) {
      const storageResult = await rt(paths.storage);
      if (storageResult.success) {
        result.storageRemoved = true;
      } else {
        result.errors.push(`Failed to delete storage: ${storageResult.error}`);
      }
    } else {
      result.storageNotFound = true;
    }
    
    if (fs.existsSync(paths.sqlite)) {
      const sqliteResult = await rt(paths.sqlite);
      if (sqliteResult.success) {
        result.sqliteRemoved = true;
      } else {
        result.errors.push(`Failed to delete SQLite DB: ${sqliteResult.error}`);
      }
    } else {
      result.sqliteNotFound = true;
    }
    
    if (result.errors.length > 0 && !result.newMachineId) {
      result.success = false;
    }
    
    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(error.message);
    return result;
  }
};

const cs = async () => {
  const platform = os.platform();
  const cursorStatus = { isInstalled: false, path: '', version: '' };
  
  if (platform === 'win32') {
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
  } else if (platform === 'darwin') {
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
  return cursorStatus;
};

router.get('/status', async (req, res) => {
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

router.post('/reset', async (req, res) => {
  try {
    const result = await rm();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router; 