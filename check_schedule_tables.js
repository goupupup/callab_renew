const oracledb = require('oracledb');
require('dotenv').config();

try {
    oracledb.initOracleClient();
} catch (err) {
    if (!err.message.includes('NJS-077')) console.error(err);
}

async function run() {
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: process.env.ORACLE_USER,
            password: process.env.ORACLE_PASS,
            connectString: process.env.ORACLE_CONN_STR?.includes("(")
                ? process.env.ORACLE_CONN_STR
                : `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.20.25.2)(PORT=1521))(CONNECT_DATA=(SID=XE)))`
        });

        console.log("--- TBSCHMAN Structure ---");
        const res1 = await connection.execute(
            `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
             FROM ALL_TAB_COLUMNS 
             WHERE OWNER = 'EASYCAL' AND TABLE_NAME = 'TBSCHMAN'
             ORDER BY COLUMN_ID`
        );
        console.log(JSON.stringify(res1.rows, null, 2));

        console.log("\n--- TBEMPMAN Structure ---");
        const res2 = await connection.execute(
            `SELECT COLUMN_NAME, DATA_TYPE, DATA_LENGTH, NULLABLE 
             FROM ALL_TAB_COLUMNS 
             WHERE OWNER = 'TBMASMAN' AND TABLE_NAME = 'TBEMPMAN'
             ORDER BY COLUMN_ID`
        );
        console.log(JSON.stringify(res2.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error(err);
            }
        }
    }
}

run();
