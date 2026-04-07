const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
const backupDir = path.join(__dirname, '..', 'backups');

if (fs.existsSync(dbPath)) {
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    const now = new Date();
    // Format: YYYY-MM-DD_HH-MM
    const dateStr = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('-') + '_' + [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0')
    ].join('-');

    const backupFile = path.join(backupDir, `dev_${dateStr}.db`);
    
    try {
        fs.copyFileSync(dbPath, backupFile);
        console.log(`✅ [Hardsoft Backup] Base de datos respaldada correctamente: backups/dev_${dateStr}.db`);
        
        // Optional: Keep only last 10 backups to prevent disk full
        const backups = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('dev_') && f.endsWith('.db'))
            .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time);

        if (backups.length > 20) {
            const toDelete = backups.slice(20);
            for (const rm of toDelete) {
                fs.unlinkSync(path.join(backupDir, rm.name));
            }
        }
    } catch (e) {
        console.error("❌ [Hardsoft Backup] Error al crear el backup de la base de datos:", e);
    }
} else {
    console.log("ℹ️ [Hardsoft Backup] No se encontró prisma/dev.db, omitiendo respaldo.");
}
