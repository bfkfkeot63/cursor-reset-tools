import fs from 'fs-extra';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import crypto from 'crypto';
import util from 'util';
import { execSync } from 'child_process';

const gp = () => {
  const pt = os.platform();
  const hm = os.homedir();
  let mp = '';
  let sp = '';
  let dp = '';
  let ap = '';
  let cp = '';
  let up = '';

  if (pt === 'win32') {
    mp = path.join(hm, 'AppData', 'Roaming', 'Cursor', 'machineId');
    sp = path.join(hm, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'storage.json');
    dp = path.join(hm, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    ap = path.join(hm, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app', 'package.json');
    cp = path.join(hm, 'AppData', 'Roaming', 'Cursor', 'User', 'globalStorage', 'cursor.json');
    up = path.join(hm, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app', 'dist', 'static', 'update.yml');
  } else if (pt === 'darwin') {
    mp = path.join(hm, 'Library', 'Application Support', 'Cursor', 'machineId');
    sp = path.join(hm, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'storage.json');
    dp = path.join(hm, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    ap = path.join('/Applications', 'Cursor.app', 'Contents', 'Resources', 'app', 'package.json');
    cp = path.join(hm, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'cursor.json');
    up = path.join('/Applications', 'Cursor.app', 'Contents', 'Resources', 'app', 'dist', 'static', 'update.yml');
  } else if (pt === 'linux') {
    mp = path.join(hm, '.config', 'Cursor', 'machineId');
    sp = path.join(hm, '.config', 'Cursor', 'User', 'globalStorage', 'storage.json');
    dp = path.join(hm, '.config', 'Cursor', 'User', 'globalStorage', 'state.vscdb');
    ap = path.join('/usr', 'share', 'cursor', 'resources', 'app', 'package.json');
    cp = path.join(hm, '.config', 'Cursor', 'User', 'globalStorage', 'cursor.json');
    up = path.join('/usr', 'share', 'cursor', 'resources', 'app', 'dist', 'static', 'update.yml');
  }

  return { mp, sp, dp, ap, cp, up, pt };
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

const ex = () => {
  const { promisify } = require('util');
  const exec = promisify(require('child_process').exec);
  return exec;
};

const kc = async () => {
  if (os.platform() !== 'darwin') return false;
  
  try {
    const exec = ex();
    await exec('security delete-generic-password -s "Cursor" -a "token" 2>/dev/null');
    await exec('security delete-generic-password -s "Cursor" -a "refreshToken" 2>/dev/null');
    return true;
  } catch (e) {
    return false;
  }
};

const wu = async (newGuid) => {
  if (os.platform() !== 'win32') return false;
  
  try {
    const exec = ex();
    const cmds = [
      `REG ADD HKCU\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid /t REG_SZ /d ${uuidv4()} /f`,
      `REG ADD HKCU\\SOFTWARE\\Microsoft\\SQMClient /v MachineId /t REG_SZ /d ${newGuid} /f`,
      `REG ADD HKLM\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid /t REG_SZ /d ${uuidv4()} /f`,
      `REG ADD HKLM\\SOFTWARE\\Microsoft\\SQMClient /v MachineId /t REG_SZ /d ${newGuid} /f`,
      `REG ADD HKCU\\Software\\Cursor /v MachineId /t REG_SZ /d ${newGuid} /f /reg:64`
    ];
    
    for (const cmd of cmds) {
      try {
        await exec(cmd);
      } catch (e) {}
    }
    return true;
  } catch (e) {
    return false;
  }
};

const um = async (id) => {
  if (os.platform() !== 'darwin') return false;
  
  try {
    const p = '/Library/Preferences/SystemConfiguration/com.apple.platform.uuid.plist';
    const hp = path.join(os.homedir(), p);
    
    const exec = ex();
    try {
      await exec(`defaults write ${hp} "UUID" "${id}"`);
      await exec(`sudo defaults write ${p} "UUID" "${id}"`);
      return true;
    } catch (e) {}

    return false;
  } catch (e) {
    return false;
  }
};

const gw = async () => {
  const { pt } = gp();
  const hm = os.homedir();
  
  let basePaths = [];
  let mainPath = '';
  
  if (pt === 'win32') {
    basePaths = [
      path.join(hm, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app'),
      path.join('C:', 'Program Files', 'Cursor', 'resources', 'app'),
      path.join('C:', 'Program Files (x86)', 'Cursor', 'resources', 'app')
    ];
    mainPath = 'out\\vs\\workbench\\workbench.desktop.main.js';
  } else if (pt === 'darwin') {
    basePaths = [
      '/Applications/Cursor.app/Contents/Resources/app',
      path.join(hm, 'Applications', 'Cursor.app', 'Contents', 'Resources', 'app')
    ];
    mainPath = 'out/vs/workbench/workbench.desktop.main.js';
  } else if (pt === 'linux') {
    basePaths = [
      '/opt/Cursor/resources/app', 
      '/usr/share/cursor/resources/app',
      '/usr/lib/cursor/app/',
      path.join(hm, '.local/share/cursor/resources/app')
    ];
    mainPath = 'out/vs/workbench/workbench.desktop.main.js';
  }
  
  for (const basePath of basePaths) {
    const fullPath = path.join(basePath, mainPath);
    if (fs.existsSync(fullPath)) {
      return fullPath;
    }
  }
  
  return null;
};

const pm = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return false;
    
    const content = await fs.readFile(filePath, 'utf8');
    
    let newContent = content
      .replace(/async getMachineId\(\)\{return [^??]+\?\?([^}]+)\}/, `async getMachineId(){return "${uuidv4()}"}`)
      .replace(/async getMacMachineId\(\)\{return [^??]+\?\?([^}]+)\}/, `async getMacMachineId(){return "${crypto.randomBytes(64).toString('hex')}"}`)
      .replace(/function getMachineId\(\)\{[^}]+\}/, `function getMachineId(){return "${uuidv4()}"}`)
      .replace(/function getMacMachineId\(\)\{[^}]+\}/, `function getMacMachineId(){return "${crypto.randomBytes(64).toString('hex')}"}`)
      .replace(/getServiceMachineId\(\)\{[^}]+\}/, `getServiceMachineId(){return "${uuidv4()}"}`);
    
    await fs.writeFile(filePath, newContent);
    return true;
  } catch (error) {
    return false;
  }
};

