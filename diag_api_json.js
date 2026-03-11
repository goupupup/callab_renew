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

        async function fetch(sql) {
            const res = await conn.execute(sql, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
            return res.rows;
        }

        const types = await fetch(`SELECT DISTINCT TRIM(TYEP) as CODE, TRIM(TYEP) || TRIM(DESN) as NAME FROM EASYCAL.TBTYPMAN ORDER BY CODE`);
        const statuses = await fetch(`SELECT DISTINCT TRIM(STAT) as CODE, TRIM(STAT) || TRIM(DESN) as NAME FROM EASYCAL.TBSTAMAN ORDER BY CODE`);
        const subcontractors = await fetch(`SELECT DISTINCT TRIM(CONM) as CODE, TRIM(CONM) as NAME FROM EASYCAL.TBSUPMAN WHERE TRIM(COT2) = '1' ORDER BY NAME`);

        console.log("JSON Result Sample:");
        console.log(JSON.stringify({
            types: types.slice(0, 2),
            statuses: statuses.slice(0, 2),
            subcontractors: subcontractors.slice(0, 2)
        }, null, 2));

    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (conn) { await conn.close(); }
    }
}
run();
