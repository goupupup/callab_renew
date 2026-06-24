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
