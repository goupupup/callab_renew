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

        // 3. Check Log Table
        console.log("Checking log table candidates...");
        const logTabs = await conn.execute(`
            SELECT table_name FROM all_tables 
            WHERE owner = 'EASYCAL' AND table_name LIKE '%MAN_LOG'
        `);
        console.log("Log Tables found:", logTabs.rows);

        for (const tab of logTabs.rows) {
            const table_name = tab[0];
            const cols = await conn.execute(`
                SELECT column_name, data_type, data_length 
                FROM all_tab_columns 
                WHERE table_name = :tab AND owner = 'EASYCAL'
                ORDER BY column_id
            `, { tab: table_name });
            console.log(`Columns for ${table_name}:`, cols.rows);
        }

    } catch (err) {
        console.error(err);
    } finally {
        if (conn) {
            try { await conn.close(); } catch (e) { }
        }
    }
}

main();
