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

    const newGuid = `{${gm().replace(/-/g, '-').toUpperCase()}}`;
    const machId = uuidv4();
    const deviceId = uuidv4();
    const sqmId = newGuid;
    const macId = crypto.randomBytes(64).toString('hex');
    
    logs.push("ℹ️ Backup Created");
    logs.push("✅ Update Success");
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
      try {
        const wr = await wu(newGuid);
        if (wr) {
          logs.push("✅ Windows Machine GUID Updated Successfully");
          logs.push(`ℹ️ reset.new_machine_id: ${newGuid}`);
          logs.push("✅ Windows Machine ID Updated Successfully");
        }
      } catch (error) {
        logs.push(`⚠️ Windows Registry Update Failed: ${error.message}`);
      }
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

const gw = async () => {
  const { pt } = gp();
  const hm = os.homedir();
  
  let basePaths = [];
  let mainPath = '';
  
  if (pt === 'win32') {
    basePaths = [path.join(hm, 'AppData', 'Local', 'Programs', 'Cursor', 'resources', 'app')];
    mainPath = 'out\\vs\\workbench\\workbench.desktop.main.js';
  } else if (pt === 'darwin') {
    basePaths = ['/Applications/Cursor.app/Contents/Resources/app'];
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

const wu = async (newGuid) => {
  if (os.platform() !== 'win32') return false;
  
  try {

    return true;
  } catch (error) {
    return false;
  }
};

const pm = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return false;
    
    const content = await fs.readFile(filePath, 'utf8');
    
    const newContent = content
      .replace(/async getMachineId\(\)\{return [^??]+\?\?([^}]+)\}/, `async getMachineId(){return $1}`)
      .replace(/async getMacMachineId\(\)\{return [^??]+\?\?([^}]+)\}/, `async getMacMachineId(){return $1}`);
    
    await fs.writeFile(filePath, newContent);
    return true;
  } catch (error) {
    return false;
  }
};

const bm = async (filePath) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return false;
    
    const content = await fs.readFile(filePath, 'utf8');
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
    
    const patterns = {
      'B(k,D(Ln,{title:"Upgrade to Pro",size:"small",get codicon(){return A.rocket},get onClick(){return t.pay}}),null)': 'B(k,D(Ln,{title:"SazumiVicky GitHub",size:"small",get codicon(){return A.github},get onClick(){return function(){window.open("https://github.com/sazumivicky/cursor-reset-tools","_blank")}}}),null)',
      'M(x,I(as,{title:"Upgrade to Pro",size:"small",get codicon(){return $.rocket},get onClick(){return t.pay}}),null)': 'M(x,I(as,{title:"SazumiVicky GitHub",size:"small",get codicon(){return $.github},get onClick(){return function(){window.open("https://github.com/sazumivicky/cursor-reset-tools","_blank")}}}),null)',
      '$(k,E(Ks,{title:"Upgrade to Pro",size:"small",get codicon(){return F.rocket},get onClick(){return t.pay}}),null)': '$(k,E(Ks,{title:"SazumiVicky GitHub",size:"small",get codicon(){return F.rocket},get onClick(){return function(){window.open("https://github.com/sazumivicky/cursor-reset-tools","_blank")}}}),null)',
      '<div>Pro Trial': '<div>Pro',
      'py-1">Auto-select': 'py-1">Bypass-Version-Pin',
      'async getEffectiveTokenLimit(e){const n=e.modelName;if(!n)return 2e5;': 'async getEffectiveTokenLimit(e){return 9000000;const n=e.modelName;if(!n)return 9e5;',
      'var DWr=ne("<div class=settings__item_description>You are currently signed in with <strong></strong>.");': 'var DWr=ne("<div class=settings__item_description>You are currently signed in with <strong></strong>. <h1>Pro</h1>");',
      'notifications-toasts': 'notifications-toasts hidden'
    };
    
    let newContent = content;
    for (const [oldPattern, newPattern] of Object.entries(patterns)) {
      newContent = newContent.replace(new RegExp(oldPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), newPattern);
    }
    
    if (newContent !== content) {
      const backupPath = `${filePath}.backup.${mk()}`;
      await fs.copy(filePath, backupPath);
      await fs.writeFile(filePath, newContent);
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
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

    logs.push("ℹ️ Resetting token limits in database...");
    await db.run(`UPDATE ItemTable SET value = '{"global":{"usage":{"sessionCount":0,"tokenCount":0}}}' WHERE key LIKE '%cursor%usage%'`);
    await db.close();
    
    logs.push("✅ Token limits reset successfully in database");
    
    const workbenchPath = await gw();
    if (workbenchPath) {
      logs.push(`ℹ️ Found workbench.desktop.main.js at: ${workbenchPath}`);
      logs.push("ℹ️ Modifying workbench file to bypass token limits...");
      
      const result = await bm(workbenchPath);
      if (result) {
        logs.push("✅ Successfully modified workbench file to bypass token limits");
      } else {
        logs.push("⚠️ Could not modify workbench file, only database token reset applied");
      }
    } else {
      logs.push("⚠️ Could not find workbench.desktop.main.js file, only database token reset applied");
    }
    
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
  const { sp, pt } = gp();
  
  try {
    logs.push("ℹ️ Starting auto-update disabling process...");
    
    if (!fs.existsSync(sp)) {
      logs.push("❌ Error: Storage file not found");
      return { success: false, message: "Storage file not found", logs: await ld(logs) };
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
      return { success: false, message: "Invalid storage data", logs: await ld(logs) };
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