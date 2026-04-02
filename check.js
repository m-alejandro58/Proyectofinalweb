const fs = require('fs');
const path = require('path');
const t = 'd:\\OneDrive\\HARDSOFT\\Aplicacion_Hardsoft_2026\\src\\app\\actions';

fs.readdirSync(t).forEach(f => {
    if (!f.endsWith('.ts')) return;
    const c = fs.readFileSync(path.join(t, f), 'utf8');
    const rx = /export\s+async\s+function\s+(\w+)/g;
    let m;
    while (m = rx.exec(c)) {
        const fx = m[1];
        
        // Find the start of the function body
        const bodyStart = c.indexOf('{', m.index);
        if (bodyStart === -1) continue;
        
        // We just check the first 100 characters of the body for requireAuth or requireAdminSession
        const bodyStartSnippet = c.substring(bodyStart, bodyStart + 150);
        
        if (!bodyStartSnippet.includes('requireAuth') && !bodyStartSnippet.includes('requireAdminSession')) {
            console.log(f + ': ' + fx);
        }
    }
});
