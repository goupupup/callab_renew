from typing import Any, Dict, List


class DashboardRepository:
    def __init__(self, database):
        self.database = database

    def get_basic_stats(self, corp_id: str, today: str) -> Dict[str, Any]:
        return self.database.fetch_one(
            """
            SELECT
                COUNT(*) as TOTAL_EQUIPMENT,
                SUM(CASE WHEN STAT IN ('02', '11', '05', '07') THEN 1 ELSE 0 END) as ONGOING_COUNT,
                SUM(CASE WHEN STAT = '10' AND NEXT <> '0' AND NEXT < :today THEN 1 ELSE 0 END) as EXPIRED_COUNT
            FROM EASYCAL.TBMASMAN
            WHERE TRIM(CUST) = :corp_id
            """,
            {"corp_id": corp_id, "today": today},
        ) or {}

    def list_company_stats(self, today: str) -> List[Dict[str, Any]]:
        return self.database.fetch_all(
            """
            SELECT
                TRIM(m.CUST) as CORP_ID,
                MAX(TRIM(c.CONM)) as CORP_NAME,
                COUNT(*) as TOTAL,
                SUM(CASE WHEN m.STAT IN ('02', '11', '05', '07') THEN 1 ELSE 0 END) as ONGOING,
                SUM(CASE WHEN m.NEXT < :today AND m.NEXT <> '0' THEN 1 ELSE 0 END) as EXPIRED
            FROM EASYCAL.TBMASMAN m
            LEFT JOIN EASYCAL.TBSUPMAN c ON TRIM(m.CUST) = TRIM(c.COID)
            GROUP BY TRIM(m.CUST)
            ORDER BY MAX(c.CONM) ASC
            """,
            {"today": today},
        )

    def list_expirations(self, corp_id: str, is_master: bool) -> List[Dict[str, Any]]:
        params = {}
        scope_sql = ""
        if not is_master:
            scope_sql = " AND TRIM(A.CUST) = :corp_id"
            params["corp_id"] = corp_id

        return self.database.fetch_all(
            f"""
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
            {scope_sql}
            ORDER BY A.NEXT
            """,
            params,
        )
