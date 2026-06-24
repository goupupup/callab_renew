from app.services.excel_export_service import build_equipment_export_xlsx
from app.schemas.equipment import EquipmentItem
from io import BytesIO
from zipfile import ZipFile


def test_build_equipment_export_xlsx_returns_zip_based_workbook():
    content = build_equipment_export_xlsx(
        [
            EquipmentItem(
                ISID="1001",
                ACCN="A-1",
                NAEM_SUP="Equipment",
                MODL="Model",
                SERN="SN",
                LAST="20250101",
                NEXT="20260101",
            )
        ]
    )

    assert content.startswith(b"PK")
    with ZipFile(BytesIO(content)) as workbook:
        sheet_xml = workbook.read("xl/worksheets/sheet1.xml")
    assert b"Equipment" in sheet_xml