const bm = async (fp) => {
  try {
    if (!fs.existsSync(fp)) return false;
    
    await wb(fp);
    const c = await fs.readFile(fp, 'utf8');
    
    let nc = c
      .replace(/hasReachedTokenLimit\(\w+\)\{[^}]+\}/, `hasReachedTokenLimit(e){return false}`)
      .replace(/hasReachedTokenLimit\([^)]+\)\s*{\s*return[^}]+\}/, `hasReachedTokenLimit(e){return false}`)
      .replace(/isProUser\(\w*\)\s*{\s*[^}]+\}/, `isProUser(){return true}`)
      .replace(/isPro\(\w*\)\s*{\s*[^}]+\}/, `isPro(){return true}`)
      .replace(/getTokenLimit\(\w*\)\s*{\s*[^}]+\}/, `getTokenLimit(){return 999999}`)
      .replace(/getTokensRemaining\(\w*\)\s*{\s*[^}]+\}/, `getTokensRemaining(){return 999999}`)
      .replace(/getTokensUsed\(\w*\)\s*{\s*[^}]+\}/, `getTokensUsed(){return 0}`);
    
    await fs.writeFile(fp, nc);
    return true;
  } catch (e) {
    return false;
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

const rm = async () => {
  const logs = [];
  const { mp, sp, dp, ap, cp, pt } = gp();
  
  try {
    logs.push("ℹ️ Checking Config File...");
    logs.push("📄 Reading Current Config...");
    
    if (!fs.existsSync(sp)) {
      logs.push("⚠️ Warning: Storage file not found, will create if needed");
    }
    
    if (fs.existsSync(sp)) {
      const bkPath = await wb(sp);
      logs.push(`💾 Creating Config Backup: ${bkPath}`);
    }
    
    logs.push("🔄 Generating New Machine ID...");

    const newGuid = `{${gm().replace(/-/g, '-').toUpperCase()}}`;
    const machId = uuidv4();
    const deviceId = uuidv4();
    const sqmId = newGuid;
    const macId = crypto.randomBytes(64).toString('hex');
    
    logs.push("ℹ️ Backup Created");
    logs.push("📄 Saving New Config to JSON...");
    
    if (fs.existsSync(sp)) {
      try {
        const storageData = JSON.parse(await fs.readFile(sp, 'utf8'));
        storageData['update.mode'] = 'none';
        storageData['serviceMachineId'] = deviceId;
        await fs.writeFile(sp, JSON.stringify(storageData, null, 2));
      } catch (err) {
        const newStorageData = {
          'update.mode': 'none',
          'serviceMachineId': deviceId
        };
        await fs.writeFile(sp, JSON.stringify(newStorageData, null, 2));
      }
    } else {
      const newStorageData = {
        'update.mode': 'none',
        'serviceMachineId': deviceId
      };
      await fs.ensureDir(path.dirname(sp));
      await fs.writeFile(sp, JSON.stringify(newStorageData, null, 2));
    }
    
    logs.push("ℹ️ Updating SQLite Database...");
    logs.push("ℹ️  Updating Key-Value Pair: telemetry.devDeviceId");
    logs.push("ℹ️  Updating Key-Value Pair: telemetry.macMachineId");
    logs.push("ℹ️  Updating Key-Value Pair: telemetry.machineId");
    logs.push("ℹ️  Updating Key-Value Pair: telemetry.sqmId");
    logs.push("ℹ️  Updating Key-Value Pair: storage.serviceMachineId");
    logs.push("ℹ️  Updating Key-Value Pair: cursor.usage");
    logs.push("ℹ️  Updating Key-Value Pair: cursor.tier");

    if (fs.existsSync(dp)) {
      await wb(dp);
      
      try {
        const db = await open({
          filename: dp,
          driver: sqlite3.Database
        });
        
        await db.run(`UPDATE ItemTable SET value = '"${deviceId}"' WHERE key LIKE '%telemetry.devDeviceId%'`);
        await db.run(`UPDATE ItemTable SET value = '"${macId}"' WHERE key LIKE '%telemetry.macMachineId%'`);
        await db.run(`UPDATE ItemTable SET value = '"${cs(machId)}"' WHERE key LIKE '%telemetry.machineId%'`);
        await db.run(`UPDATE ItemTable SET value = '"${sqmId}"' WHERE key LIKE '%telemetry.sqmId%'`);
        await db.run(`UPDATE ItemTable SET value = '"${deviceId}"' WHERE key LIKE '%storage.serviceMachineId%'`);
        await db.run(`UPDATE ItemTable SET value = '{"global":{"usage":{"sessionCount":0,"tokenCount":0}}}' WHERE key LIKE '%cursor%usage%'`);
        await db.run(`UPDATE ItemTable SET value = '"pro"' WHERE key LIKE '%cursor%tier%'`);
        await db.run(`DELETE FROM ItemTable WHERE key LIKE '%cursor.lastUpdateCheck%'`);
        await db.run(`DELETE FROM ItemTable WHERE key LIKE '%cursor.trialStartTime%'`);
        await db.run(`DELETE FROM ItemTable WHERE key LIKE '%cursor.trialEndTime%'`);
        
        await db.close();
        logs.push("✅ SQLite Database Updated Successfully");
      } catch (err) {
        logs.push(`⚠️ SQLite Update Error: ${err.message}`);
      }
    } else {
      logs.push("⚠️ SQLite Database not found, skipping database updates");
    }
    
    logs.push("ℹ️ Updating System IDs...");
    
    if (fs.existsSync(mp)) {
      await wb(mp);
      await fs.writeFile(mp, machId);
    } else {
      await fs.ensureDir(path.dirname(mp));
      await fs.writeFile(mp, machId);
    }
    
    if (fs.existsSync(cp)) {
      await wb(cp);
      try {
        const cursorData = JSON.parse(await fs.readFile(cp, 'utf8'));
        if (cursorData) {
          if (cursorData.global && cursorData.global.usage) {
            cursorData.global.usage.sessionCount = 0;
            cursorData.global.usage.tokenCount = 0;
          } else {
            cursorData.global = {
              usage: {
                sessionCount: 0,
                tokenCount: 0
              }
            };
          }
          cursorData.tier = "pro";
          await fs.writeFile(cp, JSON.stringify(cursorData, null, 2));
          logs.push("✅ Cursor.json Updated Successfully");
        }
      } catch (err) {
        logs.push(`⚠️ Cursor.json Update Error: ${err.message}`);
      }
    }
    
    if (pt === 'win32') {
      try {
        const wr = await wu(newGuid);
        if (wr) {
          logs.push("✅ Windows Machine GUID Updated Successfully");
          logs.push(`ℹ️ reset.new_machine_id: ${newGuid}`);
          logs.push("✅ Windows Machine ID Updated Successfully");
        }
        
        try {
          const userProfileDir = process.env.USERPROFILE || os.homedir();
          const localAppDataDir = path.join(userProfileDir, 'AppData', 'Local');
          
          const cursorDirs = [
            path.join(localAppDataDir, 'Cursor'),
            path.join(localAppDataDir, 'CursorSDK')
          ];
          
          for (const dir of cursorDirs) {
            if (fs.existsSync(dir)) {
              const identityFiles = [
                path.join(dir, 'identity'),
                path.join(dir, 'machineid'),
                path.join(dir, 'deviceid')
              ];
              
              for (const file of identityFiles) {
                if (fs.existsSync(file)) {
                  await wb(file);
                  await fs.writeFile(file, machId);
                  logs.push(`✅ Updated ${file}`);
                }
              }
            }
          }
        } catch (err) {
          logs.push(`⚠️ Additional ID files update error: ${err.message}`);
        }
      } catch (error) {
        logs.push(`⚠️ Windows Registry Update Failed: ${error.message}`);
      }
    } else if (pt === 'darwin') {
      try {
        const mr = await um(macId);
        if (mr) {
          logs.push("✅ macOS Platform UUID Updated Successfully");
        }
        
        const kr = await kc();
        if (kr) {
          logs.push("✅ macOS Keychain Credentials Cleared");
        }
        
        try {
          execSync('defaults delete com.cursor.Cursor 2>/dev/null || true');
          logs.push("✅ macOS Defaults Cleared for Cursor");
        } catch (err) {}
      } catch (error) {
        logs.push(`⚠️ macOS Platform UUID Update Failed: ${error.message}`);
      }
    } else if (pt === 'linux') {
      try {
        const linuxDirs = [
          path.join(os.homedir(), '.config', 'cursor'),
          path.join(os.homedir(), '.local', 'share', 'cursor')
        ];
        
        for (const dir of linuxDirs) {
          if (fs.existsSync(dir)) {
            const identityFiles = [
              path.join(dir, 'identity'),
              path.join(dir, 'machineid'),
              path.join(dir, 'deviceid')
            ];
            
            for (const file of identityFiles) {
              if (fs.existsSync(file)) {
                await wb(file);
                await fs.writeFile(file, machId);
                logs.push(`✅ Updated ${file}`);
              }
            }
          }
        }
      } catch (err) {
        logs.push(`⚠️ Linux ID files update error: ${err.message}`);
      }
    }
    
    logs.push("✅ System IDs Updated Successfully");
    
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

          const mp = await gw();
          if (mp) {
            const bkPath = await wb(mp);
            logs.push("✅ Backup Created");

            await pm(mp);
            logs.push("✅ File Modified");
            logs.push("✅ Patching getMachineId Completed");
          }
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
      logs: logs
    };
  } catch (error) {
    logs.push(`❌ Error: ${error.message}`);
    return { 
      success: false, 
      message: `Failed to reset machine ID: ${error.message}`,
      logs: logs
    };
  }
};

