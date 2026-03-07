import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions) as any;

    if (!session?.user?.corpId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const corpId = session.user.corpId;
    const role = session.user.role;
    const isMaster = role === "MASTER";
    const isElevated = role === "MASTER" || role === "EMPLOYEE";

    try {
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        // 1. Basic Stats for the current user's company
        const basicStatsSql = `
            SELECT 
                COUNT(*) as TOTAL_EQUIPMENT,
                SUM(CASE WHEN STAT IN ('02', '11', '05', '07') THEN 1 ELSE 0 END) as ONGOING_COUNT,
                SUM(CASE WHEN STAT = '10' AND NEXT <> '0' AND NEXT < :today THEN 1 ELSE 0 END) as EXPIRED_COUNT
            FROM EASYCAL.TBMASMAN 
            WHERE TRIM(CUST) = :corpId
        `;

        // 2. Additional Company Blocks (Only for MASTER)
        let companyStats: any[] = [];
        if (isMaster) {
            const companyStatsSql = `
                SELECT 
                    TRIM(m.CUST) as CORP_ID,
                    ANY_VALUE(TRIM(c.CONM)) as CORP_NAME,
                    COUNT(*) as TOTAL,
                    SUM(CASE WHEN m.STAT IN ('02', '11', '05', '07') THEN 1 ELSE 0 END) as ONGOING,
                    SUM(CASE WHEN m.NEXT < :today AND m.NEXT <> '0' THEN 1 ELSE 0 END) as EXPIRED
                FROM EASYCAL.TBMASMAN m
                LEFT JOIN EASYCAL.TBSUPMAN c ON TRIM(m.CUST) = TRIM(c.COID)
                GROUP BY TRIM(m.CUST)
                HAVING COUNT(*) > 0
                ORDER BY ANY_VALUE(c.CONM) ASC
            `;
            // Note: If ANY_VALUE is not supported (older Oracle), use standard GROUP BY
            // Using standard GROUP BY for better compatibility
            const compatSql = `
                SELECT 
                    TRIM(m.CUST) as CORP_ID,
                    MAX(TRIM(c.CONM)) as CORP_NAME,
                    COUNT(*) as TOTAL,
                    SUM(CASE WHEN m.STAT IN ('02', '11', '05', '07') THEN 1 ELSE 0 END) as ONGOING,
                    SUM(CASE WHEN m.NEXT < :today AND m.NEXT <> '0' THEN 1 ELSE 0 END) as EXPIRED
                FROM EASYCAL.TBMASMAN m
                LEFT JOIN EASYCAL.TBSUPMAN c ON TRIM(m.CUST) = TRIM(c.COID)
                GROUP BY TRIM(m.CUST)
                ORDER BY MAX(c.CONM) ASC
            `;
            companyStats = await query<any>(compatSql, { today: todayStr });
        }

        const [basicResult] = await Promise.all([
            query<any>(basicStatsSql, { corpId, today: todayStr })
        ]);

        const stats = basicResult[0];

        return NextResponse.json({
            totalEquipment: stats?.TOTAL_EQUIPMENT || 0,
            ongoingCount: stats?.ONGOING_COUNT || 0,
            upcomingExpirations: stats?.EXPIRED_COUNT || 0,
            companyStats: isMaster ? companyStats : null
        });
    } catch (error: any) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
