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

        console.log("Sampling TBSCHMAN data...");
        const res = await connection.execute(
            `SELECT * FROM (SELECT * FROM EASYCAL.TBSCHMAN ORDER BY STARTDATE DESC) WHERE ROWNUM <= 5`
        );
        console.log(JSON.stringify(res.rows, null, 2));

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
