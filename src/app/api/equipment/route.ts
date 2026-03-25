import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

// Helper to extract code from [CODE] Description format
const extractCode = (str: string) => {
    if (!str) return str;
    const match = str.match(/\[(.*?)\]/);
    return match ? match[1].trim() : str.trim();
};

export async function GET(request: Request) {
    const session = await getServerSession(authOptions) as any;
    const { searchParams } = new URL(request.url);

    if (!session?.user?.corpId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const corpId = session.user.corpId;
    const role = session.user.role;
    const isElevated = role === "MASTER" || role === "EMPLOYEE";

    // Pagination params
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const offset = (page - 1) * limit;

    // Filters from searchParams
    const serialNumber = extractCode(searchParams.get("serialNumber") || "");
    const assetNo = extractCode(searchParams.get("assetNo") || "");
    const regNo = extractCode(searchParams.get("regNo") || "");
    const modelName = extractCode(searchParams.get("modelName") || "");
    const equipmentName = extractCode(searchParams.get("equipmentName") || "");
    const company = extractCode(searchParams.get("company") || "");
    const manufacturer = extractCode(searchParams.get("manufacturer") || "");
    const lastCalStart = searchParams.get("lastCalStart"); // YYYYMMDD
    const lastCalEnd = searchParams.get("lastCalEnd");
    const nextCalStart = searchParams.get("nextCalStart");
    const nextCalEnd = searchParams.get("nextCalEnd");
    const onGoingOnly = searchParams.get("onGoingOnly") === "true";
    const expirationOnly = searchParams.get("expirationOnly") === "true";

    try {
        let whereSql = ` WHERE 1=1`;
        const params: any = {};

        if (!isElevated) {
            whereSql += ` AND TRIM(m.CUST) = :corpId`;
            params.corpId = corpId;
        } else if (company) {
            whereSql += ` AND (TRIM(m.CUST) LIKE '%' || :company || '%' OR EXISTS (SELECT 1 FROM EASYCAL.TBSUPMAN s2 WHERE TRIM(s2.COID) = TRIM(m.CUST) AND UPPER(TRIM(s2.CONM)) LIKE '%' || UPPER(TRIM(:company)) || '%'))`;
            params.company = company;
        }

        if (serialNumber) {
            whereSql += ` AND UPPER(TRIM(m.SERN)) LIKE '%' || UPPER(TRIM(:sern)) || '%'`;
            params.sern = serialNumber;
        }
        if (assetNo) {
            whereSql += ` AND UPPER(TRIM(m.ACCN)) LIKE '%' || UPPER(TRIM(:accn)) || '%'`;
            params.accn = assetNo;
        }
        if (regNo) {
            whereSql += ` AND UPPER(TRIM(m.ISID)) = UPPER(TRIM(:isid))`;
            params.isid = regNo;
        }
        if (modelName) {
            whereSql += ` AND UPPER(TRIM(m.MODL)) LIKE '%' || UPPER(TRIM(:modelName)) || '%'`;
            params.modelName = modelName;
        }
        if (equipmentName) {
            whereSql += ` AND UPPER(TRIM(m.NAEM_SUP)) LIKE '%' || UPPER(TRIM(:equipmentName)) || '%'`;
            params.equipmentName = equipmentName;
        }

        if (onGoingOnly) {
            whereSql += ` AND m.STAT IN ('02', '11', '05', '07')`;
        }
        if (expirationOnly) {
            whereSql += ` AND m.NEXT < TO_CHAR(SYSDATE, 'YYYYMMDD') AND m.NEXT != '0'`;
        }

        if (manufacturer) {
            whereSql += ` AND m.MNFC IN (SELECT COID FROM EASYCAL.TBSUPMAN WHERE UPPER(TRIM(CONM)) LIKE '%' || UPPER(TRIM(:mnfc)) || '%')`;
            params.mnfc = manufacturer;
        }
        if (lastCalStart && lastCalEnd) {
            const start = lastCalStart.replace(/-/g, '');
            const end = lastCalEnd.replace(/-/g, '');
            whereSql += ` AND m.LAST BETWEEN :lastCalStart AND :lastCalEnd`;
            params.lastCalStart = start;
            params.lastCalEnd = end;
        }
        if (nextCalStart && nextCalEnd) {
            const start = nextCalStart.replace(/-/g, '');
            const end = nextCalEnd.replace(/-/g, '');
            whereSql += ` AND m.NEXT BETWEEN :nextCalStart AND :nextCalEnd`;
            params.nextCalStart = start;
            params.nextCalEnd = end;
        }

        const sortBy = searchParams.get("sortBy") || "REGD";
        const order = searchParams.get("order")?.toUpperCase() === "ASC" ? "ASC" : "DESC";

        const sortMap: any = {
            "assetNo": "TRIM(m.ACCN)",
            "hctNo": "TO_NUMBER(REGEXP_REPLACE(TRIM(m.ISID), '[^0-9]', ''))",
            "modelName": "m.MODL",
            "equipmentName": "m.NAEM_SUP",
            "serialNumber": "m.SERN",
            "lastCal": "CASE WHEN m.LAST = '0' OR m.LAST IS NULL THEN '00000000' ELSE m.LAST END",
            "nextCal": "CASE WHEN m.NEXT = '0' OR m.NEXT IS NULL THEN '99991231' ELSE m.NEXT END",
            "regDate": "m.REGD"
        };
        const sortColumn = sortMap[sortBy] || "m.REGD";

        const isAll = limit >= 9999;

        // 1. Precise Count Query (Simplified for speed)
        const countSql = `SELECT COUNT(*) as TOTAL FROM EASYCAL.TBMASMAN ${whereSql.replace(/m\./g, '')}`;

        // 2. Paginated Data Query (Using JOIN instead of Subquery)
        const dataSql = `
            SELECT 
                TRIM(m.ISID) as ISID, TRIM(m.ACCN) as ACCN, m.SERN as SERN, m.MODL as MODL, m.NAEM_SUP as NAEM_SUP, TRIM(m.MNFC) as MNFC, m.REGD as REGD, m.LAST as LAST, m.NEXT as NEXT, m.STAT as STAT,
                TRIM(s.CONM) as MANUFACTURER_NAME,
                TRIM(cust.CONM) as CUSTOMER_NAME
            FROM EASYCAL.TBMASMAN m
            LEFT JOIN EASYCAL.TBSUPMAN s ON TRIM(m.MNFC) = TRIM(s.COID)
            LEFT JOIN EASYCAL.TBSUPMAN cust ON TRIM(m.CUST) = TRIM(cust.COID)
            ${whereSql}
        `;

        let finalDataSql = "";
        const dataParams = { ...params };

        if (isAll) {
            finalDataSql = `${dataSql} ORDER BY ${sortColumn} ${order}`;
        } else {
            finalDataSql = `
                SELECT * FROM (
                    SELECT a.*, ROWNUM rnum FROM (
                        ${dataSql} ORDER BY ${sortColumn} ${order}
                    ) a WHERE ROWNUM <= :upper_limit
                ) WHERE rnum > :offset
            `;
            dataParams.offset = offset;
            dataParams.upper_limit = offset + limit;
        }

        // Execute both queries in PARALLEL to save time
        const [countResult, equipment] = await Promise.all([
            query<any>(countSql, params),
            query<any>(finalDataSql, dataParams)
        ]);

        const totalItems = countResult[0]?.TOTAL || 0;

        return NextResponse.json({
            data: equipment,
            pagination: {
                total: totalItems,
                page: isAll ? 1 : page,
                limit,
                totalPages: isAll ? 1 : Math.ceil(totalItems / limit)
            }
        });

        return NextResponse.json({
            data: equipment,
            pagination: {
                total: totalItems,
                page: isAll ? 1 : page,
                limit,
                totalPages: isAll ? 1 : Math.ceil(totalItems / limit)
            }
        });
    } catch (error: any) {
        console.error("Equipment API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
