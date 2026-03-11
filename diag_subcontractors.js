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

        console.log("Checking TBSUPMAN for COT2='1' entries...");
        const res = await conn.execute(`SELECT TRIM(COID) as id, TRIM(CONM) as name, TRIM(COT2) as cot2 FROM EASYCAL.TBSUPMAN WHERE TRIM(COT2) = '1' AND ROWNUM <= 10`);
        console.log("Results for COT2='1':", res.rows);

        const all = await conn.execute(`SELECT DISTINCT TRIM(COT2) FROM EASYCAL.TBSUPMAN`);
        console.log("Distinct COT2 values:", all.rows);

    } catch (err) {
        console.error("Error:", err);
    } finally {
        if (conn) { await conn.close(); }
    }
}
run();
