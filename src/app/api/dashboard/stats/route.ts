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
        let equipmentSql = `SELECT COUNT(*) as TOTAL FROM EASYCAL.TBMASMAN WHERE 1=1`;
        let ongoingSql = `SELECT COUNT(*) as TOTAL FROM EASYCAL.TBCALMAN WHERE (STAT = '02' OR STAT = '11' OR STAT = '05' OR STAT = '07')`;
        let expirationsSql = `SELECT COUNT(*) as TOTAL FROM EASYCAL.TBMASMAN WHERE STAT = '10' AND TRIM(NEXT) <> '0' AND TO_DATE(NEXT, 'YYYYMMDD') < SYSDATE + 30`;

        const params: any = {};

        if (!isMaster) {
            equipmentSql += ` AND TRIM(CUST) = :corpId`;
            ongoingSql += ` AND TRIM(CCOM) = :corpId`;
            expirationsSql += ` AND TRIM(CUST) = :corpId`;
            params.corpId = corpId;
        }

        // Stats: Total Equipment
        const equipmentResult = await query<any>(equipmentSql, params);

        // Stats: On-Going
        const ongoingResult = await query<any>(ongoingSql, params);

        // Stats: Upcoming Expirations
        const expirationsResult = await query<any>(expirationsSql, params);

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
