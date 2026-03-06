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

        // 2. Determine FTP Path and Filename
        let ftpPath = "";
        let ftpFilename = "";
        let downloadFilename = "";

        if (type === "data") {
            const ftpClient = new FtpClient();
            const extensions = ["xlsx", "zip", "txt"];
            let found = false;
            let extension = "";

            for (const ext of extensions) {
                const checkPath = `/HCT_CALLAB/gear/${id}.${ext}`;
                if (await ftpClient.fileExists(checkPath)) {
                    ftpPath = "/HCT_CALLAB/gear/";
                    ftpFilename = `${id}.${ext}`;
                    extension = ext;
                    found = true;
                    break;
                }
            }

            if (!found) {
                return NextResponse.json({ error: "업로드된 파일이 없습니다." }, { status: 404 });
            }

            // Format: {Asset} - {year}_{Calno}_{HCTno}.{ext}
            downloadFilename = `${assetNo} - ${year}_${calNo}_${id}.${extension}`;

        } else if (type === "report") {
            if (!calNo) {
                return NextResponse.json({ error: "No calibration records found" }, { status: 404 });
            }

            ftpPath = `/report/report_cust_pdf/${year}/`;
            ftpFilename = `${calNo}.pdf`;
            downloadFilename = `${calNo}.pdf`;
        } else {
            return NextResponse.json({ error: "Invalid type" }, { status: 400 });
        }

        const remotePath = `${ftpPath}${ftpFilename}`;
        console.log(`🔍 [FTP ATTEMPT]: Type=${type}, ISID=${id}, Path=${remotePath}, DownloadAs=${downloadFilename}`);

        // 3. FTP Download & Stream
        const ftpClient = new FtpClient();

        const exists = await ftpClient.fileExists(remotePath);
        if (!exists) {
            console.error(`❌ [FTP NOT FOUND]: ${remotePath}`);
            return NextResponse.json({ error: "File not found on server", debugPath: remotePath }, { status: 404 });
        }

        const { PassThrough } = await import("stream");
        const proxyStream = new PassThrough();

        ftpClient.getFileStream(remotePath).then(ftpStream => {
            ftpStream.pipe(proxyStream);
        }).catch(err => {
            console.error("FTP Stream Error:", err);
            proxyStream.destroy(err);
        });

        return new Response(proxyStream as any, {
            headers: {
                "Content-Type": "application/octet-stream",
                "Content-Disposition": `attachment; filename="${downloadFilename}"`,
            },
        });

    } catch (error: any) {
        console.error("Download API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
