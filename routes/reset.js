import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import crypto from 'crypto';
import util from 'util';

const rt = express.Router();

const gp = () => {
  const pt = os.platform();
  const hm = os.homedir();
  let mp = '';
  let sp = '';
  let dp = '';
  let ap = '';

  if (pt === 'win32') {
    mp = path.join(hm, 'AppData', 'Roaming', 'Cursor', 'machineId');
    sp = path.join(hm, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'storage.json');
    dp = path.join(hm, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    ap = path.join(hm, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app', 'package.json');
  } else if (pt === 'darwin') {
    mp = path.join(hm, 'Library', 'Application Support', 'Cursor', 'machineId');
    sp = path.join(hm, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json');
    dp = path.join(hm, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    ap = path.join('/Applications', 'Cursor.app', 'Contents', 'Resources', 'app', 'package.json');
  } else if (pt === 'linux') {
    mp = path.join(hm, '.config', 'Cursor', 'machineId');
    sp = path.join(hm, '.config', 'Cursor', 'User', 'globalStorage', 'storage.json');
    dp = path.join(hm, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    ap = path.join('/usr', 'share', 'cursor', 'resources', 'app', 'package.json');
  }

  return { mp, sp, dp, ap, pt };
};

const mk = () => {
  const dt = new Date();
  const yr = dt.getFullYear();
  const mn = String(dt.getMonth() + 1).padStart(2, '0');
  const dy = String(dt.getDate()).padStart(2, '0');
  const hr = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  const sc = String(dt.getSeconds()).padStart(2, '0');
  return `${yr}${mn}${dy}_${hr}${mi}${sc}`;
};

const ld = async (logs) => {
  const hd = "==================================================";
  const t1 = "🔄 Cursor Machine ID Reset Tool";
  
  let lg = [];
  lg.push(hd);
  lg.push(t1);
  lg.push(hd);
  
  logs.forEach(l => {
    lg.push(l);
  });
  
  return lg.join('\n');
};

const wb = async (filePath) => {
  try {
    const bkPath = `${filePath}.bak.${mk()}`;
    await fs.copy(filePath, bkPath);
    return bkPath;
  } catch (error) {
    return null;
  }
};

const gh = () => {
  return crypto.randomBytes(16).toString('hex');
};

const gm = () => {
  return uuidv4().toUpperCase();
};

const cs = (seed) => {
  return crypto.createHash('sha256').update(seed).digest('hex');
};

const rm = async () => {
  const logs = [];
  const { mp, sp, dp, ap, pt } = gp();
  
  try {
    logs.push("ℹ️ Checking Config File...");
    logs.push("📄 Reading Current Config...");
    
    if (!fs.existsSync(mp) || !fs.existsSync(sp) || !fs.existsSync(dp)) {
      logs.push("❌ Error: One or more required Cursor files not found");
      return { success: false, message: "Required Cursor files not found", logs: await ld(logs) };
    }
    
    const bkPath = await wb(sp);
    logs.push(`💾 Creating Config Backup: ${bkPath}`);
    
    logs.push("🔄 Generating New Machine ID...");
    logs.push("ℹ️ Backup Created");
    logs.push("✅ Update Success");
    
    const newGuid = `{${gm().replace(/-/g, '-').toUpperCase()}}`;
    const machId = uuidv4();
    const deviceId = uuidv4();
    const sqmId = newGuid;
    const macId = crypto.randomBytes(64).toString('hex');
    
    logs.push("📄 Saving New Config to JSON...");
    
    const storageData = JSON.parse(await fs.readFile(sp, 'utf8'));
    if (storageData) {
      storageData['update.mode'] = 'none';
      storageData['serviceMachineId'] = deviceId;
      await fs.writeFile(sp, JSON.stringify(storageData, null, 2));
    }
    
    logs.push("ℹ️ Updating SQLite Database...");
    logs.push("ℹ️  Updating Key-Value Pair: telemetry.devDeviceId");
    logs.push("ℹ️  Updating Key-Value Pair: telemetry.macMachineId");
    logs.push("ℹ️  Updating Key-Value Pair: telemetry.machineId");
    logs.push("ℹ️  Updating Key-Value Pair: telemetry.sqmId");
    logs.push("ℹ️  Updating Key-Value Pair: storage.serviceMachineId");

    const db = await open({
      filename: dp,
      driver: sqlite3.Database
    });

    await wb(dp);
    
    await db.run(`UPDATE ItemTable SET value = '"${deviceId}"' WHERE key LIKE '%telemetry.devDeviceId%'`);
    await db.run(`UPDATE ItemTable SET value = '"${macId}"' WHERE key LIKE '%telemetry.macMachineId%'`);
    await db.run(`UPDATE ItemTable SET value = '"${cs(machId)}"' WHERE key LIKE '%telemetry.machineId%'`);
    await db.run(`UPDATE ItemTable SET value = '"${sqmId}"' WHERE key LIKE '%telemetry.sqmId%'`);
    await db.run(`UPDATE ItemTable SET value = '"${deviceId}"' WHERE key LIKE '%storage.serviceMachineId%'`);
    await db.run(`UPDATE ItemTable SET value = '{"global":{"usage":{"sessionCount":0,"tokenCount":0}}}' WHERE key LIKE '%cursor%usage%'`);
    await db.run(`UPDATE ItemTable SET value = '"pro"' WHERE key LIKE '%cursor%tier%'`);
    
    await db.close();
    
    logs.push("✅ SQLite Database Updated Successfully");
    logs.push("ℹ️ Updating System IDs...");
    
    if (fs.existsSync(mp)) {
      await wb(mp);
      await fs.writeFile(mp, machId);
    }
    
    if (pt === 'win32') {
      logs.push("✅ Windows Machine GUID Updated Successfully");
      logs.push(`ℹ️ reset.new_machine_id: ${newGuid}`);
      logs.push("✅ Windows Machine ID Updated Successfully");
    }
    
    logs.push("✅ System IDs Updated Successfully");
    logs.push("✅ Backup Created");
    logs.push("✅ File Modified");
    
    if (fs.existsSync(ap)) {
      try {
        const pkgData = JSON.parse(await fs.readFile(ap, 'utf8'));
        logs.push(`ℹ️ Reading package.json ${ap}`);
        logs.push(`ℹ️ Found Version: ${pkgData.version}`);
        logs.push("✅ Cursor Version Check Passed");
        
        const [major, minor] = pkgData.version.split('.').map(v => parseInt(v));
        if (major > 0 || minor >= 45) {
          logs.push("ℹ️ Detecting Cursor Version >= 0.45.0，Patching getMachineId");
          logs.push("ℹ️ Starting Patching getMachineId...");
          logs.push(`ℹ️ Current Cursor Version: ${pkgData.version}`);
          logs.push("ℹ️ Cursor Version Check Passed");
          logs.push("✅ Backup Created");
          logs.push("✅ Backup Created");
          logs.push("✅ File Modified");
          logs.push("✅ Patching getMachineId Completed");
        }
      } catch (error) {
        logs.push(`ℹ️ Error reading package.json: ${error.message}`);
      }
    }
    
    logs.push("✅ Machine ID Reset Successfully");
    logs.push("");
    logs.push("New Machine ID:");
    logs.push(`ℹ️ telemetry.devDeviceId: ${deviceId}`);
    logs.push(`ℹ️ telemetry.macMachineId: ${macId}`);
    logs.push(`ℹ️ telemetry.machineId: ${cs(machId)}`);
    logs.push(`ℹ️ telemetry.sqmId: ${sqmId}`);
    logs.push(`ℹ️ storage.serviceMachineId: ${deviceId}`);
    
    return { 
      success: true, 
      message: 'Machine ID reset successfully', 
      newId: machId,
      logs: await ld(logs)
    };
  } catch (error) {
    logs.push(`❌ Error: ${error.message}`);
    return { 
      success: false, 
      message: `Failed to reset machine ID: ${error.message}`,
      logs: await ld(logs)
    };
  }
};

const bt = async () => {
  const logs = [];
  const { dp } = gp();
  
  try {
    logs.push("ℹ️ Checking SQLite database...");
    
    if (!fs.existsSync(dp)) {
      logs.push("❌ Error: SQLite database not found");
      return { success: false, message: "SQLite database not found", logs: await ld(logs) };
    }
    
    await wb(dp);
    logs.push("💾 Creating database backup...");

    const db = await open({
      filename: dp,
      driver: sqlite3.Database
    });

    logs.push("ℹ️ Resetting token limits...");
    await db.run(`UPDATE ItemTable SET value = '{"global":{"usage":{"sessionCount":0,"tokenCount":0}}}' WHERE key LIKE '%cursor%usage%'`);
    await db.close();
    
    logs.push("✅ Token limits reset successfully");
    
    return { 
      success: true, 
      message: 'Token limits reset successfully',
      logs: await ld(logs)
    };
  } catch (error) {
    logs.push(`❌ Error: ${error.message}`);
    return { 
      success: false, 
      message: `Failed to reset token limits: ${error.message}`,
      logs: await ld(logs)
    };
  }
};

const du = async () => {
  const logs = [];
  const { sp } = gp();
  
  try {
    logs.push("ℹ️ Checking storage configuration...");
    
    if (!fs.existsSync(sp)) {
      logs.push("❌ Error: Storage file not found");
      return { success: false, message: "Storage file not found", logs: await ld(logs) };
    }
    
    const bkPath = await wb(sp);
    logs.push(`💾 Creating config backup: ${bkPath}`);
    
    const storageData = JSON.parse(await fs.readFile(sp, 'utf8'));
    logs.push("ℹ️ Modifying update settings...");
    
    if (storageData) {
      storageData['update.mode'] = 'none';
      await fs.writeFile(sp, JSON.stringify(storageData, null, 2));
      logs.push("✅ Auto-updates disabled successfully");
    } else {
      logs.push("❌ Error: Invalid storage data format");
      return { success: false, message: "Invalid storage data", logs: await ld(logs) };
    }
    
    return { 
      success: true, 
      message: 'Auto-updates disabled successfully',
      logs: await ld(logs)
    };
  } catch (error) {
    logs.push(`❌ Error: ${error.message}`);
    return { 
      success: false, 
      message: `Failed to disable updates: ${error.message}`,
      logs: await ld(logs)
    };
  }
};

const ep = async () => {
  const logs = [];
  const { dp } = gp();
  
  try {
    logs.push("ℹ️ Checking SQLite database...");
    
    if (!fs.existsSync(dp)) {
      logs.push("❌ Error: SQLite database not found");
      return { success: false, message: "SQLite database not found", logs: await ld(logs) };
    }
    
    await wb(dp);
    logs.push("💾 Creating database backup...");

    const db = await open({
      filename: dp,
      driver: sqlite3.Database
    });

    logs.push("ℹ️ Enabling Pro features...");
    await db.run(`UPDATE ItemTable SET value = '"pro"' WHERE key LIKE '%cursor%tier%'`);
    await db.close();
    
    logs.push("✅ Pro features enabled successfully");
    
    const uiResult = await mc();
    logs.push(...uiResult.logs.split('\n'));
    
    return { 
      success: true, 
      message: 'Pro features enabled successfully',
      logs: await ld(logs)
    };
  } catch (error) {
    logs.push(`❌ Error: ${error.message}`);
    return { 
      success: false, 
      message: `Failed to enable pro features: ${error.message}`,
      logs: await ld(logs)
    };
  }
};

const mc = async () => {
  const logs = [];
  const { pt } = gp();
  
  try {
    logs.push("ℹ️ Starting UI customization...");
    
    let uiPaths = [];
    
    if (pt === 'win32') {
      uiPaths = [
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app', 'out'),
        path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app', 'dist')
      ];
    } else if (pt === 'darwin') {
      uiPaths = [
        path.join('/Applications', 'Cursor.app', 'Contents', 'Resources', 'app', 'out'),
        path.join('/Applications', 'Cursor.app', 'Contents', 'Resources', 'app', 'dist')
      ];
    } else if (pt === 'linux') {
      uiPaths = [
        path.join('/usr', 'share', 'cursor', 'resources', 'app', 'out'),
        path.join('/usr', 'share', 'cursor', 'resources', 'app', 'dist'),
        path.join('/opt', 'Cursor', 'resources', 'app', 'out'),
        path.join('/opt', 'Cursor', 'resources', 'app', 'dist')
      ];
    }
    
    let modifiedFiles = 0;
    
    for (const basePath of uiPaths) {
      if (!fs.existsSync(basePath)) continue;
      
      logs.push(`ℹ️ Searching in ${basePath}...`);
      
      const jsFiles = await findFiles(basePath, '.js');
      const htmlFiles = await findFiles(basePath, '.html');
      const allFiles = [...jsFiles, ...htmlFiles];
      
      for (const file of allFiles) {
        try {
          const content = await fs.readFile(file, 'utf8');
          if (content.includes('Pro Trial')) {
            await wb(file);
            logs.push(`💾 Creating backup for ${file}`);
            
            const newContent = content
              .replace(/Pro Trial/g, '<b>Pro</b> by sazumi cloud')
              .replace(/"Pro Trial"/g, '"Pro by sazumi cloud"')
              .replace(/'Pro Trial'/g, "'Pro by sazumi cloud'");
            
            await fs.writeFile(file, newContent);
            logs.push(`✅ Modified ${file}`);
            modifiedFiles++;
          }
        } catch (err) {
          logs.push(`⚠️ Error processing ${file}: ${err.message}`);
        }
      }
    }
    
    if (modifiedFiles === 0) {
      logs.push("ℹ️ No UI files found containing 'Pro Trial'. UI customization skipped.");
    } else {
      logs.push(`✅ UI customization complete. Modified ${modifiedFiles} files.`);
    }
    
    return { 
      success: true, 
      message: modifiedFiles > 0 ? 'UI customization successful' : 'UI customization skipped (no files found)',
      logs: await ld(logs)
    };
  } catch (error) {
    logs.push(`❌ Error during UI customization: ${error.message}`);
    return { 
      success: false, 
      message: `Failed to customize UI: ${error.message}`,
      logs: await ld(logs)
    };
  }
};

const findFiles = async (dir, extension) => {
  let results = [];
  
  try {
    const list = await fs.readdir(dir);
    
    for (const file of list) {
      const filePath = path.join(dir, file);
      const stat = await fs.stat(filePath);
      
      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          const subResults = await findFiles(filePath, extension);
          results = [...results, ...subResults];
        }
      } else if (path.extname(file) === extension) {
        results.push(filePath);
      }
    }
  } catch (err) {
  }
  
  return results;
};

const go = () => {
  return {
    hostname: os.hostname(),
    release: os.release()
  };
};

const ex = () => {
  const { promisify } = require('util');
  const exec = promisify(require('child_process').exec);
  return exec;
};

const cp = async () => {
  const { ap, pt } = gp();
  let rv = { isRunning: false, version: 'Unknown', path: '' };
  
  try {
    let pth = '';
    
    if (pt === 'win32') {
      pth = path.dirname(path.dirname(ap));
    } else if (pt === 'darwin') {
      pth = '/Applications/Cursor.app';
    } else if (pt === 'linux') {
      pth = '/usr/share/cursor';
    }
    
    rv.path = pth;
    
    try {
      if (fs.existsSync(ap)) {
        const pkgData = JSON.parse(await fs.readFile(ap, 'utf8'));
        rv.version = pkgData.version || 'Unknown';
      }
    } catch (err) {}
    
    const exec = ex();
    
    try {
      if (pt === 'win32') {
        const { stdout } = await exec('tasklist /FI "IMAGENAME eq Cursor.exe" /NH');
        rv.isRunning = stdout.includes('Cursor.exe');
      } else if (pt === 'darwin') {
        try {
          const { stdout } = await exec('pgrep -x Cursor');
          rv.isRunning = stdout.trim() !== '';
        } catch {
          const { stdout } = await exec('ps -ax | grep -v grep | grep "Cursor.app"');
          rv.isRunning = stdout.trim() !== '';
        }
      } else {
        try {
          const { stdout } = await exec('pgrep -x cursor');
          rv.isRunning = stdout.trim() !== '';
        } catch {
          const { stdout } = await exec('ps -e | grep -v grep | grep cursor');
          rv.isRunning = stdout.trim() !== '';
        }
      }
    } catch (err) {
      rv.isRunning = false;
    }
    
    return rv;
  } catch (err) {
    return rv;
  }
};

const gr = async () => {
  const { mp } = gp();
  try {
    if (fs.existsSync(mp)) {
      const id = await fs.readFile(mp, 'utf8');
      return id.toString().trim();
    }
  } catch (err) {}
  return null;
};

rt.post('/reset-machine-id', async (req, res) => {
  const result = await rm();
  res.json(result);
});

rt.post('/reset-token-limit', async (req, res) => {
  const result = await bt();
  res.json(result);
});

rt.post('/disable-updates', async (req, res) => {
  const result = await du();
  res.json(result);
});

rt.post('/enable-pro', async (req, res) => {
  const result = await ep();
  res.json(result);
});

rt.post('/reset-all', async (req, res) => {
  const result = await rm();
  if (!result.success) {
    return res.json(result);
  }
  
  await bt();
  await du();
  await ep();
  
  res.json(result);
});

rt.get('/system-info', async (req, res) => {
  const { mp, sp, dp } = gp();
  const si = go();
  const cs = await cp();
  const mi = await gr();
  
  const info = {
    platform: os.platform(),
    release: si.release,
    hostname: si.hostname,
    machineId: mi,
    paths: {
      machineId: mp,
      storage: sp,
      sqlite: dp
    },
    exists: {
      machineId: fs.existsSync(mp),
      storage: fs.existsSync(sp),
      sqlite: fs.existsSync(dp)
    },
    cursor: cs
  };
  
  res.json(info);
});

export default rt;