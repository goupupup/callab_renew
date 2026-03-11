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
        const connectString = process.env.ORACLE_CONN_STR?.includes("(")
            ? process.env.ORACLE_CONN_STR
            : `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.20.25.2)(PORT=1521))(CONNECT_DATA=(SID=XE)))`;

        conn = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASS,
            connectString: connectString
        });
        const res = await conn.execute(`SELECT column_name FROM all_tab_columns WHERE table_name = 'TBMASMAN' AND owner = 'EASYCAL'`);
        console.log(res.rows.flat().join(', '));
        
        // Let's also peek at the data to see what the registration identifier is
        const firstRow = await conn.execute(`SELECT * FROM EASYCAL.TBMASMAN WHERE ROWNUM = 1`, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        console.log("First row data keys:", Object.keys(firstRow.rows[0]));
        console.log("First row sample:", firstRow.rows[0]);

    } catch (err) {
        console.error(err.message);
    } finally {
        if (conn) await conn.close();
    }
}
run();
