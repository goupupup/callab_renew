import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions) as any;
    const { searchParams } = new URL(request.url);

    if (!session?.user?.corpId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const corpId = session.user.corpId;
    const isMaster = session.user.role === "MASTER";

    // Pagination params
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "25");
    const offset = (page - 1) * limit;

    // Filters from searchParams
    const serialNumber = searchParams.get("serialNumber");
    const assetNo = searchParams.get("assetNo");
    const regNo = searchParams.get("regNo");
    const modelName = searchParams.get("modelName");
    const equipmentName = searchParams.get("equipmentName");
    const company = searchParams.get("company");
    const manufacturer = searchParams.get("manufacturer");
    const lastCalStart = searchParams.get("lastCalStart"); // YYYYMMDD
    const lastCalEnd = searchParams.get("lastCalEnd");
    const nextCalStart = searchParams.get("nextCalStart");
    const nextCalEnd = searchParams.get("nextCalEnd");
    const onGoingOnly = searchParams.get("onGoingOnly") === "true";
    const expirationOnly = searchParams.get("expirationOnly") === "true";

    try {
        let sql = `
            SELECT 
                TRIM(ISID) as ISID, TRIM(ACCN) as ACCN, SERN, MODL, NAEM_SUP, TRIM(MNFC) as MNFC, REGD, LAST, NEXT, STAT,
                (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = EASYCAL.TBMASMAN.MNFC) as MANUFACTURER_NAME
            FROM EASYCAL.TBMASMAN 
            WHERE 1=1
        `;

        const params: any = {};

        if (!isMaster) {
            sql += ` AND TRIM(CUST) = :corpId`;
            params.corpId = corpId;
        } else if (company) {
            // Master user can search by company/customer ID or partial ID
            sql += ` AND CUST LIKE '%' || :company || '%'`;
            params.company = company;
        }

        if (serialNumber) {
            sql += ` AND SERN LIKE '%' || :sern || '%'`;
            params.sern = serialNumber;
        }
        if (assetNo) {
            sql += ` AND ACCN LIKE '%' || :accn || '%'`;
            params.accn = assetNo;
        }
        if (regNo) {
            sql += ` AND ISID LIKE '%' || :isid || '%'`;
            params.isid = regNo;
        }
        if (modelName) {
            sql += ` AND MODL LIKE '%' || :modelName || '%'`;
            params.modelName = modelName;
        }
        if (equipmentName) {
            sql += ` AND NAEM_SUP LIKE '%' || :equipmentName || '%'`;
            params.equipmentName = equipmentName;
        }

        // Filtering Checkboxes
        if (onGoingOnly) {
            sql += ` AND STAT IN ('02', '11', '05', '07')`;
        }
        if (expirationOnly) {
            sql += ` AND NEXT < TO_CHAR(SYSDATE, 'YYYYMMDD') AND NEXT != '0'`;
        }

        if (manufacturer) {
            sql += ` AND MNFC IN (SELECT COID FROM EASYCAL.TBSUPMAN WHERE CONM LIKE '%' || :mnfc || '%')`;
            params.mnfc = manufacturer;
        }
        if (lastCalStart && lastCalEnd) {
            const start = lastCalStart.replace(/-/g, '');
            const end = lastCalEnd.replace(/-/g, '');
            sql += ` AND LAST BETWEEN :lastCalStart AND :lastCalEnd`;
            params.lastCalStart = start;
            params.lastCalEnd = end;
        }
        if (nextCalStart && nextCalEnd) {
            const start = nextCalStart.replace(/-/g, '');
            const end = nextCalEnd.replace(/-/g, '');
            sql += ` AND NEXT BETWEEN :nextCalStart AND :nextCalEnd`;
            params.nextCalStart = start;
            params.nextCalEnd = end;
        }

        // Sorting params
        const sortBy = searchParams.get("sortBy") || "REGD";
        const order = searchParams.get("order")?.toUpperCase() === "ASC" ? "ASC" : "DESC";

        // Map frontend column names to backend SQL columns
        const sortMap: any = {
            "assetNo": "TRIM(ACCN)",
            "hctNo": "TO_NUMBER(REGEXP_REPLACE(TRIM(ISID), '[^0-9]', ''))",
            "modelName": "MODL",
            "equipmentName": "NAEM_SUP",
            "serialNumber": "SERN",
            "nextCal": "CASE WHEN NEXT = '0' OR NEXT IS NULL THEN '99991231' ELSE NEXT END",
            "regDate": "REGD"
        };
        const sortColumn = sortMap[sortBy] || "REGD";

        // Count query for pagination totals
        const countSql = `SELECT COUNT(*) as TOTAL FROM (${sql})`;
        const countResult = await query<any>(countSql, params);
        const totalItems = countResult[0]?.TOTAL || 0;

        // Final SQL with pagination
        // Using ROWNUM for backward compatibility with older Oracle versions
        const isAll = limit >= 9999;

        let paginatedSql = "";
        if (isAll) {
            paginatedSql = `${sql} ORDER BY ${sortColumn} ${order}`;
        } else {
            paginatedSql = `
                SELECT * FROM (
                    SELECT a.*, ROWNUM rnum FROM (
                        ${sql} ORDER BY ${sortColumn} ${order}
                    ) a WHERE ROWNUM <= :upper_limit
                ) WHERE rnum > :offset
            `;
            params.offset = offset;
            params.upper_limit = offset + limit;
        }

        const equipment = await query<any>(paginatedSql, params);

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
