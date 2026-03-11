const oracledb = require('oracledb');
require('dotenv').config();
if (process.env.ORACLE_LIB_DIR) { oracledb.initOracleClient({ libDir: process.env.ORACLE_LIB_DIR }); }
else if (process.platform === 'win32') { oracledb.initOracleClient(); }

async function run() {
    let conn;
    try {
        conn = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASS,
            connectString: process.env.ORACLE_CONN_STR
        });
        const res = await conn.execute(`SELECT column_name FROM all_tab_columns WHERE table_name = 'TBMASMAN' AND owner = 'EASYCAL'`);
        process.stdout.write(res.rows.flat().join(', '));
    } catch (err) {
        process.stderr.write(err.message);
    } finally {
        if (conn) await conn.close();
    }
}
run();
