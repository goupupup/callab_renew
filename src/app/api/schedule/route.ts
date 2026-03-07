import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import oracledb from "oracledb";

const dbConfig = {
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASS,
    connectString: process.env.ORACLE_CONN_STR?.includes("(")
        ? process.env.ORACLE_CONN_STR
        : `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=172.20.25.2)(PORT=1521))(CONNECT_DATA=(SID=XE)))`,
};

// GET: Fetch schedules and employees
export async function GET(request: Request) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.role || session.user.role === "USER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");

    try {
        if (mode === "employees") {
            const employees = await query<any>(
                `SELECT TRIM(EMID) as ID, TRIM(EMNM) as NAME FROM EASYCAL.TBEMPMAN ORDER BY NAME ASC`
            );
            return NextResponse.json(employees);
        }

        // Default: Fetch Schedules (Last 6 months to upcoming)
        const schedules = await query<any>(
            `SELECT 
                STARTDATE, ENDDATE, SCH_TYPE, DIVISION, MEMO, 
                TRIM(EMID1) as EMID1, TRIM(EMID2) as EMID2, TRIM(EMID3) as EMID3, 
                TRIM(EMID4) as EMID4, TRIM(EMID5) as EMID5, TRIM(SCHID) as SCHID 
             FROM EASYCAL.TBSCHMAN 
             WHERE STARTDATE >= ADD_MONTHS(SYSDATE, -6)
             ORDER BY STARTDATE DESC`
        );
        return NextResponse.json(schedules);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST: Register Schedule (MASTER only)
export async function POST(request: Request) {
    const session = await getServerSession(authOptions) as any;
    if (session?.user?.role !== "MASTER") {
        return NextResponse.json({ error: "Access Denied: Master Role Required" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { startDate, endDate, schType, division, memo, emid1, emid2, emid3, emid4, emid5 } = body;

        const conn = await oracledb.getConnection(dbConfig);
        try {
            // Get next SCHID
            const idRes = await conn.execute(`SELECT MAX(TO_NUMBER(TRIM(SCHID))) as MAX_ID FROM EASYCAL.TBSCHMAN`);
            const nextId = (idRes.rows[0] as any).MAX_ID ? (idRes.rows[0] as any).MAX_ID + 1 : 1;

            const sql = `
                INSERT INTO EASYCAL.TBSCHMAN (
                    STARTDATE, ENDDATE, SCH_TYPE, DIVISION, MEMO, 
                    EMID1, EMID2, EMID3, EMID4, EMID5, SCHID
                ) VALUES (
                    TO_DATE(:startDate, 'YYYY-MM-DD'), TO_DATE(:endDate, 'YYYY-MM-DD'), :schType, :division, :memo,
                    :emid1, :emid2, :emid3, :emid4, :emid5, :schId
                )
            `;

            await conn.execute(sql, {
                startDate, endDate, schType, division, memo,
                emid1, emid2, emid3, emid4, emid5,
                schId: nextId.toString().padEnd(4, ' ')
            }, { autoCommit: true });

            return NextResponse.json({ success: true, id: nextId });
        } finally {
            await conn.close();
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update Schedule (MASTER only)
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions) as any;
    if (session?.user?.role !== "MASTER") {
        return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { startDate, endDate, schType, division, memo, emid1, emid2, emid3, emid4, emid5, schId } = body;

        const conn = await oracledb.getConnection(dbConfig);
        try {
            const sql = `
                UPDATE EASYCAL.TBSCHMAN SET
                    STARTDATE = TO_DATE(:startDate, 'YYYY-MM-DD'),
                    ENDDATE = TO_DATE(:endDate, 'YYYY-MM-DD'),
                    SCH_TYPE = :schType,
                    DIVISION = :division,
                    MEMO = :memo,
                    EMID1 = :emid1,
                    EMID2 = :emid2,
                    EMID3 = :emid3,
                    EMID4 = :emid4,
                    EMID5 = :emid5
                WHERE TRIM(SCHID) = :schId
            `;

            await conn.execute(sql, {
                startDate, endDate, schType, division, memo,
                emid1, emid2, emid3, emid4, emid5, schId
            }, { autoCommit: true });

            return NextResponse.json({ success: true });
        } finally {
            await conn.close();
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE: (MASTER only)
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions) as any;
    if (session?.user?.role !== "MASTER") {
        return NextResponse.json({ error: "Access Denied" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const schId = searchParams.get("id");

    try {
        const conn = await oracledb.getConnection(dbConfig);
        try {
            await conn.execute(`DELETE FROM EASYCAL.TBSCHMAN WHERE TRIM(SCHID) = :schId`, { schId }, { autoCommit: true });
            return NextResponse.json({ success: true });
        } finally {
            await conn.close();
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
