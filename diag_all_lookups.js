const oracledb = require('oracledb');
require('dotenv').config();

if (process.env.ORACLE_LIB_DIR) {
    try { oracledb.initOracleClient({ libDir: process.env.ORACLE_LIB_DIR }); } catch (e) {}
} else if (process.platform === 'win32') {
    try { oracledb.initOracleClient(); } catch (e) {}
}

async function run() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASS,
            connectString: process.env.ORACLE_CONN_STR.includes("(") 
                ? process.env.ORACLE_CONN_STR 
                : `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.20.25.2)(PORT=1521))(CONNECT_DATA=(SID=XE)))`
        });
        
        const tables = ['TBTYPMAN', 'TBMODMAN', 'TBSTAMAN', 'TBSUPMAN', 'TBEMPMAN'];
        for (const t of tables) {
            try {
                const res = await conn.execute(`SELECT COUNT(*) FROM EASYCAL.${t}`);
                console.log(`✅ ${t}: ${res.rows[0][0]} rows`);
            } catch (e) {
                console.error(`❌ ${t}: Error - ${e.message}`);
            }
        }

        // Specifically check TBMODMAN MOID/MONM
        try {
            const res = await conn.execute(`SELECT column_name FROM all_tab_columns WHERE table_name = 'TBMODMAN' AND owner = 'EASYCAL'`);
            console.log(`TBMODMAN Columns:`, res.rows.map(r => r[0]).join(', '));
        } catch (e) {}

        // Specifically check TBEMPMAN EMID/EMNM
        try {
            const res = await conn.execute(`SELECT column_name FROM all_tab_columns WHERE table_name = 'TBEMPMAN' AND owner = 'EASYCAL'`);
            console.log(`TBEMPMAN Columns:`, res.rows.map(r => r[0]).join(', '));
        } catch (e) {}

    } catch (err) {
        console.error("Connection Error:", err);
    } finally {
        if (conn) { await conn.close(); }
    }
}
run();