const bt = async () => {
  const lg = [];
  const { dp } = gp();
  
  try {
    lg.push("ℹ️ Checking SQLite database...");
    
    if (!fs.existsSync(dp)) {
      lg.push("❌ Error: SQLite database not found");
      return { success: false, message: "SQLite database not found", logs: lg };
    }
    
    await wb(dp);
    lg.push("💾 Creating database backup...");

    const db = await open({
      filename: dp,
      driver: sqlite3.Database
    });

    lg.push("ℹ️ Resetting token limits in database...");
    await db.run(`UPDATE ItemTable SET value = '{"global":{"usage":{"sessionCount":0,"tokenCount":0}}}' WHERE key LIKE '%cursor%usage%'`);
    await db.close();
    
    lg.push("✅ Token limits reset successfully in database");
    
    const wp = await gw();
    if (wp) {
      lg.push(`ℹ️ Found workbench.desktop.main.js at: ${wp}`);
      lg.push("ℹ️ Modifying workbench file to bypass token limits...");
      
      const r = await bm(wp);
      if (r) {
        lg.push("✅ Successfully modified workbench file to bypass token limits");
      } else {
        lg.push("⚠️ Could not modify workbench file, only database token reset applied");
      }
    } else {
      lg.push("⚠️ Could not find workbench.desktop.main.js file, only database token reset applied");
    }
    
    return { 
      success: true, 
      message: 'Token limits reset successfully',
      logs: lg
    };
  } catch (e) {
    lg.push(`❌ Error: ${e.message}`);
    return { 
      success: false, 
      message: `Failed to reset token limits: ${e.message}`,
      logs: lg
    };
  }
};

