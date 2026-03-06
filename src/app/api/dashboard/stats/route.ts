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
    const isMaster = session.user.role === "MASTER";

    try {
        const params: any = {};
        let whereClause = " WHERE 1=1";

        if (!isMaster) {
            whereClause += ` AND TRIM(CUST) = :corpId`;
            params.corpId = corpId;
        }

        // 1. Total Equipment
        const equipmentSql = `SELECT COUNT(*) as TOTAL FROM EASYCAL.TBMASMAN ${whereClause}`;

        // 2. On-Going (Using TBCALMAN for process tracking)
        const ongoingWhere = !isMaster ? ` WHERE TRIM(CCOM) = :corpId` : "";
        const ongoingSql = `
            SELECT COUNT(*) as TOTAL 
            FROM EASYCAL.TBCALMAN 
            ${ongoingWhere} 
            ${ongoingWhere ? 'AND' : 'WHERE'} (STAT = '02' OR STAT = '11' OR STAT = '05' OR STAT = '07')
        `;

        // 3. Upcoming Expirations (Optimized for Indexing)
        // Calculating the threshold date in JS to avoid SYSDATE + 30 overhead in every row check if possible
        const thresholdDate = new Date();
        thresholdDate.setDate(thresholdDate.getDate() + 30);
        const thresholdStr = thresholdDate.toISOString().slice(0, 10).replace(/-/g, '');
        const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');

        const expirationsSql = `
            SELECT COUNT(*) as TOTAL 
            FROM EASYCAL.TBMASMAN 
            ${whereClause} 
            AND STAT = '10' 
            AND NEXT <> '0' 
            AND NEXT BETWEEN :today AND :threshold
        `;
        const expirationParams = { ...params, today: todayStr, threshold: thresholdStr };

        // Execute all three in PARALLEL
        const [equipmentResult, ongoingResult, expirationsResult] = await Promise.all([
            query<any>(equipmentSql, params),
            query<any>(ongoingSql, !isMaster ? { corpId } : {}),
            query<any>(expirationsSql, expirationParams)
        ]);

        return NextResponse.json({
            totalEquipment: equipmentResult[0]?.TOTAL || 0,
            ongoingCount: ongoingResult[0]?.TOTAL || 0,
            upcomingExpirations: expirationsResult[0]?.TOTAL || 0,
        });
    } catch (error: any) {
        console.error("Stats API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
