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

        async function check(table) {
            console.log(`\n--- Schema for ${table} ---`);
            const res = await conn.execute(`SELECT column_name FROM all_tab_columns WHERE table_name = '${table}' AND owner = 'EASYCAL'`);
            console.log(res.rows.map(r => r[0]));
        }

        await check('TBSTAMAN');
        await check('TBTYPMAN');
        await check('TBSUPMAN');

    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (conn) { await conn.close(); }
    }
}
run();
