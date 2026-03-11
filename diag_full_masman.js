const oracledb = require('oracledb');
require('dotenv').config();
if (process.env.ORACLE_LIB_DIR) { try { oracledb.initOracleClient({ libDir: process.env.ORACLE_LIB_DIR }); } catch(e){} }
else if (process.platform === 'win32') { try { oracledb.initOracleClient(); } catch(e){} }

async function run() {
    let conn;
    try {
        const cs = process.env.ORACLE_CONN_STR.includes('(') ? process.env.ORACLE_CONN_STR : '(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.20.25.2)(PORT=1521))(CONNECT_DATA=(SID=XE)))';
        conn = await oracledb.getConnection({ user: process.env.ORACLE_USER, password: process.env.ORACLE_PASS, connectString: cs });
        const res = await conn.execute(`SELECT column_name FROM all_tab_columns WHERE table_name = 'TBMASMAN' AND owner = 'EASYCAL'`);
        require('fs').writeFileSync('tmp_columns.txt', res.rows.flat().join('\n'));
        console.log("Written to tmp_columns.txt");
    } catch (err) {
        console.error(err.message);
    } finally {
        if (conn) await conn.close();
    }
}
run();
