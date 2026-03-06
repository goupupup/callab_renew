import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
    const session = await getServerSession(authOptions) as any;
    const { searchParams } = new URL(request.url);

    if (!session?.user?.corpId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const corpId = session.user.corpId;
    const isMaster = session.user.role === "MASTER";

    // Filtering Params
    const serialNumber = searchParams.get("serialNumber");
    const assetNo = searchParams.get("assetNo");
    const regNo = searchParams.get("regNo");
    const modelName = searchParams.get("modelName");
    const equipmentName = searchParams.get("equipmentName");
    const company = searchParams.get("company");
    const manufacturer = searchParams.get("manufacturer");
    const lastCalStart = searchParams.get("lastCalStart");
    const lastCalEnd = searchParams.get("lastCalEnd");
    const onGoingOnly = searchParams.get("onGoingOnly") === "true";
    const expirationOnly = searchParams.get("expirationOnly") === "true";

    const formatDate = (dateString: any) => {
        if (!dateString) return "---";
        const cleanDate = dateString.toString().trim();
        if (cleanDate === "0" || cleanDate === "" || cleanDate.length !== 8 || cleanDate === "00000000") return "---";

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const year = cleanDate.substring(0, 4);
        const monthIdx = parseInt(cleanDate.substring(4, 6)) - 1;
        const day = cleanDate.substring(6, 8);

        if (monthIdx < 0 || monthIdx > 11) return "---";

        return `${months[monthIdx]}-${day}-${year}`;
    };

    try {
        let sql = `
            SELECT 
                TRIM(ACCN) as ACCN, 
                TRIM(ISID) as ISID, 
                NAEM_SUP, 
                MODL, 
                SERN, 
                NEXT
            FROM EASYCAL.TBMASMAN 
            WHERE 1=1
        `;

        const params: any = {};

        if (!isMaster) {
            sql += ` AND TRIM(CUST) = :corpId`;
            params.corpId = corpId;
        } else if (company) {
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
            sql += ` AND LAST BETWEEN :lastCalStart AND :lastCalEnd`;
            params.lastCalStart = lastCalStart.replace(/-/g, '');
            params.lastCalEnd = lastCalEnd.replace(/-/g, '');
        }

        const sortBy = searchParams.get("sortBy") || "REGD";
        const order = searchParams.get("order")?.toUpperCase() === "ASC" ? "ASC" : "DESC";
        const sortMap: any = {
            "assetNo": "TRIM(ACCN)",
            "hctNo": "TO_NUMBER(REGEXP_REPLACE(TRIM(ISID), '[^0-9]', ''))",
            "modelName": "MODL",
            "equipmentName": "NAEM_SUP",
            "serialNumber": "SERN",
            "nextCal": "CASE WHEN NEXT = '0' OR NEXT IS NULL THEN '99991231' ELSE NEXT END"
        };
        const sortColumn = sortMap[sortBy] || "REGD";

        // Pagination for Export (Matches Current View)
        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "25");
        const offset = (page - 1) * limit;
        const isAll = limit >= 9999;

        let finalSql = "";
        if (isAll) {
            finalSql = `${sql} ORDER BY ${sortColumn} ${order}`;
        } else {
            finalSql = `
                SELECT * FROM (
                    SELECT a.*, ROWNUM rnum FROM (
                        ${sql} ORDER BY ${sortColumn} ${order}
                    ) a WHERE ROWNUM <= :upper_limit
                ) WHERE rnum > :offset
            `;
            params.offset = offset;
            params.upper_limit = offset + limit;
        }

        const rawData = await query<any>(finalSql, params);

        // Define Workbook and Worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet("Equipment List");

        // Set Headers with Style
        const headers = ["No", "Asset No", "HCT No", "Equipment Name", "Model Name", "Serial Number", "Next Cal"];
        worksheet.addRow(headers);

        // Style Headers
        const headerRow = worksheet.getRow(1);
        headerRow.font = { name: "Tahoma", bold: true, size: 10 };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.eachCell((cell) => {
            cell.border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' }
            };
            cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE9EFF7' } // Light blue background
            };
        });

        // Add Data with Style
        rawData.forEach((item: any, index: number) => {
            const displayNo = isAll ? (index + 1) : (offset + index + 1);
            const rowData = [
                displayNo,
                item.ACCN || "---",
                item.ISID,
                item.NAEM_SUP || "---",
                item.MODL || "---",
                item.SERN || "---",
                formatDate(item.NEXT)
            ];
            const row = worksheet.addRow(rowData);
            row.font = { name: "Tahoma", size: 9 };
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' }
                };
            });
        });

        // Auto-set column widths
        worksheet.columns.forEach(column => {
            let maxColumnLength = 0;
            column.eachCell?.({ includeEmpty: true }, (cell) => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxColumnLength) {
                    maxColumnLength = columnLength;
                }
            });
            column.width = maxColumnLength < 10 ? 10 : maxColumnLength + 2;
        });

        // Write to buffer
        const buffer = await workbook.xlsx.writeBuffer();

        return new Response(buffer as any, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="Equipment_Export_${new Date().toISOString().split('T')[0]}.xlsx"`,
            },
        });

    } catch (error: any) {
        console.error("Export API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
