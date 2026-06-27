from dataclasses import dataclass
from typing import Any, Dict


@dataclass
class EquipmentFilters:
    serial_number: str = ""
    asset_no: str = ""
    reg_no: str = ""
    model_name: str = ""
    equipment_name: str = ""
    company: str = ""
    manufacturer: str = ""
    last_cal_start: str = ""
    last_cal_end: str = ""
    next_cal_start: str = ""
    next_cal_end: str = ""
    on_going_only: bool = False
    expiration_only: bool = False


@dataclass
class EquipmentSort:
    sort_by: str = "regDate"
    order: str = "desc"


class EquipmentRepository:
    UPDATE_COLUMNS = {
        "STAT",
        "TYEP",
        "MODE_CODE",
        "TERM",
        "LAST",
        "NEXT",
        "CUST",
        "MEMO",
        "ACC1",
        "SELF",
        "EXTN",
        "NAEM_SUP",
        "ACCN",
        "SERN",
        "NAEM",
        "MODL",
        "MNFC",
    }
    SORT_COLUMNS = {
        "assetNo": "TRIM(m.ACCN)",
        "hctNo": "TO_NUMBER(REGEXP_REPLACE(TRIM(m.ISID), '[^0-9]', ''))",
        "modelName": "m.MODL",
        "equipmentName": "m.NAEM_SUP",
        "serialNumber": "m.SERN",
        "lastCal": "CASE WHEN m.LAST = '0' OR m.LAST IS NULL THEN '00000000' ELSE m.LAST END",
        "nextCal": "CASE WHEN m.NEXT = '0' OR m.NEXT IS NULL THEN '99991231' ELSE m.NEXT END",
        "regDate": "m.REGD",
    }

    def __init__(self, database):
        self.database = database

    def search_equipment(
        self,
        corp_id: str,
        is_elevated: bool,
        filters: EquipmentFilters,
        page: int,
        limit: int,
        sort: EquipmentSort,
    ) -> Dict[str, Any]:
        where_sql, params = self._build_where_sql(corp_id, is_elevated, filters, alias="m")
        count_where_sql, count_params = self._build_where_sql(
            corp_id,
            is_elevated,
            filters,
            alias="",
        )
        sort_column = self.SORT_COLUMNS.get(sort.sort_by, "m.REGD")
        sort_order = "ASC" if sort.order.upper() == "ASC" else "DESC"

        count_row = self.database.fetch_one(
            f"SELECT COUNT(*) as TOTAL FROM EASYCAL.TBMASMAN {count_where_sql}",
            count_params,
        ) or {}

        data_sql = f"""
            SELECT
                TRIM(m.ISID) as ISID,
                TRIM(m.ACCN) as ACCN,
                m.SERN as SERN,
                m.MODL as MODL,
                m.NAEM_SUP as NAEM_SUP,
                TRIM(m.MNFC) as MNFC,
                m.REGD as REGD,
                m.LAST as LAST,
                m.NEXT as NEXT,
                m.STAT as STAT,
                TRIM(s.CONM) as MANUFACTURER_NAME,
                TRIM(cust.CONM) as CUSTOMER_NAME
            FROM EASYCAL.TBMASMAN m
            LEFT JOIN EASYCAL.TBSUPMAN s ON TRIM(m.MNFC) = TRIM(s.COID)
            LEFT JOIN EASYCAL.TBSUPMAN cust ON TRIM(m.CUST) = TRIM(cust.COID)
            {where_sql}
        """

        is_all = limit >= 9999
        data_params = dict(params)
        if is_all:
            final_data_sql = f"""
                SELECT a.*, NULL as CIDU
                FROM (
                    {data_sql} ORDER BY {sort_column} {sort_order}
                ) a
            """
        else:
            offset = (page - 1) * limit
            final_data_sql = f"""
                SELECT paged.*,
                    (
                        SELECT MAX(TRIM(cal.CIDU))
                        FROM EASYCAL.TBCALMAN cal
                        WHERE TRIM(cal.ISID) = TRIM(paged.ISID)
                    ) as CIDU
                FROM (
                    SELECT a.*, ROWNUM rnum FROM (
                        {data_sql} ORDER BY {sort_column} {sort_order}
                    ) a WHERE ROWNUM <= :upper_limit
                ) paged WHERE rnum > :offset
            """
            data_params["offset"] = offset
            data_params["upper_limit"] = offset + limit

        return {
            "total": int(count_row.get("TOTAL") or 0),
            "rows": self.database.fetch_all(final_data_sql, data_params),
        }

    def update_equipment(self, equipment_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        values = {}
        for key, value in payload.items():
            column = key.upper()
            if column in self.UPDATE_COLUMNS:
                values[column] = _extract_code(value)

        if not values:
            return {"rowsAffected": 0}

        assignments = [f"{column} = :{column.lower()}" for column in values]
        params = {column.lower(): value for column, value in values.items()}
        params["isid"] = equipment_id.strip()

        return self.database.execute(
            f"""
            UPDATE EASYCAL.TBMASMAN
            SET {", ".join(assignments)}
            WHERE TRIM(ISID) = :isid
            """,
            params,
        )

    def search_cert_downloads(
        self,
        corp_id: str,
        is_elevated: bool,
        filters,
    ):
        sql = """
            SELECT *
            FROM (
                SELECT
                    TRIM(m.ISID) as ISID,
                    TRIM(c.CIDU) as CIDU,
                    TRIM(m.ACCN) as ACCN,
                    TRIM(m.NAEM_SUP) as NAEM_SUP,
                    TRIM(m.MODL) as MODL,
                    TRIM(m.SERN) as SERN,
                    TRIM(cust.CONM) as CUSTOMER_NAME,
                    TRIM(mnfc.CONM) as MANUFACTURER_NAME,
                    TRIM(c.CARD) as CAL_DATE,
                    TRIM(c.ROTD) as RETURN_DATE
                FROM EASYCAL.TBCALMAN c
                JOIN EASYCAL.TBMASMAN m ON TRIM(c.ISID) = TRIM(m.ISID)
                LEFT JOIN EASYCAL.TBSUPMAN cust ON TRIM(m.CUST) = TRIM(cust.COID)
                LEFT JOIN EASYCAL.TBSUPMAN mnfc ON TRIM(m.MNFC) = TRIM(mnfc.COID)
                WHERE TRIM(c.CIDU) IS NOT NULL
        """
        params = {}

        if not is_elevated:
            sql += " AND TRIM(m.CUST) = :corp_id"
            params["corp_id"] = corp_id
        elif filters.company:
            sql += """
                AND (
                    TRIM(m.CUST) LIKE '%' || :company || '%'
                    OR UPPER(TRIM(cust.CONM)) LIKE '%' || UPPER(TRIM(:company)) || '%'
                )
            """
            params["company"] = filters.company.strip()

        if filters.regNo:
            sql += " AND UPPER(TRIM(m.ISID)) = UPPER(TRIM(:reg_no))"
            params["reg_no"] = filters.regNo.strip()
        if filters.equipmentName:
            sql += " AND UPPER(TRIM(m.NAEM_SUP)) LIKE '%' || UPPER(TRIM(:equipment_name)) || '%'"
            params["equipment_name"] = filters.equipmentName.strip()
        if filters.modelName:
            sql += " AND UPPER(TRIM(m.MODL)) LIKE '%' || UPPER(TRIM(:model_name)) || '%'"
            params["model_name"] = filters.modelName.strip()
        if filters.manufacturer:
            sql += """
                AND (
                    TRIM(m.MNFC) LIKE '%' || :manufacturer || '%'
                    OR UPPER(TRIM(mnfc.CONM)) LIKE '%' || UPPER(TRIM(:manufacturer)) || '%'
                )
            """
            params["manufacturer"] = filters.manufacturer.strip()
        if filters.calDateStart:
            sql += " AND TRIM(c.CARD) <> '0' AND c.CARD >= :cal_date_start"
            params["cal_date_start"] = _date_param(filters.calDateStart)
        if filters.calDateEnd:
            sql += " AND TRIM(c.CARD) <> '0' AND c.CARD <= :cal_date_end"
            params["cal_date_end"] = _date_param(filters.calDateEnd)
        if filters.returnDateStart:
            sql += " AND TRIM(c.ROTD) <> '0' AND c.ROTD >= :return_date_start"
            params["return_date_start"] = _date_param(filters.returnDateStart)
        if filters.returnDateEnd:
            sql += " AND TRIM(c.ROTD) <> '0' AND c.ROTD <= :return_date_end"
            params["return_date_end"] = _date_param(filters.returnDateEnd)

        sql += """
                ORDER BY c.CARD DESC, c.CIDU DESC
            )
            WHERE ROWNUM <= :limit
        """
        params["limit"] = filters.limit
        return self.database.fetch_all(sql, params)

    def get_file_context(
        self,
        corp_id: str,
        is_elevated: bool,
        equipment_id: str,
        cal_no: str = "",
    ):
        cal_filter = (
            "AND TRIM(c.CIDU) = :cal_no"
            if cal_no
            else "AND c.CIDU = (SELECT MAX(CIDU) FROM EASYCAL.TBCALMAN WHERE TRIM(ISID) = :equipment_id)"
        )
        tenant_filter = "" if is_elevated else "AND TRIM(m.CUST) = :corp_id"
        params = {"equipment_id": equipment_id.strip()}
        if cal_no:
            params["cal_no"] = cal_no.strip()
        if not is_elevated:
            params["corp_id"] = corp_id

        return self.database.fetch_one(
            f"""
            SELECT
                TRIM(m.ISID) as ISID,
                TRIM(m.ACCN) as ACCN,
                TRIM(c.CIDU) as CIDU
            FROM EASYCAL.TBMASMAN m
            JOIN EASYCAL.TBCALMAN c ON TRIM(m.ISID) = TRIM(c.ISID)
            WHERE TRIM(m.ISID) = :equipment_id
            {cal_filter}
            {tenant_filter}
            """,
            params,
        )

    def get_asset_no(self, equipment_id: str):
        row = self.database.fetch_one(
            """
            SELECT TRIM(ACCN) as ACCN
            FROM EASYCAL.TBMASMAN
            WHERE TRIM(ISID) = :equipment_id
            """,
            {"equipment_id": equipment_id.strip()},
        )
        return row.get("ACCN") if row else ""

    def _build_where_sql(
        self,
        corp_id: str,
        is_elevated: bool,
        filters: EquipmentFilters,
        alias: str,
    ):
        prefix = f"{alias}." if alias else ""
        where = ["WHERE 1=1"]
        params = {}

        if not is_elevated:
            where.append(f"AND TRIM({prefix}CUST) = :corp_id")
            params["corp_id"] = corp_id
        elif filters.company:
            where.append(
                f"""AND (TRIM({prefix}CUST) LIKE '%' || :company || '%'
                OR EXISTS (
                    SELECT 1 FROM EASYCAL.TBSUPMAN s2
                    WHERE TRIM(s2.COID) = TRIM({prefix}CUST)
                      AND UPPER(TRIM(s2.CONM)) LIKE '%' || UPPER(TRIM(:company)) || '%'
                ))"""
            )
            params["company"] = filters.company

        if filters.serial_number:
            where.append(f"AND UPPER(TRIM({prefix}SERN)) LIKE '%' || UPPER(TRIM(:sern)) || '%'")
            params["sern"] = filters.serial_number
        if filters.asset_no:
            where.append(f"AND UPPER(TRIM({prefix}ACCN)) LIKE '%' || UPPER(TRIM(:accn)) || '%'")
            params["accn"] = filters.asset_no
        if filters.reg_no:
            where.append(f"AND UPPER(TRIM({prefix}ISID)) = UPPER(TRIM(:isid))")
            params["isid"] = filters.reg_no
        if filters.model_name:
            where.append(f"AND UPPER(TRIM({prefix}MODL)) LIKE '%' || UPPER(TRIM(:model_name)) || '%'")
            params["model_name"] = filters.model_name
        if filters.equipment_name:
            where.append(
                f"AND UPPER(TRIM({prefix}NAEM_SUP)) LIKE '%' || UPPER(TRIM(:equipment_name)) || '%'"
            )
            params["equipment_name"] = filters.equipment_name
        if filters.on_going_only:
            where.append(f"AND {prefix}STAT IN ('02', '11', '05', '07')")
        if filters.expiration_only:
            where.append(f"AND {prefix}NEXT < TO_CHAR(SYSDATE, 'YYYYMMDD') AND {prefix}NEXT != '0'")
        if filters.manufacturer:
            where.append(
                f"""AND {prefix}MNFC IN (
                    SELECT COID FROM EASYCAL.TBSUPMAN
                    WHERE UPPER(TRIM(CONM)) LIKE '%' || UPPER(TRIM(:mnfc)) || '%'
                )"""
            )
            params["mnfc"] = filters.manufacturer
        if filters.last_cal_start and filters.last_cal_end:
            where.append(f"AND {prefix}LAST BETWEEN :last_cal_start AND :last_cal_end")
            params["last_cal_start"] = _date_param(filters.last_cal_start)
            params["last_cal_end"] = _date_param(filters.last_cal_end)
        if filters.next_cal_start and filters.next_cal_end:
            where.append(f"AND {prefix}NEXT BETWEEN :next_cal_start AND :next_cal_end")
            params["next_cal_start"] = _date_param(filters.next_cal_start)
            params["next_cal_end"] = _date_param(filters.next_cal_end)

        return "\n".join(where), params


def _date_param(value: str) -> str:
    return value.replace("-", "")


def _extract_code(value) -> str:
    text = str(value or "").strip()
    if text.startswith("[") and "]" in text:
        return text[1 : text.index("]")].strip()
    return text
