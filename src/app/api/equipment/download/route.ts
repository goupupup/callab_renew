import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { FtpClient } from "@/lib/ftp";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions) as any;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id")?.trim(); // ID trim is essential for DB and FTP
    const type = searchParams.get("type"); // 'data' or 'report'

    if (!session?.user?.corpId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!id || !type) {
        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const corpId = session.user.corpId;
    const isMaster = session.user.role === "MASTER";

    try {
        // 1. Verify access to this equipment and get basic info
        const verifySql = `
            SELECT 
                TRIM(ISID) as ISID, 
                TRIM(ACCN) as ACCN,
                (SELECT TRIM(CIDU) FROM EASYCAL.TBCALMAN WHERE ISID = EASYCAL.TBMASMAN.ISID AND CIDU = (SELECT MAX(CIDU) FROM EASYCAL.TBCALMAN WHERE ISID = EASYCAL.TBMASMAN.ISID)) as CIDU
            FROM EASYCAL.TBMASMAN 
            WHERE TRIM(ISID) = :id 
            ${!isMaster ? 'AND TRIM(CUST) = :corpId' : ''}
        `;

        const verifyParams: any = { id };
        if (!isMaster) verifyParams.corpId = corpId;

        const verifyResult = await query<any>(verifySql, verifyParams);
        if (verifyResult.length === 0) {
            return NextResponse.json({ error: "Forbidden: No access to this equipment" }, { status: 403 });
        }

        const equipmentInfo = verifyResult[0];
        const assetNo = equipmentInfo.ACCN || id;
        const calNo = equipmentInfo.CIDU || "";

        let year = "";
        if (calNo) {
            const fourDigitMatch = calNo.match(/\d{4}/);
            if (fourDigitMatch) {
                year = fourDigitMatch[0];
            } else if (calNo.length >= 2 && !isNaN(Number(calNo.substring(0, 2)))) {
                year = "20" + calNo.substring(0, 2);
            }
        }
        if (!year) year = new Date().getFullYear().toString();

        let downloadFilename = "";

        // 2. Determine potential FTP Paths
        const potentialPaths: string[] = [];
        if (type === "data") {
            const extensions = ["xlsx", "XLSX", "zip", "ZIP", "txt", "PDF", "pdf"];

            // // 1. Raw Data Path (Year-based)
            // if (calNo && year) {
            //     for (const ext of extensions) {
            //         potentialPaths.push(`/report/report_rawdata/${year}/${calNo}.${ext}`);
            //     }
            // }

            // 2. Legacy Gear Path (ISID)
            for (const ext of extensions) {
                potentialPaths.push(`/HCT_CALLAB/gear/${id}.${ext}`);
            }

            // 3. Legacy Gear Path (Asset No)
            if (assetNo && assetNo !== id) {
                for (const ext of extensions) {
                    potentialPaths.push(`/HCT_CALLAB/gear/${assetNo}.${ext}`);
                }
            }

            // 4. Fallback search by ID directly in HCT_CALLAB
            potentialPaths.push(`/HCT_CALLAB/${id}.xlsx`);

            downloadFilename = `${assetNo} - ${year}_${calNo}_${id}.xlsx`;
        } else {
            if (!calNo) return NextResponse.json({ error: "No calibration records found" }, { status: 404 });

            // 1. Primary Report Path
            potentialPaths.push(`/report/report_cust_pdf/${year}/${calNo}.pdf`);
            potentialPaths.push(`/report/report_cust_pdf/${year}/${calNo}.PDF`);

            // 2. Fallback Report Path (No Year)
            potentialPaths.push(`/report/report_cust_pdf/${calNo}.pdf`);

            // 3. Fallback: HCT_CALLAB/report
            potentialPaths.push(`/HCT_CALLAB/report/${calNo}.pdf`);
            potentialPaths.push(`/HCT_CALLAB/report/${id}.pdf`);

            // 4. Fallback: Raw Data or Gear
            potentialPaths.push(`/report/report_rawdata/${year}/${calNo}.pdf`);
            potentialPaths.push(`/HCT_CALLAB/gear/${id}.pdf`);
            potentialPaths.push(`/HCT_CALLAB/gear/${calNo}.pdf`);

            downloadFilename = `${calNo}.pdf`;
        }

        // 3. FTP Download & Stream (Optimized: One connection for search + stream)
        const ftpClient = new FtpClient();
        const result = await ftpClient.getStreamForFirstAvailable(potentialPaths);

        if (!result) {
            console.error(`❌ [FTP NOT FOUND]: ${type} for ID=${id}, searched paths: ${potentialPaths.join(', ')}`);
            return NextResponse.json({
                error: type === "data" ? "업로드된 파일이 없습니다." : "성적서 파일이 없습니다.",
                debugPaths: potentialPaths
            }, { status: 404 });
        }

        const { stream: nodeStream, size: fileSize, remotePath } = result;

        // Refine download filename extension for data files if needed
        if (type === "data") {
            const actualExt = remotePath.split('.').pop();
            downloadFilename = `${assetNo} - ${year}_${calNo}_${id}.${actualExt}`;
        } else {
            downloadFilename = remotePath.split('/').pop() || downloadFilename;
        }

        console.log(`🚀 [FTP STREAM START]: Path=${remotePath}, Size=${fileSize}, DownloadAs=${downloadFilename}`);

        const { Readable } = await import("stream");
        const webStream = Readable.toWeb(nodeStream);
        const safeDownloadFilename = downloadFilename.replace(/["\s]/g, '_');

        return new Response(webStream as any, {
            headers: {
                "Content-Type": type === "report" ? "application/pdf" : "application/octet-stream",
                "Content-Disposition": `attachment; filename="${encodeURIComponent(safeDownloadFilename)}"; filename*=UTF-8''${encodeURIComponent(downloadFilename)}`,
                "Content-Length": fileSize.toString(),
                "Cache-Control": "no-store, no-cache, must-revalidate",
            },
        });

    } catch (error: any) {
        console.error("Download API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
