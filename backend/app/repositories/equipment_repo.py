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
            final_data_sql = f"{data_sql} ORDER BY {sort_column} {sort_order}"
        else:
            offset = (page - 1) * limit
            final_data_sql = f"""
                SELECT * FROM (
                    SELECT a.*, ROWNUM rnum FROM (
                        {data_sql} ORDER BY {sort_column} {sort_order}
                    ) a WHERE ROWNUM <= :upper_limit
                ) WHERE rnum > :offset
            """
            data_params["offset"] = offset
            data_params["upper_limit"] = offset + limit

        return {
            "total": int(count_row.get("TOTAL") or 0),
            "rows": self.database.fetch_all(final_data_sql, data_params),
        }

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
