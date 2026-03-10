const oracledb = require('oracledb');
require('dotenv').config();

if (process.env.ORACLE_LIB_DIR) {
    try { oracledb.initOracleClient({ libDir: process.env.ORACLE_LIB_DIR }); } catch (e) { }
} else if (process.platform === 'win32') {
    try { oracledb.initOracleClient(); } catch (e) { }
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

        // Check TBMASMAN columns
        const r1 = await conn.execute("SELECT column_name FROM all_tab_columns WHERE table_name = 'TBMASMAN' AND owner = 'EASYCAL'");
        console.log("TBMASMAN COLUMNS:", r1.rows.map(row => row[0]).join(', '));

        // Check TBSTAMAN columns
        const r2 = await conn.execute("SELECT column_name FROM all_tab_columns WHERE table_name = 'TBSTAMAN' AND owner = 'EASYCAL'");
        console.log("TBSTAMAN COLUMNS:", r2.rows.map(row => row[0]).join(', '));

        // Check TBTYPMAN columns
        const r3 = await conn.execute("SELECT column_name FROM all_tab_columns WHERE table_name = 'TBTYPMAN' AND owner = 'EASYCAL'");
        console.log("TBTYPMAN COLUMNS:", r3.rows.map(row => row[0]).join(', '));

        // Check TBSUPMAN columns to confirm COT2
        const r4 = await conn.execute("SELECT column_name FROM all_tab_columns WHERE table_name = 'TBSUPMAN' AND owner = 'EASYCAL'");
        console.log("TBSUPMAN COLUMNS:", r4.rows.map(row => row[0]).join(', '));

    } catch (err) {
        console.error("Diagnostic Error:", err);
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) { }
        }
    }
}
run();
