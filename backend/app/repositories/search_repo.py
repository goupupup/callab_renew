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

    def search_reg_no(self, q: str):
        return self.database.fetch_all(
            """
            SELECT
                TRIM(a.ISID) as ISID,
                TRIM(a.NAEM_SUP) as NAEM_SUP,
                TRIM(a.NAEM) as NAEM,
                TRIM(a.MODL) as MODL,
                TRIM(a.SERN) as SERN,
                TRIM(a.ACCN) as ACCN,
                TRIM(a.STAT) as STAT,
                TRIM(a.TYEP) as TYEP,
                TRIM(a.MODE_CODE) as MODE_CODE,
                TRIM(a.TERM) as TERM,
                TRIM(a.LAST) as LAST,
                TRIM(a.NEXT) as NEXT,
                TRIM(a.CUST) as CUST,
                TRIM(a.MEMO) as MEMO,
                TRIM(a.MNFC) as MNFC,
                TRIM(b.CONM) as MANUFACTURE,
                TRIM(c.CONM) as APPLICANT
            FROM EASYCAL.TBMASMAN a
            LEFT JOIN EASYCAL.TBSUPMAN b ON a.MNFC = b.COID
            LEFT JOIN EASYCAL.TBSUPMAN c ON a.CUST = c.COID
            WHERE UPPER(TRIM(a.ISID)) = UPPER(:q)
            ORDER BY a.ISID DESC
            """,
            {"q": q.strip()},
        )

    def search_cal_no(self, q: str):
        return self.database.fetch_all(
            """
            SELECT
                TRIM(A.ISID) as ISID,
                TRIM(B.CIDU) as CIDU,
                TRIM(B.KOLAS_NO) as CERTNO,
                TRIM(A.NAEM_SUP) as EQIP_NAME,
                TRIM(A.MODL) as MODEL,
                TRIM(A.SERN) as SN,
                TRIM(B.CASD) as REC_DATE,
                TRIM(B.CARD) as CAL_DATE
            FROM EASYCAL.TBMASMAN A
            LEFT JOIN EASYCAL.TBCALMAN B ON A.ISID = B.ISID
            WHERE UPPER(TRIM(B.CIDU)) LIKE UPPER(:q)
            ORDER BY B.CIDU DESC
            """,
            {"q": f"%{q.strip()}%"},
        )

    def search_model(self, q: str):
        return self.database.fetch_all(
            """
            SELECT
                TRIM(a.ISID) as ISID,
                TRIM(a.NAEM_SUP) as NAEM_SUP,
                TRIM(a.NAEM) as NAEM,
                TRIM(a.MODL) as MODL,
                TRIM(a.SERN) as SERN,
                TRIM(a.ACCN) as ACCN,
                TRIM(a.TERM) as TERM,
                (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = a.MNFC) as MNFC_NAME,
                (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = a.CUST) as CUST_NAME,
                TRIM(a.LAST) as LAST,
                TRIM(a.SELF) as SELF,
                TRIM(a.MEMO) as MEMO
            FROM EASYCAL.TBMASMAN a
            WHERE UPPER(TRIM(a.MODL)) LIKE UPPER(:q)
               OR UPPER(TRIM(a.NAEM_SUP)) LIKE UPPER(:q)
               OR UPPER(TRIM(a.NAEM)) LIKE UPPER(:q)
            ORDER BY a.ISID DESC
            """,
            {"q": f"%{q.strip()}%"},
        )

    def search_ongoing(self, filters):
        sql = """
            SELECT
                TRIM(A.ISID) as ISID,
                '[' || TRIM(B.EMID) || '] ' || TRIM(B.EMNM) as REG_ENGINEER,
                TRIM(A.EXP_DATE) as NEXT,
                TRIM(E.NAEM_SUP) as NAEM_SUP,
                TRIM(E.MODL) as MODL,
                TRIM(E.SERN) as SERN,
                TRIM(D.CONM) as APPLICANT,
                TRIM(A.CIDU) as CALN,
                TRIM(C.DESN) as STATUS_NAME,
                TRIM(A.CASD) as CASD
            FROM EASYCAL.TBCALMAN A
            LEFT JOIN EASYCAL.TBEMPMAN B ON A.EXP_RESP = B.EMID
            LEFT JOIN EASYCAL.TBSTAMAN C ON A.STAT = C.STAT
            LEFT JOIN EASYCAL.TBSUPMAN D ON A.CCOM = D.COID
            LEFT JOIN EASYCAL.TBMASMAN E ON A.ISID = E.ISID
            WHERE (A.STAT = '02' OR A.STAT = '11' OR A.STAT = '05' OR A.STAT = '07')
        """
        params = {}
        if filters.get("regno"):
            sql += " AND TRIM(A.ISID) = :regno"
            params["regno"] = filters["regno"].strip()
        if filters.get("calno"):
            sql += " AND TRIM(A.CIDU) = :calno"
            params["calno"] = filters["calno"].strip()
        if filters.get("applicant"):
            sql += " AND A.CCOM = :applicant"
            params["applicant"] = filters["applicant"].strip()
        if filters.get("engineer"):
            sql += " AND B.EMID = :engineer"
            params["engineer"] = filters["engineer"].strip()
        sql += " ORDER BY A.CASD DESC, A.CIDU DESC"
        return self.database.fetch_all(sql, params)

    def search_expirations(self, filters):
        sql = """
            SELECT
                A.ISID,
                A.NAEM_SUP,
                A.MODL,
                (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.MNFC) as MANUFACTURE,
                A.SERN,
                (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.CUST) as APPLICANT,
                A.LAST,
                A.NEXT,
                A.TERM,
                (SELECT TRIM(MODE_DESC) FROM EASYCAL.TBMODMAN WHERE MODE_CODE = A.MODE_CODE) as MODE_NAME
            FROM EASYCAL.TBMASMAN A
            WHERE A.STAT = '10' AND A.TYEP = '01'
        """
        params = {}
        if filters.get("applicant"):
            sql += " AND A.CUST = :applicant"
            params["applicant"] = filters["applicant"].strip()
        if filters.get("mnfc"):
            sql += " AND A.MNFC = :mnfc"
            params["mnfc"] = filters["mnfc"].strip()
        if filters.get("startDate") and filters.get("endDate"):
            sql += " AND A.NEXT >= :start_date AND A.NEXT <= :end_date AND TRIM(A.NEXT) <> '0'"
            params["start_date"] = filters["startDate"].replace("-", "")
            params["end_date"] = filters["endDate"].replace("-", "")
        sql += " ORDER BY A.NEXT ASC"
        return self.database.fetch_all(sql, params)
