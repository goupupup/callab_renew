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

// GET: Search equipment or fetch lookups / cal history
export async function GET(request: Request) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.role || session.user.role === "USER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");
    const q = searchParams.get("q")?.trim() || "";
    const role = session.user.role;
    const isMaster = role === "MASTER";

    try {
        // ── Lookups ──────────────────────────────────────────
        if (mode === "lookups") {
            const [types, modes, statuses, suppliers, employees] = await Promise.all([
                query<any>(`SELECT TRIM(TYID) as CODE, TRIM(TYNM) as NAME FROM EASYCAL.TBTYPMAN ORDER BY TYID`),
                query<any>(`SELECT TRIM(MOID) as CODE, TRIM(MONM) as NAME FROM EASYCAL.TBMODMAN ORDER BY MOID`),
                query<any>(`SELECT TRIM(STID) as CODE, TRIM(STNM) as NAME FROM EASYCAL.TBSTAMAN ORDER BY STID`),
                query<any>(`SELECT TRIM(COID) as CODE, TRIM(CONM) as NAME FROM EASYCAL.TBSUPMAN ORDER BY CONM`),
                query<any>(`SELECT TRIM(EMID) as CODE, TRIM(EMNM) as NAME FROM EASYCAL.TBEMPMAN ORDER BY EMNM`),
            ]);
            return NextResponse.json({ types, modes, statuses, suppliers, employees });
        }

        // ── Calibration History ──────────────────────────────
        if (mode === "calHistory") {
            const isid = searchParams.get("isid")?.trim();
            if (!isid) return NextResponse.json({ error: "Missing isid" }, { status: 400 });

            const history = await query<any>(
                `SELECT 
                    TRIM(CIDU) as CIDU, 
                    CARD, 
                    TRIM(LOCT) as LOCT, 
                    TRIM(KOLAS_NO) as KOLAS_NO,
                    TRIM(CALNO_EXT) as CALNO_EXT,
                    TRIM(EMID) as EMID
                 FROM EASYCAL.TBCALMAN 
                 WHERE TRIM(ISID) = :isid 
                 ORDER BY CARD DESC`,
                { isid }
            );
            return NextResponse.json(history);
        }

        // ── Search Modes ─────────────────────────────────────
        const baseSelect = `
            SELECT 
                TRIM(m.ISID) as ISID, TRIM(m.ACCN) as ACCN, 
                TRIM(m.SERN) as SERN, TRIM(m.MODL) as MODL, 
                TRIM(m.NAEM_SUP) as NAEM_SUP, TRIM(m.NAEM) as NAEM,
                TRIM(m.MNFC) as MNFC, TRIM(m.CUST) as CUST,
                TRIM(m.MEMO) as MEMO, TRIM(m.ACC1) as ACC1,
                TRIM(m.TYEP) as TYEP, TRIM(m.MODE_CODE) as MODE_CODE,
                TRIM(m.TERM) as TERM, m.LAST, m.NEXT, 
                TRIM(m.STAT) as STAT, TRIM(m.EMID) as EMID,
                TRIM(s.CONM) as MANUFACTURER_NAME,
                TRIM(cust_s.CONM) as CUSTOMER_NAME,
                TRIM(emp.EMNM) as ENGINEER_NAME,
                TRIM(st.DESN) as STATUS_NAME,
                (SELECT TRIM(CIDU) FROM EASYCAL.TBCALMAN c 
                 WHERE TRIM(c.ISID) = TRIM(m.ISID) 
                 AND ROWNUM = 1
                 AND c.CIDU = (SELECT MAX(c2.CIDU) FROM EASYCAL.TBCALMAN c2 WHERE TRIM(c2.ISID) = TRIM(m.ISID))
                ) as LATEST_CALNO
            FROM EASYCAL.TBMASMAN m
            LEFT JOIN EASYCAL.TBSUPMAN s ON TRIM(m.MNFC) = TRIM(s.COID)
            LEFT JOIN EASYCAL.TBSUPMAN cust_s ON TRIM(m.CUST) = TRIM(cust_s.COID)
            LEFT JOIN EASYCAL.TBEMPMAN emp ON TRIM(m.EMID) = TRIM(emp.EMID)
            LEFT JOIN EASYCAL.TBSTAMAN st ON TRIM(m.STAT) = TRIM(st.STAT)
        `;

        let whereSql = " WHERE 1=1";
        const params: any = {};

        if (mode === "regNo") {
            if (!q) return NextResponse.json([]);
            whereSql += ` AND UPPER(TRIM(m.ISID)) = UPPER(:q)`;
            params.q = q;
        } else if (mode === "asset") {
            if (!q) return NextResponse.json([]);
            whereSql += ` AND UPPER(TRIM(m.ACCN)) LIKE '%' || UPPER(:q) || '%'`;
            params.q = q;
        } else if (mode === "sn") {
            if (!q) return NextResponse.json([]);
            whereSql += ` AND UPPER(TRIM(m.SERN)) LIKE '%' || UPPER(:q) || '%'`;
            params.q = q;
        } else if (mode === "calNo") {
            if (!q) return NextResponse.json([]);
            // Search via TBCALMAN to find ISID, then get equipment
            whereSql += ` AND TRIM(m.ISID) IN (SELECT TRIM(ISID) FROM EASYCAL.TBCALMAN WHERE UPPER(TRIM(CIDU)) = UPPER(:q))`;
            params.q = q;
        } else if (mode === "model") {
            if (!q) return NextResponse.json([]);
            whereSql += ` AND UPPER(TRIM(m.MODL)) LIKE '%' || UPPER(:q) || '%'`;
            params.q = q;
        } else if (mode === "ongoing") {
            whereSql += ` AND m.STAT IN ('02', '11', '05', '07')`;
        } else if (mode === "expirations") {
            whereSql += ` AND m.NEXT < TO_CHAR(SYSDATE, 'YYYYMMDD') AND m.NEXT != '0' AND m.NEXT IS NOT NULL`;
        } else {
            return NextResponse.json({ error: "Invalid mode" }, { status: 400 });
        }

        const innerSql = `${baseSelect} ${whereSql} ORDER BY m.ISID ASC`;
        const sql = `SELECT * FROM (${innerSql}) WHERE ROWNUM <= 200`;
        const results = await query<any>(sql, params);
        return NextResponse.json(results);

    } catch (error: any) {
        console.error("Search API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT: Update equipment record
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions) as any;
    const role = session?.user?.role;
    if (!role || role === "USER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const isMaster = role === "MASTER";

    try {
        const body = await request.json();
        const { isid, naemSup, accn, sern, memo, acc1, tyep, modeCode, term, cust, last, next } = body;

        if (!isid) return NextResponse.json({ error: "Missing ISID" }, { status: 400 });

        const conn = await oracledb.getConnection(dbConfig);
        try {
            let sql = `
                UPDATE EASYCAL.TBMASMAN SET
                    NAEM_SUP = :naemSup,
                    ACCN = :accn,
                    SERN = :sern,
                    MEMO = :memo,
                    ACC1 = :acc1,
                    TYEP = :tyep,
                    MODE_CODE = :modeCode,
                    TERM = :term,
                    CUST = :cust
            `;

            const bindParams: any = {
                naemSup: naemSup || null,
                accn: accn || null,
                sern: sern || null,
                memo: memo || null,
                acc1: acc1 || null,
                tyep: tyep || null,
                modeCode: modeCode || null,
                term: term || null,
                cust: cust || null,
                isid,
            };

            // Master-only fields
            if (isMaster) {
                sql += `, LAST = :last, NEXT = :next`;
                bindParams.last = last || null;
                bindParams.next = next || null;
            }

            sql += ` WHERE TRIM(ISID) = :isid`;

            await conn.execute(sql, bindParams, { autoCommit: true });
            return NextResponse.json({ success: true });
        } finally {
            await conn.close();
        }
    } catch (error: any) {
        console.error("Search PUT Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
