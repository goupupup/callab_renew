const oracledb = require('oracledb');
require('dotenv').config();

const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASS,
    connectString: process.env.ORACLE_CONN_STR
};

async function main() {
    let conn;
    try {
        conn = await oracledb.getConnection(dbConfig);
        console.log("Connected to database");

        // 1. Get columns
        const colsRes = await conn.execute(`
            SELECT column_name FROM all_tab_columns 
            WHERE table_name = 'TBMASMAN' AND owner = 'EASYCAL'
        `);
        console.log("Columns:", colsRes.rows.map(r => r[0]).join(', '));

        // 2. Sample data
        const dataRes = await conn.execute(`
            SELECT * FROM EASYCAL.TBMASMAN FETCH FIRST 1 ROWS ONLY
        `, [], { outFormat: oracledb.OUT_FORMAT_OBJECT });
        console.log("Sample Data:", JSON.stringify(dataRes.rows[0], null, 2));

        // 3. Status/Type lookups content
        const typesRes = await conn.execute(`SELECT * FROM EASYCAL.TBTYPMAN`);
        console.log("TBTYPMAN:", JSON.stringify(typesRes.rows, null, 2));

        const statusRes = await conn.execute(`SELECT * FROM EASYCAL.TBSTAMAN`);
        console.log("TBSTAMAN:", JSON.stringify(statusRes.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) { }
        }
    }
}

main();
