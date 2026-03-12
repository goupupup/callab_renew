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

// GET: Search equipment or fetch lookups
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
            const [types, modes, statuses, suppliers, employees, subcontractors] = await Promise.all([
                query<any>(`SELECT DISTINCT TRIM(TYEP) as CODE, '[' || TRIM(TYEP) || '] ' || TRIM(DESN) as NAME FROM EASYCAL.TBTYPMAN WHERE TYEP IS NOT NULL ORDER BY CODE`),
                query<any>(`SELECT DISTINCT TRIM(MODE_CODE) as CODE, '[' || TRIM(MODE_CODE) || '] ' || TRIM(MODE_DESC) as NAME FROM EASYCAL.TBMODMAN WHERE MODE_CODE IS NOT NULL ORDER BY CODE`),
                query<any>(`SELECT DISTINCT TRIM(STAT) as CODE, '[' || TRIM(STAT) || '] ' || TRIM(DESN) as NAME FROM EASYCAL.TBSTAMAN WHERE STAT IS NOT NULL ORDER BY CODE`),
                query<any>(`SELECT DISTINCT TRIM(COID) as CODE, TRIM(CONM) as NAME FROM EASYCAL.TBSUPMAN ORDER BY NAME`),
                query<any>(`SELECT DISTINCT TRIM(EMID) as CODE, TRIM(EMNM) as NAME FROM EASYCAL.TBEMPMAN ORDER BY NAME`),
                query<any>(`SELECT DISTINCT TRIM(CONM) as CODE, TRIM(CONM) as NAME FROM EASYCAL.TBSUPMAN WHERE TRIM(COT2) = '1' AND CONM IS NOT NULL ORDER BY NAME`),
            ]);
            return NextResponse.json({ types, modes, statuses, suppliers, employees, subcontractors });
        }

        // ── Calibration History (Specific for REG NO detail) ──
        if (mode === "calHistory") {
            const id = (searchParams.get("isid") || searchParams.get("id"))?.trim();
            if (!id) return NextResponse.json({ error: "ISID required" }, { status: 400 });
            
            const history = await query<any>(`
                SELECT 
                    A.CIDU,
                    A.KOLAS_NO,
                    A.CASD,
                    A.CARD,
                    B.EMNM AS ENGINEER,
                    C.CONM AS SALE_COMPANY, 
                    D.CONM AS SUBCON, 
                    A.CALNO_EXT,
                    A.CANCEL_RSN,
                    CASE
                        WHEN E.EMID IS NOT NULL THEN '[' || TRIM(E.EMID) || '] ' || E.EMNM
                    END AS CANCEL_PERSON
                FROM EASYCAL.TBCALMAN A
                LEFT JOIN EASYCAL.TBEMPMAN B ON A.EMID = B.EMID
                LEFT JOIN EASYCAL.TBSUPMAN C ON A.SALE_CCOM = C.COID
                LEFT JOIN EASYCAL.TBSUPMAN D ON A.EXTN = D.COID
                LEFT JOIN EASYCAL.TBEMPMAN E ON A.PREN = E.EMID
                WHERE TRIM(A.ISID) = :id
                ORDER BY A.CIDU DESC
            `, { id });
            return NextResponse.json(history);
        }

        // ── Main Search ──────────────────────────────────────
        let sql = `
            SELECT 
                a.ISID,
                a.NAEM_SUP,
                a.NAEM,
                a.MODL,
                a.SERN,
                a.ACCN,
                a.STAT as STAT,
                a.TYEP as TYEP,
                a.MODE_CODE as MODE_CODE,
                a.TERM,
                a.LAST,
                a.NEXT,
                a.CUST,
                a.MEMO,
                a.ACC1,
                a.SELF,
                a.EXTN,
                a.DPCD,
                a.OWNM,
                a.COST_EXE,
                a.COST_CAL,
                a.CALN,
                a.EXER,
                a.SPC1,
                b.CONM as MANUFACTURE,
                c.CONM as APPLICANT,
                d.DESN as DIVN,
                e.DESN as DEPART,
                '[' || f.MODE_CODE || '] ' || f.MODE_DESC as MODE_NAME_SNIPPET,
                '[' || g.TYEP || '] ' || g.DESN as TYPE_NAME_SNIPPET,
                h.CONM as SUBCONTRACTOR_NAME,
                '[' || TRIM(j.EMID) || '] ' || j.EMNM as LATEST_ENGINEER_NAME,
                '[' || TRIM(k.EMID) || '] ' || k.EMNM as ASSISTANCE,
                l.DESN as STATUS_NAME,
                '[' || TRIM(f.MODE_CODE) || '] ' || f.MODE_DESC as MODE_NAME, 
                (SELECT MAX(CIDU) FROM EASYCAL.TBCALMAN WHERE ISID = a.ISID) as LATEST_CALNO
            FROM EASYCAL.TBMASMAN a
            LEFT JOIN EASYCAL.TBSUPMAN b ON a.MNFC = b.COID
            LEFT JOIN EASYCAL.TBSUPMAN c ON a.CUST = c.COID
            LEFT JOIN EASYCAL.TBOWNDIV d ON (a.CUST = d.CUST AND a.DIVN = d.DIVN)
            LEFT JOIN EASYCAL.TBOWNPAT e ON (a.CUST = e.CUST AND a.PART = e.PART)
            LEFT JOIN EASYCAL.TBMODMAN f ON (a.MODE_CODE = f.MODE_CODE)
            LEFT JOIN EASYCAL.TBTYPMAN g ON (a.TYEP = g.TYEP)
            LEFT JOIN EASYCAL.TBSUPMAN h ON (a.EXTN = h.COID)
            LEFT JOIN EASYCAL.TBEMPMAN i ON (a.EQIP = i.EMID)
            LEFT JOIN EASYCAL.TBEMPMAN j ON (a.EMID = j.EMID)
            LEFT JOIN EASYCAL.TBEMPMAN k ON (a.ACTU = k.EMID)
            LEFT JOIN EASYCAL.TBSTAMAN l ON (a.STAT = l.STAT)
            WHERE 1=1
        `;
        const params: any = {};

        if (!isMaster) {
            sql += ` AND a.CUST = :corpId`;
            params.corpId = session.user.corpId;
        }

        if (mode === "regNo") {
            sql += ` AND TRIM(UPPER(a.ISID)) = UPPER(:q)`;
            params.q = q;
        } else if (mode === "asset") {
            sql += ` AND UPPER(a.ACCN) LIKE UPPER(:q)`;
            params.q = `%${q}%`;
        } else if (mode === "sn") {
            sql += ` AND UPPER(a.SERN) LIKE UPPER(:q)`;
            params.q = `%${q}%`;
        } else if (mode === "calNo") {
            sql += ` AND a.ISID IN (SELECT ISID FROM EASYCAL.TBCALMAN WHERE UPPER(CIDU) LIKE UPPER(:q))`;
            params.q = `%${q}%`;
        } else if (mode === "model") {
            sql += ` AND (UPPER(a.MODL) LIKE UPPER(:q) OR UPPER(a.NAEM_SUP) LIKE UPPER(:q) OR UPPER(a.NAEM) LIKE UPPER(:q))`;
            params.q = `%${q}%`;
        } else if (mode === "ongoing") {
            sql += ` AND a.ISID IN (SELECT ISID FROM EASYCAL.TBCALMAN WHERE PROS = '0')`;
        } else if (mode === "expirations") {
            sql += ` AND a.NEXT <= TO_CHAR(SYSDATE + 30, 'YYYYMMDD') AND a.NEXT >= TO_CHAR(SYSDATE - 365, 'YYYYMMDD')`;
        }

        sql += ` ORDER BY a.ISID DESC`;

        const rows = await query<any>(sql, params);
        return NextResponse.json(rows);

    } catch (err: any) {
        console.error("❌ [API ERROR]:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PUT: Update equipment mapping
export async function PUT(request: Request) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.role || session.user.role === "USER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const body = await request.json();
        const { ISID, STAT, TYEP, MODE_CODE, TERM, LAST, NEXT, CUST, MEMO, ACC1, SELF, EXTN, NAEM_SUP, ACCN, SERN } = body;

        if (!ISID) return NextResponse.json({ error: "ISID is required" }, { status: 400 });

        const sql = `
            UPDATE EASYCAL.TBMASMAN 
            SET 
                STAT = :stat,
                TYEP = :tyep,
                MODE_CODE = :modeCode,
                TERM = :term,
                LAST = :last,
                NEXT = :next,
                CUST = :cust,
                MEMO = :memo,
                ACC1 = :acc1,
                SELF = :self,
                EXTN = :extn,
                NAEM_SUP = :naemSup,
                ACCN = :accn,
                SERN = :sern
            WHERE ISID = :isid
        `;

        const connection = await oracledb.getConnection(dbConfig);
        await connection.execute(sql, {
            stat: STAT,
            tyep: TYEP,
            modeCode: MODE_CODE,
            term: TERM,
            last: LAST,
            next: NEXT,
            cust: CUST,
            memo: MEMO,
            acc1: ACC1,
            self: SELF,
            extn: EXTN,
            naemSup: NAEM_SUP,
            accn: ACCN,
            sern: SERN,
            isid: ISID
        }, { autoCommit: true });
        await connection.close();

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("❌ [PUT ERROR]:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
