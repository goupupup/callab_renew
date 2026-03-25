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

// Helper to extract code from [CODE] Description format
const extractCode = (str: string) => {
    if (!str) return str;
    const match = str.match(/\[(.*?)\]/);
    return match ? match[1].trim() : str.trim();
};

// GET: Search equipment or fetch lookups
export async function GET(request: Request) {
    const session = await getServerSession(authOptions) as any;
    if (!session?.user?.role || session.user.role === "USER") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode");
    const q = extractCode(searchParams.get("q") || "");
    const role = session.user.role;
    const isMaster = role === "MASTER";

    try {
        // ── Lookups ──────────────────────────────────────────
        if (mode === "lookups") {
            const [types, modes, statuses, suppliers, employees, subcontractors] = await Promise.all([
                query<any>(`SELECT DISTINCT TRIM(TYEP) as CODE, '[' || TRIM(TYEP) || '] ' || TRIM(DESN) as NAME FROM EASYCAL.TBTYPMAN WHERE TYEP IS NOT NULL ORDER BY NAME`),
                query<any>(`SELECT DISTINCT TRIM(MODE_CODE) as CODE, '[' || TRIM(MODE_CODE) || '] ' || TRIM(MODE_DESC) as NAME FROM EASYCAL.TBMODMAN WHERE MODE_CODE IS NOT NULL ORDER BY NAME`),
                query<any>(`SELECT DISTINCT TRIM(STAT) as CODE, '[' || TRIM(STAT) || '] ' || TRIM(DESN) as NAME FROM EASYCAL.TBSTAMAN WHERE STAT IS NOT NULL ORDER BY NAME`),
                query<any>(`SELECT DISTINCT TRIM(COID) as CODE, TRIM(CONM) as NAME FROM EASYCAL.TBSUPMAN ORDER BY NAME`),
                query<any>(`SELECT DISTINCT TRIM(EMID) as CODE, '[' || TRIM(EMID) || '] ' || TRIM(EMNM) as NAME FROM EASYCAL.TBEMPMAN WHERE (DIVISION LIKE '%#CAL%' OR DIVISION LIKE '%#TECH%') AND TRIM(STAT) <> 'Retiree' ORDER BY NAME`),
                query<any>(`SELECT DISTINCT TRIM(COID) as CODE, TRIM(CONM) as NAME FROM EASYCAL.TBSUPMAN WHERE TRIM(COT2) = '1' AND CONM IS NOT NULL ORDER BY NAME`),
            ]);
            return NextResponse.json({ types, modes, statuses, suppliers, employees, subcontractors });
        }

        // ── Calibration History (Specific for REG NO detail) ──
        if (mode === "calHistory") {
            const id = extractCode(searchParams.get("isid") || searchParams.get("id") || "");
            if (!id) return NextResponse.json({ error: "ISID required" }, { status: 400 });

            const history = await query<any>(`
                SELECT 
                    TRIM(A.CIDU) as CIDU,
                    TRIM(A.KOLAS_NO) as KOLAS_NO,
                    TRIM(A.CASD) as CASD,
                    TRIM(A.CARD) as CARD,
                    '[' || TRIM(B.EMID) || '] ' || TRIM(B.EMNM) AS ENGINEER,
                    TRIM(C.CONM) AS SALE_COMPANY, 
                    TRIM(D.CONM) AS SUBCON, 
                    TRIM(A.CALNO_EXT) as CALNO_EXT,
                    TRIM(A.CANCEL_RSN) as CANCEL_RSN,
                    CASE
                        WHEN E.EMID IS NOT NULL THEN '[' || TRIM(E.EMID) || '] ' || TRIM(E.EMNM)
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
            const name = extractCode(searchParams.get("name") || "");
            const model = extractCode(searchParams.get("model") || "");
            const manufacturer = extractCode(searchParams.get("manufacturer") || "");

            let masterSql = `
                SELECT 
                    TRIM(A.EQPNAM) as EQPNAM,
                    TRIM(A.MDLNAM) as MDLNAM,
                    TRIM(B.CONM) as MNFCTR,
                    TRIM(A.MNFCTR) as MNFC,
                    TRIM(A.CALTRM) as CALTRM,
                    TRIM(A.SELF) as SELF,
                    '[' || TRIM(A.MODE_CODE) || '] ' || TRIM(C.MODE_DESC) as MODE_NAME,
                    TRIM(A.CLSMAN_EXT) as CLSMAN_EXT,
                    TRIM(A.MDLNO) as MDLNO
                FROM EASYCAL.TBMDLMAN A
                LEFT JOIN EASYCAL.TBSUPMAN B ON A.MNFCTR = B.COID
                LEFT JOIN EASYCAL.TBMODMAN C ON A.MODE_CODE = C.MODE_CODE
                WHERE 1=1
            `;
            const masterParams: any = {};

            if (name) {
                masterSql += ` AND TRIM(UPPER(A.EQPNAM)) LIKE :name`;
                masterParams.name = `%${name.toUpperCase()}%`;
            }
            if (model) {
                masterSql += ` AND TRIM(UPPER(A.MDLNAM)) LIKE :model`;
                masterParams.model = `%${model.toUpperCase()}%`;
            }
            if (manufacturer) {
                masterSql += ` AND (TRIM(A.MNFCTR) = :manu OR TRIM(UPPER(B.CONM)) LIKE :manuName)`;
                masterParams.manu = manufacturer;
                masterParams.manuName = `%${manufacturer.toUpperCase()}%`;
            }

            masterSql += ` ORDER BY A.EQPNAM ASC`;
            const masterRows = await query<any>(masterSql, masterParams);
            return NextResponse.json(masterRows);
        }

        if (mode === "advancedCalHistory") {
            const isid = extractCode(searchParams.get("isid") || "");
            const calNo = extractCode(searchParams.get("calNo") || "");
            const asset = extractCode(searchParams.get("asset") || "");
            const certNo = extractCode(searchParams.get("certNo") || "");
            const ccom = extractCode(searchParams.get("ccom") || "");
            const mnfc = extractCode(searchParams.get("mnfc") || "");
            const emid = extractCode(searchParams.get("emid") || "");
            const calCls = extractCode(searchParams.get("calCls") || "");
            const recStart = searchParams.get("recStart") || ""; // expects YYYY-MM-DD from FE
            const recEnd = searchParams.get("recEnd") || "";
            const calStart = searchParams.get("calStart") || "";
            const calEnd = searchParams.get("calEnd") || "";
            const retStart = searchParams.get("retStart") || "";
            const retEnd = searchParams.get("retEnd") || "";
            const inHouse = searchParams.get("inHouse") === "true";
            const onSite = searchParams.get("onSite") === "true";

            let historySql = `
                SELECT
                    TRIM(A.ISID) as ISID,
                    TRIM(B.CIDU) as CIDU,
                    TRIM(B.KOLAS_NO) as CERTNO,
                    (SELECT TRIM(DESN) FROM EASYCAL.TBSTAMAN WHERE STAT = B.STAT) as STATUS_NAME,
                    (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.CUST) as APPLICANT,
                    TRIM(A.NAEM_SUP) as EQIP_NAME,
                    TRIM(A.MODL) as MODEL,
                    TRIM(A.SERN) as SN,
                    (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.MNFC) as MNFC_NAME,
                    TRIM(A.ACCN) as ASSET,
                    TRIM(B.CASD) as REC_DATE,
                    TRIM(B.CARD) as CAL_DATE,
                    TRIM(B.SIDT) as APPV_DATE,
                    TRIM(A.NEXT) as DUE_DATE,
                    TRIM(A.TERM) as TERM,
                    TRIM(B.ROTD) as RET_DATE,
                    CASE
                        WHEN B.LOCT = '0' THEN 'Visit'
                        ELSE 'On Site'
                    END as REC_TYPE,
                    (SELECT '['||TRIM(MODE_CODE)||']'||TRIM(MODE_DESC) FROM EASYCAL.TBMODMAN WHERE MODE_CODE = A.MODE_CODE) as CAL_TYPE,
                    TRIM(B.CNAM) as CONTACT,
                    TRIM(B.CANCEL_RSN) as CANCEL_RSN
                FROM EASYCAL.TBMASMAN A
                LEFT JOIN EASYCAL.TBCALMAN B ON A.ISID = B.ISID
                WHERE 1=1
            `;

            const historyParams: any = {};

            // Filters based on README rules
            if (isid) { historySql += ` AND TRIM(A.ISID) = :isid`; historyParams.isid = isid; }
            if (calNo) { historySql += ` AND TRIM(B.CIDU) = :calNo`; historyParams.calNo = calNo; }
            if (asset) { historySql += ` AND TRIM(A.ACCN) = :asset`; historyParams.asset = asset; }
            if (ccom) { historySql += ` AND TRIM(B.CCOM) = :ccom`; historyParams.ccom = ccom; }
            if (emid) { historySql += ` AND TRIM(B.EMID) = :emid`; historyParams.emid = emid; }
            if (mnfc) { historySql += ` AND TRIM(A.MNFC) = :mnfc`; historyParams.mnfc = mnfc; }
            if (certNo) { historySql += ` AND B.KOLAS_NO = :certNo`; historyParams.certNo = certNo; }
            if (calCls) { historySql += ` AND A.CALCLS = :calCls`; historyParams.calCls = calCls; }

            // Date filtering (Converting YYYY-MM-DD from FE to MMDDYYYY as per Python TO_DATE target)
            const toMMDDYYYY = (d: string) => {
                const parts = d.split('-');
                if (parts.length === 3) return `${parts[1]}${parts[2]}${parts[0]}`;
                return d;
            };

            if (recStart) { historySql += ` AND TRIM(B.CASD) <> '0' AND TO_DATE(B.CASD,'YYYYMMDD') >= TO_DATE(:recStart,'MMDDYYYY')`; historyParams.recStart = toMMDDYYYY(recStart); }
            if (recEnd) { historySql += ` AND TO_DATE(B.CASD,'YYYYMMDD') <= TO_DATE(:recEnd,'MMDDYYYY')`; historyParams.recEnd = toMMDDYYYY(recEnd); }
            if (calStart) { historySql += ` AND TRIM(B.CARD) <> '0' AND TO_DATE(B.CARD,'YYYYMMDD') >= TO_DATE(:calStart,'MMDDYYYY')`; historyParams.calStart = toMMDDYYYY(calStart); }
            if (calEnd) { historySql += ` AND TO_DATE(B.CARD,'YYYYMMDD') <= TO_DATE(:calEnd,'MMDDYYYY')`; historyParams.calEnd = toMMDDYYYY(calEnd); }
            if (retStart) { historySql += ` AND TRIM(B.ROTD) <> '0' AND TO_DATE(B.ROTD,'YYYYMMDD') >= TO_DATE(:retStart,'MMDDYYYY')`; historyParams.retStart = toMMDDYYYY(retStart); }
            if (retEnd) { historySql += ` AND TO_DATE(B.ROTD,'YYYYMMDD') <= TO_DATE(:retEnd,'MMDDYYYY')`; historyParams.retEnd = toMMDDYYYY(retEnd); }

            // OnSite/InHouse
            if (!inHouse || !onSite) {
                if (onSite) { historySql += ` AND B.LOCT_PRE = 'A'`; }
                else if (inHouse) { historySql += ` AND B.LOCT_PRE = 'B'`; }
            }

            historySql += ` ORDER BY B.STAT`;
            const historyRows = await query<any>(historySql, historyParams);
            return NextResponse.json(historyRows);
        }

        if (mode === "ongoing") {
            const regno = extractCode(searchParams.get("regno") || "");
            const calno = extractCode(searchParams.get("calno") || "");
            const applicant = extractCode(searchParams.get("applicant") || "");
            const contactPerson = searchParams.get("contact_person") || "";
            const engineer = extractCode(searchParams.get("engineer") || "");
            const startDate = searchParams.get("startDate") || "";
            const endDate = searchParams.get("endDate") || "";
            const selfExt = searchParams.get("selfExt") || ""; // '1'=Self, '0'=Extn, '2'=None, ''=Both
            const onoffSite = searchParams.get("onoffSite") || ""; // 'A'=OnSite, 'B'=InHouse, 'Z'=None, ''=Both

            let ongoingSql = `
                SELECT 
                    TRIM(A.ISID) as ISID,                -- 등록번호
                    '[' || TRIM(B.EMID) || '] ' || TRIM(B.EMNM) as REG_ENGINEER,        -- 완료예정자
                    TRIM(A.EXP_DATE) as NEXT,           -- 완료예정일 (SCHEDULED DATE)
                    TRIM(A.DELAY_RSN) as DELAY_RSN,     -- 지연사유
                    TRIM(E.NAEM_SUP) as NAEM_SUP,       -- 장비이름
                    TRIM(E.MODL) as MODL,               -- 모델명
                    TRIM(E.SERN) as SERN,               -- 시리얼번호
                    TRIM(D.CONM) as APPLICANT,          -- 고객사 이름
                    TRIM(A.CIDU) as CALN,               -- 접수번호
                    TRIM(C.DESN) as STATUS_NAME,        -- 접수번호 상태
                    TRIM(A.CASD) as CASD,               -- 접수일자
                    TRIM(A.SCHE) as SCHE,               -- 예정일자
                    TRIM(F.CONM) as MANUFACTURE,        -- 제조사
                    TRIM(A.ACC1) as ACC1,               -- 악세사리
                    TRIM(A.MEMO_CAL) as MEMO_CAL,       -- 교정접수 요구사항
                    TRIM(A.ACC2) as ACC2,               -- 외관메모
                    TRIM(E.MEMO) as MEMO,               -- 등록번호 메모
                    CASE 
                        WHEN G.DIVN = '99' THEN '99' 
                        ELSE TRIM(G.DESN) 
                    END as DIVN,                        -- 부서
                    CASE 
                        WHEN H.PART = '9999' THEN '9999' 
                        ELSE TRIM(H.DESN) 
                    END as DEPART,                      -- 파트
                    TRIM(A.CNAM) as OWNM,               -- 담당자 이름
                    TRIM(A.CTEL) as CTEL,               -- 담당자 연락처
                    '[' || TRIM(I.MODE_CODE) || '] ' || TRIM(I.MODE_DESC) as MODE_NAME, -- 교정모드
                    '[' || TRIM(J.EMID) || '] ' || TRIM(J.EMNM) as RECEPTIONIST,       -- 접수자
                    TRIM(K.CONM) as EXTN                -- 외부반출기관
                FROM EASYCAL.TBCALMAN A
                LEFT JOIN EASYCAL.TBEMPMAN B ON A.EXP_RESP = B.EMID
                LEFT JOIN EASYCAL.TBSTAMAN C ON A.STAT = C.STAT
                LEFT JOIN EASYCAL.TBSUPMAN D ON A.CCOM = D.COID
                LEFT JOIN EASYCAL.TBMASMAN E ON A.ISID = E.ISID
                LEFT JOIN EASYCAL.TBSUPMAN F ON F.COID = E.MNFC
                LEFT JOIN EASYCAL.TBOWNDIV G ON (A.CCOM = G.CUST AND A.DIVN = G.DIVN)
                LEFT JOIN EASYCAL.TBOWNPAT H ON (A.CCOM = H.CUST AND A.PART = H.PART)
                LEFT JOIN EASYCAL.TBMODMAN I ON I.MODE_CODE = E.MODE_CODE
                LEFT JOIN EASYCAL.TBEMPMAN J ON J.EMID = A.AEID
                LEFT JOIN EASYCAL.TBSUPMAN K ON K.COID = A.EXTN
                WHERE (A.STAT = '02' OR A.STAT = '11' OR A.STAT = '05' OR A.STAT = '07')
            `;

            const params: any = {};
            if (regno) { ongoingSql += ` AND TRIM(A.ISID) = :regno`; params.regno = regno; }
            if (calno) { ongoingSql += ` AND TRIM(A.CIDU) = :calno`; params.calno = calno; }
            if (applicant) { ongoingSql += ` AND D.CONM LIKE :applicant`; params.applicant = `%${applicant}%`; }
            if (contactPerson) { ongoingSql += ` AND A.CNAM LIKE :cp`; params.cp = `%${contactPerson}%`; }
            if (engineer) { ongoingSql += ` AND B.EMID = :eng`; params.eng = engineer; }
            if (selfExt) { ongoingSql += ` AND E.SELF = :selfExt`; params.selfExt = selfExt; }
            if (onoffSite) { ongoingSql += ` AND A.LOCT_PRE = :onoffSite`; params.onoffSite = onoffSite; }
            if (startDate) { ongoingSql += ` AND TO_DATE(A.CASD,'YYYYMMDD') >= TO_DATE(:startDate,'YYYYMMDD')`; params.startDate = startDate; }
            if (endDate) { ongoingSql += ` AND TO_DATE(A.CASD,'YYYYMMDD') <= TO_DATE(:endDate,'YYYYMMDD')`; params.endDate = endDate; }

            ongoingSql += ` ORDER BY A.CASD DESC, A.CIDU DESC`;
            const rows = await query<any>(ongoingSql, params);
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
                (SELECT MAX(CIDU) FROM EASYCAL.TBCALMAN WHERE TRIM(ISID) = TRIM(a.ISID)) as LATEST_CALNO
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
            sql += ` AND TRIM(UPPER(a.ACCN)) LIKE UPPER(:q)`;
            params.q = `%${q}%`;
        } else if (mode === "sn") {
            sql += ` AND TRIM(UPPER(a.SERN)) LIKE UPPER(:q)`;
            params.q = `%${q}%`;
        } else if (mode === "calNo") {
            sql += ` AND a.ISID IN (SELECT ISID FROM EASYCAL.TBCALMAN WHERE UPPER(TRIM(CIDU)) LIKE UPPER(:q))`;
            params.q = `%${q}%`;
        } else if (mode === "model") {
            sql += ` AND (UPPER(TRIM(a.MODL)) LIKE UPPER(:q) OR UPPER(TRIM(a.NAEM_SUP)) LIKE UPPER(:q) OR UPPER(TRIM(a.NAEM)) LIKE UPPER(:q))`;
            params.q = `%${q}%`;
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
        
        // Extract codes from properties if they contain [CODE] description
        const ISID = extractCode(body.ISID);
        const STAT = extractCode(body.STAT);
        const TYEP = extractCode(body.TYEP);
        const MODE_CODE = extractCode(body.MODE_CODE);
        const TERM = body.TERM;
        const LAST = body.LAST;
        const NEXT = body.NEXT;
        const CUST = extractCode(body.CUST);
        const MEMO = body.MEMO;
        const ACC1 = body.ACC1;
        const SELF = body.SELF;
        const EXTN = extractCode(body.EXTN);
        const NAEM_SUP = body.NAEM_SUP;
        const ACCN = body.ACCN;
        const SERN = body.SERN;
        const NAEM = body.NAEM;
        const MODL = body.MODL;
        const MNFC = extractCode(body.MNFC);

        if (!ISID) return NextResponse.json({ error: "ISID is required" }, { status: 400 });

        const connection = await oracledb.getConnection(dbConfig);

        try {
            // 1. Get current (Before) state for logging
            const selectBeforeSql = `SELECT * FROM EASYCAL.TBMASMAN WHERE TRIM(ISID) = :isid`;
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
                WHERE TRIM(ISID) = :isid
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
