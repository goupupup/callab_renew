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
                query<any>(`SELECT DISTINCT TRIM(EMID) as CODE, TRIM(EMNM) as NAME FROM EASYCAL.TBEMPMAN WHERE DIVISION LIKE '%#CAL%' AND TRIM(STAT) <> 'Retiree' ORDER BY NAME`),
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

        if (mode === "masterSearch") {
            const name = searchParams.get("name")?.trim() || "";
            const model = searchParams.get("model")?.trim() || "";
            const manufacturer = searchParams.get("manufacturer")?.trim() || "";

            let masterSql = `
                SELECT 
                    TRIM(A.EQPNAM) as EQPNAM,
                    TRIM(A.MDLNAM) as MDLNAM,
                    TRIM(B.CONM) as MNFCTR,
                    TRIM(A.MNFCTR) as MNFC,
                    TRIM(A.CALTRM) as CALTRM,
                    TRIM(A.SELF) as SELF,
                    TRIM(A.MODE_CODE) as MODE_CODE,
                    TRIM(A.CLSMAN_EXT) as CLSMAN_EXT,
                    TRIM(A.MDLNO) as MDLNO
                FROM EASYCAL.TBMDLMAN A
                LEFT JOIN EASYCAL.TBSUPMAN B ON A.MNFCTR = B.COID
                WHERE 1=1
            `;
            const masterParams: any = {};

            if (name) {
                masterSql += ` AND UPPER(A.EQPNAM) LIKE :name`;
                masterParams.name = `%${name.toUpperCase()}%`;
            }
            if (model) {
                masterSql += ` AND UPPER(A.MDLNAM) LIKE :model`;
                masterParams.model = `%${model.toUpperCase()}%`;
            }
            if (manufacturer) {
                masterSql += ` AND (A.MNFCTR = :manu OR UPPER(B.CONM) LIKE :manuName)`;
                masterParams.manu = manufacturer;
                masterParams.manuName = `%${manufacturer.toUpperCase()}%`;
            }

            masterSql += ` ORDER BY A.EQPNAM ASC`;
            const masterRows = await query<any>(masterSql, masterParams);
            return NextResponse.json(masterRows);
        }

        if (mode === "advancedHistory") {
            const isid = searchParams.get("isid")?.trim() || "";
            const calNo = searchParams.get("calNo")?.trim() || "";
            const asset = searchParams.get("asset")?.trim() || "";
            const ccom = searchParams.get("ccom")?.trim() || "";
            const emid = searchParams.get("emid")?.trim() || "";
            const mnfc = searchParams.get("mnfc")?.trim() || "";
            const certNo = searchParams.get("certNo")?.trim() || "";
            const loctPre = searchParams.get("loctPre")?.trim() || "";
            const calCls = searchParams.get("calCls")?.trim() || "";
            const onsite = searchParams.get("onsite")?.trim() || "";
            
            // Rec Dates (MMDDYYYY expected by translated Python logic)
            const recStart = searchParams.get("recStart")?.trim() || ""; // MMDDYYYY
            const recEnd = searchParams.get("recEnd")?.trim() || "";     // MMDDYYYY
            
            // Cal Dates
            const calStart = searchParams.get("calStart")?.trim() || ""; // MMDDYYYY
            const calEnd = searchParams.get("calEnd")?.trim() || "";     // MMDDYYYY
            
            // Ret Dates
            const retStart = searchParams.get("retStart")?.trim() || ""; // MMDDYYYY
            const retEnd = searchParams.get("retEnd")?.trim() || "";     // MMDDYYYY

            let historySql = `
                SELECT
                    TRIM(A.ISID) as ISID,
                    TRIM(B.CIDU) as CIDU,
                    TRIM(B.KOLAS_NO) as KOLAS_NO,
                    (SELECT TRIM(DESN) FROM EASYCAL.TBSTAMAN WHERE STAT = B.STAT) as STATUS_NAME,
                    (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.CUST) as CUSTOMER_NAME,
                    TRIM(A.NAEM_SUP) as NAEM_SUP,
                    TRIM(A.MODL) as MODL,
                    TRIM(A.SERN) as SERN,
                    (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.MNFC) as MNFC_NAME,
                    TRIM(A.ACCN) as ACCN,
                    TRIM(B.CASD) as CASD,
                    TRIM(B.CARD) as CARD,
                    TRIM(B.SIDT) as SIDT,
                    TRIM(A.NEXT) as NEXT,
                    TRIM(A.TERM) as TERM,
                    TRIM(B.ROTD) as ROTD,
                    CASE
                        WHEN B.LOCT = '0' THEN 'Visit'
                        ELSE 'On Site'
                    END as LOCATION_TYPE,
                    (SELECT '['||TRIM(MODE_CODE)||']'||TRIM(MODE_DESC) FROM EASYCAL.TBMODMAN WHERE MODE_CODE = A.MODE_CODE) as MODE_NAME,
                    TRIM(B.CNAM) as CNAM,
                    TRIM(B.CANCEL_RSN) as CANCEL_RSN
                FROM EASYCAL.TBMASMAN A
                LEFT JOIN EASYCAL.TBCALMAN B ON A.ISID = B.ISID
                WHERE 1=1
            `;
            const historyParams: any = {};

            if (!isMaster) {
                historySql += ` AND A.CUST = :corpId`;
                historyParams.corpId = session.user.corpId;
            }

            if (isid) {
                historySql += ` AND TRIM(A.ISID) = :isid`;
                historyParams.isid = isid;
            }
            if (calNo) {
                historySql += ` AND TRIM(B.CIDU) = :calNo`;
                historyParams.calNo = calNo;
            }
            if (asset) {
                historySql += ` AND TRIM(A.ACCN) = :asset`;
                historyParams.asset = asset;
            }
            if (ccom) {
                historySql += ` AND TRIM(B.CCOM) = :ccom`;
                historyParams.ccom = ccom;
            }
            if (emid) {
                historySql += ` AND TRIM(B.EMID) = :emid`;
                historyParams.emid = emid;
            }
            if (mnfc) {
                historySql += ` AND TRIM(A.MNFC) = :mnfc`;
                historyParams.mnfc = mnfc;
            }
            if (certNo) {
                historySql += ` AND TRIM(B.KOLAS_NO) = :certNo`;
                historyParams.certNo = certNo;
            }
            if (loctPre) {
                historySql += ` AND TRIM(B.LOCT_PRE) = :loctPre`;
                historyParams.loctPre = loctPre;
            }
            if (calCls) {
                historySql += ` AND TRIM(A.CALCLS) = :calCls`;
                historyParams.calCls = calCls;
            }
            if (onsite) {
                historySql += ` AND TRIM(B.LOCT_PRE) = :onsite`;
                historyParams.onsite = onsite;
            }

            // Rec Dates
            if (recStart) {
                historySql += ` AND TRIM(B.CASD) <> '0' AND TO_DATE(B.CASD,'YYYYMMDD') >= TO_DATE(:recStart,'MMDDYYYY')`;
                historyParams.recStart = recStart;
            }
            if (recEnd) {
                historySql += ` AND TO_DATE(B.CASD,'YYYYMMDD') <= TO_DATE(:recEnd,'MMDDYYYY')`;
                historyParams.recEnd = recEnd;
            }

            // Cal Dates
            if (calStart) {
                historySql += ` AND TRIM(B.CARD) <> '0' AND TO_DATE(B.CARD,'YYYYMMDD') >= TO_DATE(:calStart,'MMDDYYYY')`;
                historyParams.calStart = calStart;
            }
            if (calEnd) {
                historySql += ` AND TO_DATE(B.CARD,'YYYYMMDD') <= TO_DATE(:calEnd,'MMDDYYYY')`;
                historyParams.calEnd = calEnd;
            }

            // Ret Dates
            if (retStart) {
                historySql += ` AND TRIM(B.ROTD) <> '0' AND TO_DATE(B.ROTD,'YYYYMMDD') >= TO_DATE(:retStart,'MMDDYYYY')`;
                historyParams.retStart = retStart;
            }
            if (retEnd) {
                historySql += ` AND TO_DATE(B.ROTD,'YYYYMMDD') <= TO_DATE(:retEnd,'MMDDYYYY')`;
                historyParams.retEnd = retEnd;
            }

            historySql += ` ORDER BY B.STAT`;
            const historyRows = await query<any>(historySql, historyParams);
            return NextResponse.json(historyRows);
        }

        if (mode === "advancedModel") {
            const isExact = searchParams.get("isExact") === "true";
            const model = searchParams.get("model")?.trim() || "";
            const eqptName = searchParams.get("eqptName")?.trim() || "";
            const cust = searchParams.get("cust")?.trim() || "";
            const mnfc = searchParams.get("mnfc")?.trim() || "";
            const memo = searchParams.get("memo")?.trim() || "";

            let conditions = [];
            const params: any = {};

            if (!isMaster) {
                conditions.push(`A.CUST = :corpId`);
                params.corpId = session.user.corpId;
            } else if (cust) {
                conditions.push(`A.CUST = :cust`);
                params.cust = cust;
            }

            if (model) {
                if (isExact) {
                    conditions.push(`UPPER(TRIM(A.MODL)) = :model`);
                    params.model = model.toUpperCase();
                } else {
                    conditions.push(`UPPER(A.MODL) LIKE :model`);
                    params.model = `%${model.toUpperCase()}%`;
                }
            }
            if (eqptName) {
                conditions.push(`UPPER(A.NAEM_SUP) LIKE :eqptName`);
                params.eqptName = `%${eqptName.toUpperCase()}%`;
            }
            if (mnfc) {
                conditions.push(`A.MNFC = :mnfc`);
                params.mnfc = mnfc;
            }
            if (memo) {
                conditions.push(`UPPER(A.MEMO) LIKE :memo`);
                params.memo = `%${memo.toUpperCase()}%`;
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

            const sql = `
                SELECT
                    TRIM(A.ISID) as ISID,
                    TRIM(A.NAEM_SUP) as NAEM_SUP,
                    TRIM(A.MODL) as MODL,
                    (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.MNFC) as MNFC_NAME,
                    TRIM(A.SERN) as SERN,
                    (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.CUST) as CUST_NAME,
                    TRIM(A.LAST) as LAST,
                    TRIM(A.TERM) as TERM,
                    A.COST_EXE,
                    TRIM(A.SELF) as SELF,
                    (SELECT TRIM(MODE_DESC) FROM EASYCAL.TBMODMAN WHERE MODE_CODE = A.MODE_CODE) as MODE_DESC,
                    (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.EXTN) as EXTN_NAME,
                    TRIM(A.MEMO) as MEMO
                FROM EASYCAL.TBMASMAN A
                ${whereClause}
                ORDER BY 
                    CASE
                        WHEN A.LAST <> '0' AND A.LAST IS NOT NULL THEN TO_DATE(A.LAST,'YYYYMMDD')
                    END DESC NULLS LAST
            `;

            const rows = await query<any>(sql, params);
            return NextResponse.json(rows);
        }
        let sql = `
            SELECT 
                TRIM(a.ISID) as ISID,
                TRIM(a.NAEM_SUP) as NAEM_SUP,
                TRIM(a.NAEM) as NAEM,
                TRIM(a.MODL) as MODL,
                TRIM(a.SERN) as SERN,
                TRIM(a.ACCN) as ACCN,
                TRIM(a.STAT) as STAT,
                TRIM(a.TYEP) as TYEP,
                TRIM(a.MODE_CODE) as MODE_CODE,
                TRIM(a.TERM) as TERM,
                TRIM(a.LAST) as LAST,
                TRIM(a.NEXT) as NEXT,
                TRIM(a.CUST) as CUST,
                TRIM(a.MEMO) as MEMO,
                TRIM(a.ACC1) as ACC1,
                TRIM(a.SELF) as SELF,
                TRIM(a.EXTN) as EXTN,
                TRIM(a.DPCD) as DPCD,
                TRIM(a.OWNM) as OWNM,
                a.COST_EXE,
                a.COST_CAL,
                a.CALN,
                a.EXER,
                a.SPC1,
                TRIM(a.MNFC) as MNFC,
                TRIM(b.CONM) as MANUFACTURE,
                TRIM(c.CONM) as APPLICANT,
                TRIM(d.DESN) as DIVN,
                TRIM(e.DESN) as DEPART,
                '[' || TRIM(f.MODE_CODE) || '] ' || TRIM(f.MODE_DESC) as MODE_NAME_SNIPPET,
                '[' || TRIM(g.TYEP) || '] ' || TRIM(g.DESN) as TYPE_NAME_SNIPPET,
                TRIM(h.CONM) as SUBCONTRACTOR_NAME,
                '[' || TRIM(j.EMID) || '] ' || TRIM(j.EMNM) as LATEST_ENGINEER_NAME,
                '[' || TRIM(k.EMID) || '] ' || TRIM(k.EMNM) as ASSISTANCE,
                TRIM(l.DESN) as STATUS_NAME,
                '[' || TRIM(f.MODE_CODE) || '] ' || TRIM(f.MODE_DESC) as MODE_NAME, 
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
        const {
            ISID, STAT, TYEP, MODE_CODE, TERM, LAST, NEXT, CUST, MEMO, ACC1, SELF, EXTN,
            NAEM_SUP, ACCN, SERN, NAEM, MODL, MNFC
        } = body;

        if (!ISID) return NextResponse.json({ error: "ISID is required" }, { status: 400 });

        const connection = await oracledb.getConnection(dbConfig);

        try {
            // 1. Get current (Before) state for logging
            const selectBeforeSql = `SELECT * FROM EASYCAL.TBMASMAN WHERE ISID = :isid`;
            console.log("🔍 [PUT STEP 1]: Checking current state...", selectBeforeSql);
            const beforeResult = await connection.execute(
                selectBeforeSql,
                { isid: ISID },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const before: any = beforeResult.rows?.[0];

            if (!before) throw new Error("Equipment not found");

            // 2. Update TBMASMAN (Using provided defaults for missing FE fields)
            const updateMasSql = `
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
                    SERN = :sern,
                    NAEM = :naem,
                    MODL = :modl,
                    MNFC = :mnfc,
                    COST_EXE = 0,
                    COST = 0,
                    EQIP = null,
                    CAL_NEXT = null
                WHERE ISID = :isid
            `;
            console.log("🔍 [PUT STEP 2]: Updating TBMASMAN...", updateMasSql);
            await connection.execute(updateMasSql, {
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
                naem: NAEM,
                modl: MODL,
                mnfc: MNFC,
                isid: ISID
            });

            // 3. Conditional TBCALMAN Update (Status Check)
            const selectCalSql = `SELECT CIDU, STAT FROM EASYCAL.TBCALMAN 
                 WHERE CIDU = (SELECT MAX(CIDU) FROM EASYCAL.TBCALMAN WHERE ISID = :isid)`;
            console.log("🔍 [PUT STEP 3]: Checking last cal info...", selectCalSql);
            const calResult = await connection.execute(
                selectCalSql,
                { isid: ISID },
                { outFormat: oracledb.OUT_FORMAT_OBJECT }
            );
            const latestCal: any = calResult.rows?.[0];

            if (latestCal && ['02', '11', '17'].includes(latestCal.STAT?.trim())) {
                const updateCalSql = `UPDATE EASYCAL.TBCALMAN SET CCOM = :cust WHERE CIDU = :cidu`;
                console.log("🔍 [PUT STEP 4]: Syncing TBCALMAN...", updateCalSql);
                await connection.execute(
                    updateCalSql,
                    { cust: CUST, cidu: latestCal.CIDU }
                );
            }

            // 4. Generate & Insert Log
            const changed: string[] = ["<UPDATE>"];
            const check = (label: string, oldVal: any, newVal: any) => {
                const o = String(oldVal || "").trim();
                const n = String(newVal || "").trim();
                if (o !== n) changed.push(`※${label}: ${o} -> ${n}`);
            };

            check("RegNo", before.ISID, ISID);
            check("SN", before.SERN, SERN);
            check("EQPT", before.NAEM_SUP, NAEM_SUP);
            check("MASTER", before.NAEM, NAEM);
            check("MODEL", before.MODL, MODL);
            check("ASSET", before.ACCN, ACCN);
            check("CUST", before.CUST, CUST);
            check("MEMO", before.MEMO, MEMO);
            check("ACC", before.ACC1, ACC1);
            check("TYPE", before.TYEP, TYEP);
            check("MODE", before.MODE_CODE, MODE_CODE);
            check("SELF", before.SELF, SELF);
            check("EXTN", before.EXTN, EXTN);
            check("TERM", before.TERM, TERM);
            check("DUE", before.NEXT, NEXT);

            if (changed.length > 1) {
                const logStr = changed.join(",");
                const emid = session.user.id?.slice(0, 6) || "SYSTEM";
                const insertLogSql = `INSERT INTO AUTOCAL_LOG.TBMASMAN_LOG (ISID, SDAT, MOID, RSDT) 
                     VALUES (:isid, SYSDATE, :moid, :rsdt)`;
                console.log("🔍 [PUT STEP 5]: Inserting log into TBMSAMAN_LOG...", insertLogSql);
                await connection.execute(
                    insertLogSql,
                    {
                        isid: ISID,
                        moid: emid.padEnd(10, ' '), // MOID is CHAR(10)
                        rsdt: logStr.slice(0, 3200)  // RSDT is VARCHAR2(3200)
                    }
                );
            }

            await connection.commit();
            return NextResponse.json({ success: true });

        } catch (err: any) {
            await connection.rollback();
            throw err;
        } finally {
            await connection.close();
        }

    } catch (err: any) {
        console.error("❌ [API PUT ERROR]:", err.message);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
