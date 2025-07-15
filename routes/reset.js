import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { machineIdSync } from 'node-machine-id';
import sqlite3 from 'node-sqlite3-wasm';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ... (keep any existing helper functions)

router.get('/status', async (req, res) => {
    // ... (keep existing status code)
});

router.post('/reset', async (req, res) => {
    const logs = [];
    try {
        // ... (keep existing code until SQLite section)

        if (fs.existsSync(dp)) {
            await wb(dp);
            
            try {
                // Create a promise wrapper for SQLite operations
                const dbOps = new Promise((resolve, reject) => {
                    const db = new sqlite3.Database(dp, (err) => {
                        if (err) reject(err);
                    });

                    const queries = [
                        [`UPDATE ItemTable SET value = ? WHERE key LIKE '%telemetry.devDeviceId%'`, [`"${deviceId}"`]],
                        [`UPDATE ItemTable SET value = ? WHERE key LIKE '%telemetry.macMachineId%'`, [`"${macId}"`]],
                        [`UPDATE ItemTable SET value = ? WHERE key LIKE '%telemetry.machineId%'`, [`"${cs(machId)}"`]],
                        [`UPDATE ItemTable SET value = ? WHERE key LIKE '%telemetry.sqmId%'`, [`"${sqmId}"`]],
                        [`UPDATE ItemTable SET value = ? WHERE key LIKE '%storage.serviceMachineId%'`, [`"${deviceId}"`]],
                        [`UPDATE ItemTable SET value = ? WHERE key LIKE '%cursor%usage%'`, ['{"global":{"usage":{"sessionCount":0,"tokenCount":0}}}']], 
                        [`UPDATE ItemTable SET value = ? WHERE key LIKE '%cursor%tier%'`, ['"pro"']],
                        [`DELETE FROM ItemTable WHERE key LIKE '%cursor.lastUpdateCheck%'`, []],
                        [`DELETE FROM ItemTable WHERE key LIKE '%cursor.trialStartTime%'`, []],
                        [`DELETE FROM ItemTable WHERE key LIKE '%cursor.trialEndTime%'`, []]
                    ];

                    db.serialize(() => {
                        queries.forEach(([sql, params]) => {
                            db.run(sql, params, (err) => {
                                if (err) reject(err);
                            });
                        });
                        
                        db.close((err) => {
                            if (err) reject(err);
                            resolve();
                        });
                    });
                });

                await dbOps;
                logs.push("✅ SQLite Database Updated Successfully");
            } catch (err) {
                logs.push(`⚠️ SQLite Update Error: ${err.message}`);
            }
        } else {
            logs.push("⚠️ SQLite Database not found, skipping database updates");
        }

        // ... (keep remaining code)

        res.json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message, logs });
    }
});

export default router;