const du = async () => {
  const logs = [];
  const { sp, pt } = gp();
  
  try {
    logs.push("ℹ️ Starting auto-update disabling process...");
    
    if (!fs.existsSync(sp)) {
      logs.push("❌ Error: Storage file not found");
      return { success: false, message: "Storage file not found", logs: logs };
    }
    
    const bkPath = await wb(sp);
    logs.push(`💾 Creating storage.json backup: ${bkPath}`);
    
    const storageData = JSON.parse(await fs.readFile(sp, 'utf8'));
    logs.push("ℹ️ Modifying update settings in storage.json...");
    
    if (storageData) {
      storageData['update.mode'] = 'none';
      await fs.writeFile(sp, JSON.stringify(storageData, null, 2));
      logs.push("✅ Auto-updates disabled in storage.json");
    } else {
      logs.push("❌ Error: Invalid storage data format");
      return { success: false, message: "Invalid storage data", logs: logs };
    }
    
    const hm = os.homedir();
    let upath, ypath, pjson;
    
    if (pt === 'win32') {
      upath = path.join(hm, 'AppData', 'Local', 'cursor-updater');
      ypath = path.join(hm, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app', 'update.yml');
      pjson = path.join(hm, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app', 'product.json');
    } else if (pt === 'darwin') {
      upath = path.join(hm, 'Library', 'Application Support', 'cursor-updater');
      ypath = '/Applications/Cursor.app/Contents/Resources/app-update.yml';
      pjson = '/Applications/Cursor.app/Contents/Resources/app/product.json';
    } else if (pt === 'linux') {
      upath = path.join(hm, '.config', 'cursor-updater');
      ypath = path.join(hm, '.config', 'cursor', 'resources', 'app-update.yml');
      pjson = path.join(hm, '.config', 'cursor', 'resources', 'app', 'product.json');
    }
    
    logs.push("ℹ️ Stopping running Cursor processes...");
    try {
      const exec = ex();
      if (pt === 'win32') {
        await exec('taskkill /F /IM Cursor.exe /T').catch(() => {});
      } else {
        await exec('pkill -f Cursor').catch(() => {});
      }
      logs.push("✅ Cursor processes successfully terminated");
    } catch (err) {
      logs.push("⚠️ No running Cursor processes found");
    }
    
    if (fs.existsSync(upath)) {
      logs.push(`ℹ️ Removing updater directory: ${upath}`);
      try {
        if (fs.statSync(upath).isDirectory()) {
          await fs.rm(upath, { recursive: true, force: true });
        } else {
          await fs.unlink(upath);
        }
        logs.push("✅ Updater directory successfully removed");
      } catch (err) {
        logs.push(`⚠️ Can't remove updater directory: ${err.message}`);
      }
    } else {
      logs.push("ℹ️ Updater directory not found, skipping");
    }
    
    if (fs.existsSync(ypath)) {
      logs.push(`ℹ️ Clearing update.yml file: ${ypath}`);
      try {
        await fs.writeFile(ypath, '', 'utf8');
        logs.push("✅ Update.yml file successfully cleared");
      } catch (err) {
        logs.push(`⚠️ Can't clear update.yml file: ${err.message}`);
      }
    } else {
      logs.push("ℹ️ Update.yml file not found, skipping");
    }
    
    logs.push("ℹ️ Creating blocker file to prevent auto-updates...");
    try {
      const dp = path.dirname(upath);
      
      if (!fs.existsSync(dp)) {
        fs.mkdirSync(dp, { recursive: true });
      }
      
      fs.writeFileSync(upath, '', 'utf8');
      
      if (pt !== 'win32') {
        try {
          fs.chmodSync(upath, 0o444);
        } catch (err) {
          logs.push(`⚠️ Can't set file as read-only: ${err.message}`);
        }
      }
      
      logs.push("✅ Blocker file created successfully");
    } catch (err) {
      logs.push(`⚠️ Can't create blocker file: ${err.message}`);
    }
    
    const ydir = path.dirname(ypath);
    if (fs.existsSync(ydir)) {
      try {
        fs.writeFileSync(ypath, '# This file is locked to prevent auto-updates\nversion: 0.0.0\n', 'utf8');
        
        if (pt !== 'win32') {
          try {
            fs.chmodSync(ypath, 0o444);
          } catch (err) {
            logs.push(`⚠️ Can't set update.yml as read-only: ${err.message}`);
          }
        }
        
        logs.push("✅ Update.yml file successfully modified");
      } catch (err) {
        logs.push(`⚠️ Can't modify update.yml file: ${err.message}`);
      }
    }
    
    if (fs.existsSync(pjson)) {
      logs.push(`ℹ️ Modifying product.json to remove update URLs: ${pjson}`);
      try {
        const productJson = await fs.readFile(pjson, 'utf8');
        
        const bkProductPath = await wb(pjson);
        logs.push(`💾 Creating product.json backup: ${bkProductPath}`);
        
        let modifiedJson = productJson
          .replace(/https:\/\/api2\.cursor\.sh\/aiserver\.v1\.AuthService\/DownloadUpdate/g, '')
          .replace(/https:\/\/api2\.cursor\.sh\/updates/g, '')
          .replace(/http:\/\/cursorapi\.com\/updates/g, '');
          
        await fs.writeFile(pjson, modifiedJson, 'utf8');
        logs.push("✅ Update URLs successfully removed from product.json");
      } catch (err) {
        logs.push(`⚠️ Can't modify product.json: ${err.message}`);
      }
    } else {
      logs.push("ℹ️ Product.json file not found, skipping");
    }
    
    logs.push("✅ Auto-updates successfully disabled completely");
    
    return { 
      success: true, 
      message: 'Auto-updates disabled successfully',
      logs: logs
    };
  } catch (error) {
    logs.push(`❌ Error: ${error.message}`);
    return { 
      success: false, 
      message: `Failed to disable updates: ${error.message}`,
      logs: logs
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
      logs: logs
    };
  } catch (error) {
    logs.push(`❌ Error during UI customization: ${error.message}`);
    return { 
      success: false, 
      message: `Failed to customize UI: ${error.message}`,
      logs: logs
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
      return { success: false, message: "SQLite database not found", logs: logs };
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
    logs.push(...uiResult.logs);
    
    return { 
      success: true, 
      message: 'Pro features enabled successfully',
      logs: logs
    };
  } catch (error) {
    logs.push(`❌ Error: ${error.message}`);
    return { 
      success: false, 
      message: `Failed to enable pro features: ${error.message}`,
      logs: logs
    };
  }
};

const main = async () => {
  try {
    console.log("🔄 Starting Cursor Reset Tool...\n");
    
    const { pt } = gp();
    console.log(`ℹ️ Platform detected: ${pt}`);
    console.log("ℹ️ Starting complete reset process...\n");
    
    console.log("📋 Step 1: Resetting Machine ID...");
    const resetResult = await rm();
    if (!resetResult.success) {
      console.error("❌ Machine ID reset failed:");
      console.error(resetResult.message);
      process.exit(1);
    }
    console.log("✅ Machine ID reset completed\n");
    
    console.log("📋 Step 2: Resetting Token Limits...");
    const tokenResult = await bt();
    if (tokenResult.success) {
      console.log("✅ Token limits reset completed");
    } else {
      console.log("⚠️ Token limits reset had issues:", tokenResult.message);
    }
    console.log("");
    
    console.log("📋 Step 3: Disabling Auto-Updates...");
    const updateResult = await du();
    if (updateResult.success) {
      console.log("✅ Auto-updates disabled successfully");
    } else {
      console.log("⚠️ Auto-update disabling had issues:", updateResult.message);
    }
    console.log("");
    
    console.log("📋 Step 4: Enabling Pro Features...");
    const proResult = await ep();
    if (proResult.success) {
      console.log("✅ Pro features enabled successfully");
    } else {
      console.log("⚠️ Pro feature enablement had issues:", proResult.message);
    }
    console.log("");
    
    const finalLogs = await ld(resetResult.logs);
    console.log(finalLogs);
    
    console.log("\n🎉 Cursor reset completed successfully!");
    console.log("ℹ️ You can now restart Cursor IDE");
    console.log("ℹ️ Your machine will appear as a new device");
    
  } catch (error) {
    console.error("❌ Critical error occurred:");
    console.error(error.message);
    process.exit(1);
  }
};

main();