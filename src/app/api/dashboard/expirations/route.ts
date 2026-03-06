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
        let sql = `
            SELECT
                A.ISID,
                A.NAEM_SUP,
                A.MODL,
                (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.MNFC) as MNFC_NAME,
                A.SERN,
                (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.CUST) as CUST_NAME,
                A.LAST,
                A.NEXT,
                A.TERM,                        
                (SELECT TRIM(MODE_DESC) FROM EASYCAL.TBMODMAN WHERE MODE_CODE = A.MODE_CODE) as MODE_NAME,
                A.LAST_NAM as OWNER_NAME,
                CASE
                    WHEN (
                        SELECT LOCT_PRE
                        FROM TBCALMAN
                        WHERE ISID = A.ISID
                          AND CIDU = (SELECT MAX(CIDU) FROM TBCALMAN WHERE ISID = A.ISID)
                    ) = 'A' THEN 'ON SITE'
                    ELSE 'VISIT'
                END as LOCATION_STATUS
            FROM EASYCAL.TBMASMAN A
            WHERE A.STAT = '10'
        `;

        const params: any = {};

        if (!isMaster) {
            sql += ` AND TRIM(A.CUST) = :corpId`;
            params.corpId = corpId;
        }

        sql += ` ORDER BY A.NEXT`;

        const expirations = await query<any>(sql, params);

        return NextResponse.json(expirations);
    } catch (error: any) {
        console.error("Expirations API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
