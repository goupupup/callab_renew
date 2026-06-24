class SearchRepository:
    def __init__(self, database):
        self.database = database

    def get_lookups(self):
        return {
            "types": self.database.fetch_all(
                """
                SELECT DISTINCT
                    TRIM(TYEP) as CODE,
                    '[' || TRIM(TYEP) || '] ' || TRIM(DESN) as NAME
                FROM EASYCAL.TBTYPMAN
                WHERE TYEP IS NOT NULL
                ORDER BY NAME
                """,
                {},
            ),
            "modes": self.database.fetch_all(
                """
                SELECT DISTINCT
                    TRIM(MODE_CODE) as CODE,
                    '[' || TRIM(MODE_CODE) || '] ' || TRIM(MODE_DESC) as NAME
                FROM EASYCAL.TBMODMAN
                WHERE MODE_CODE IS NOT NULL
                ORDER BY NAME
                """,
                {},
            ),
            "statuses": self.database.fetch_all(
                """
                SELECT DISTINCT
                    TRIM(STAT) as CODE,
                    '[' || TRIM(STAT) || '] ' || TRIM(DESN) as NAME
                FROM EASYCAL.TBSTAMAN
                WHERE STAT IS NOT NULL
                ORDER BY NAME
                """,
                {},
            ),
            "suppliers": self.database.fetch_all(
                """
                SELECT DISTINCT
                    TRIM(COID) as CODE,
                    TRIM(CONM) as NAME
                FROM EASYCAL.TBSUPMAN
                ORDER BY NAME
                """,
                {},
            ),
            "employees": self.database.fetch_all(
                """
                SELECT DISTINCT
                    TRIM(EMID) as CODE,
                    '[' || TRIM(EMID) || '] ' || TRIM(EMNM) as NAME
                FROM EASYCAL.TBEMPMAN
                WHERE (DIVISION LIKE '%#CAL%' OR DIVISION LIKE '%#TECH%')
                  AND TRIM(STAT) <> 'Retiree'
                ORDER BY NAME
                """,
                {},
            ),
            "subcontractors": self.database.fetch_all(
                """
                SELECT DISTINCT
                    TRIM(COID) as CODE,
                    TRIM(CONM) as NAME
                FROM EASYCAL.TBSUPMAN
                WHERE TRIM(COT2) = '1'
                  AND CONM IS NOT NULL
                ORDER BY NAME
                """,
                {},
            ),
        }
