import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { FtpClient } from "@/lib/ftp";

export async function POST(request: Request) {
    const session = await getServerSession(authOptions) as any;

    if (!session?.user?.role) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    const isElevated = role === "MASTER" || role === "EMPLOYEE";

    if (!isElevated) {
        return NextResponse.json({ error: "Forbidden: Only Employee/Master can upload" }, { status: 403 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const id = formData.get("id") as string; // ISID

        if (!file || !id) {
            return NextResponse.json({ error: "Missing file or ID" }, { status: 400 });
        }

        // 1. Get Asset No if possible for consistent naming (optional but good)
        const equipment = await query<any>(`SELECT TRIM(ACCN) as ACCN FROM EASYCAL.TBMASMAN WHERE TRIM(ISID) = :id`, { id });
        const assetNo = equipment.length > 0 ? (equipment[0].ACCN || id) : id;

        // 2. Prepare for FTP Upload
        const ftpClient = new FtpClient();
        const buffer = Buffer.from(await file.arrayBuffer());
        const extension = file.name.split('.').pop() || 'xlsx';

        // Target Path: /HCT_CALLAB/gear/{id}.{ext}
        // We use ISID (HCT No) as the primary identifier for gear files
        const targetPath = `/HCT_CALLAB/gear/${id}.${extension}`;

        console.log(`🚀 [FTP UPLOAD START]: File=${file.name}, Target=${targetPath}, Size=${buffer.length}`);

        await ftpClient.uploadBuffer(buffer, targetPath);

        return NextResponse.json({
            success: true,
            message: "File uploaded successfully",
            path: targetPath
        });

    } catch (error: any) {
        console.error("Upload API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
