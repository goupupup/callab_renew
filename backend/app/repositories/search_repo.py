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

    def search_model_advanced(self, filters, corp_id: str, is_elevated: bool):
        sql = """
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
                TRIM(a.MEMO) as MEMO,
                (SELECT TRIM(MODE_DESC) FROM EASYCAL.TBMODMAN WHERE MODE_CODE = a.MODE_CODE) as MODE_DESC
            FROM EASYCAL.TBMASMAN a
            WHERE 1=1
        """
        params = {}

        cust = _extract_code(filters.get("cust", ""))
        mnfc = _extract_code(filters.get("mnfc", ""))
        eqpt_name = filters.get("eqptName", "").strip()
        model = filters.get("model", "").strip()
        memo = filters.get("memo", "").strip()
        is_exact = filters.get("isExact") == "true"

        if not is_elevated:
            sql += " AND a.CUST = :corp_id"
            params["corp_id"] = corp_id
        if cust:
            sql += " AND TRIM(a.CUST) = :cust"
            params["cust"] = cust
        if mnfc:
            sql += " AND TRIM(a.MNFC) = :mnfc"
            params["mnfc"] = mnfc
        if eqpt_name:
            sql += " AND (UPPER(TRIM(a.NAEM_SUP)) LIKE :eqpt_name OR UPPER(TRIM(a.NAEM)) LIKE :eqpt_name)"
            params["eqpt_name"] = f"%{eqpt_name.upper()}%"
        if model:
            if is_exact:
                sql += " AND UPPER(TRIM(a.MODL)) = :model"
                params["model"] = model.upper()
            else:
                sql += " AND UPPER(TRIM(a.MODL)) LIKE :model"
                params["model"] = f"%{model.upper()}%"
        if memo:
            sql += " AND UPPER(TRIM(a.MEMO)) LIKE :memo"
            params["memo"] = f"%{memo.upper()}%"

        sql += " ORDER BY a.ISID DESC"
        return self.database.fetch_all(sql, params)

    def search_cal_history(self, filters):
        sql = """
            SELECT
                TRIM(A.ISID) as ISID,
                TRIM(B.CIDU) as CIDU,
                TRIM(B.KOLAS_NO) as CERTNO,
                (SELECT '[' || TRIM(STAT) || '] ' || TRIM(DESN) FROM EASYCAL.TBSTAMAN WHERE STAT = B.STAT) as STATUS_NAME,
                (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.CUST) as APPLICANT,
                TRIM(A.NAEM_SUP) as EQIP_NAME,
                TRIM(A.MODL) as MODEL,
                TRIM(A.SERN) as SN,
                (SELECT TRIM(CONM) FROM EASYCAL.TBSUPMAN WHERE COID = A.MNFC) as MNFC_NAME,
                TRIM(A.ACCN) as ASSET,
                TRIM(B.CASD) as REC_DATE,
                TRIM(B.CARD) as CAL_DATE,
                TRIM(B.SIDT) as APPV_DATE,
                TRIM(A.NEXT) as DUE_DATE,
                TRIM(A.TERM) as TERM,
                TRIM(B.ROTD) as RET_DATE,
                CASE
                    WHEN B.LOCT = '0' THEN 'Visit'
                    ELSE 'On Site'
                END as REC_TYPE,
                (SELECT '['||TRIM(MODE_CODE)||']'||TRIM(MODE_DESC) FROM EASYCAL.TBMODMAN WHERE MODE_CODE = A.MODE_CODE) as CAL_TYPE,
                TRIM(B.CNAM) as CONTACT,
                TRIM(B.CANCEL_RSN) as CANCEL_RSN
            FROM EASYCAL.TBMASMAN A
            LEFT JOIN EASYCAL.TBCALMAN B ON A.ISID = B.ISID
            WHERE 1=1
        """
        params = {}

        exact_filters = {
            "isid": ("TRIM(A.ISID)", "isid"),
            "calNo": ("TRIM(B.CIDU)", "cal_no"),
            "asset": ("TRIM(A.ACCN)", "asset"),
            "ccom": ("TRIM(B.CCOM)", "ccom"),
            "mnfc": ("TRIM(A.MNFC)", "mnfc"),
            "emid": ("TRIM(B.EMID)", "emid"),
            "state": ("TRIM(B.STAT)", "state"),
            "certNo": ("TRIM(B.KOLAS_NO)", "cert_no"),
        }
        for filter_key, (column, param_key) in exact_filters.items():
            value = _extract_code(filters.get(filter_key, ""))
            if value:
                sql += f" AND {column} = :{param_key}"
                params[param_key] = value

        date_filters = {
            "recStart": ("B.CASD", ">=", "rec_start"),
            "recEnd": ("B.CASD", "<=", "rec_end"),
            "calStart": ("B.CARD", ">=", "cal_start"),
            "calEnd": ("B.CARD", "<=", "cal_end"),
            "retStart": ("B.ROTD", ">=", "ret_start"),
            "retEnd": ("B.ROTD", "<=", "ret_end"),
        }
        for filter_key, (column, operator, param_key) in date_filters.items():
            value = filters.get(filter_key, "")
            if value:
                sql += f" AND TRIM({column}) <> '0' AND TO_DATE({column},'YYYYMMDD') {operator} TO_DATE(:{param_key},'MMDDYYYY')"
                params[param_key] = _to_mmddyyyy(value)

        in_house = filters.get("inHouse") == "true"
        on_site = filters.get("onSite") == "true"
        if not in_house or not on_site:
            if on_site:
                sql += " AND B.LOCT_PRE = 'A'"
            elif in_house:
                sql += " AND B.LOCT_PRE = 'B'"

        sql += " ORDER BY B.CIDU DESC"
        return self.database.fetch_all(sql, params)

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
        if filters.get("contact_person"):
            sql += " AND A.CNAM LIKE :contact_person"
            params["contact_person"] = f"%{filters['contact_person']}%"
        if filters.get("mnfc"):
            sql += " AND E.MNFC = :mnfc"
            params["mnfc"] = _extract_code(filters["mnfc"])
        if filters.get("selfExt"):
            sql += " AND E.SELF = :self_ext"
            params["self_ext"] = filters["selfExt"].strip()
        if filters.get("onoffSite"):
            sql += " AND A.LOCT_PRE = :onoff_site"
            params["onoff_site"] = filters["onoffSite"].strip()
        if filters.get("startDate"):
            sql += " AND TO_DATE(A.CASD,'YYYYMMDD') >= TO_DATE(:start_date,'YYYYMMDD')"
            params["start_date"] = filters["startDate"].replace("-", "")
        if filters.get("endDate"):
            sql += " AND TO_DATE(A.CASD,'YYYYMMDD') <= TO_DATE(:end_date,'YYYYMMDD')"
            params["end_date"] = filters["endDate"].replace("-", "")
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

    def search_master(self, filters):
        sql = """
            SELECT
                TRIM(A.EQPNAM) as EQPNAM,
                TRIM(A.MDLNAM) as MDLNAM,
                TRIM(B.CONM) as MNFCTR,
                TRIM(A.MNFCTR) as MNFC,
                TRIM(A.CALTRM) as CALTRM,
                TRIM(A.SELF) as SELF,
                '[' || TRIM(A.MODE_CODE) || '] ' || TRIM(C.MODE_DESC) as MODE_NAME,
                TRIM(A.CLSMAN_EXT) as CLSMAN_EXT,
                TRIM(A.MDLNO) as MDLNO
            FROM EASYCAL.TBMDLMAN A
            LEFT JOIN EASYCAL.TBSUPMAN B ON A.MNFCTR = B.COID
            LEFT JOIN EASYCAL.TBMODMAN C ON A.MODE_CODE = C.MODE_CODE
            WHERE 1=1
        """
        params = {}

        name = _extract_code(filters.get("name", ""))
        model = _extract_code(filters.get("model", ""))
        manufacturer = _extract_code(filters.get("manufacturer", ""))

        if name:
            sql += " AND TRIM(UPPER(A.EQPNAM)) LIKE :name"
            params["name"] = f"%{name.upper()}%"
        if model:
            sql += " AND TRIM(UPPER(A.MDLNAM)) LIKE :model"
            params["model"] = f"%{model.upper()}%"
        if manufacturer:
            sql += " AND (TRIM(A.MNFCTR) = :manufacturer OR TRIM(UPPER(B.CONM)) LIKE :manufacturer_name)"
            params["manufacturer"] = manufacturer
            params["manufacturer_name"] = f"%{manufacturer.upper()}%"

        sql += " ORDER BY A.EQPNAM ASC"
        return self.database.fetch_all(sql, params)

    def get_cal_history(self, isid: str):
        return self.database.fetch_all(
            """
            SELECT
                TRIM(A.CIDU) as CIDU,
                TRIM(A.KOLAS_NO) as KOLAS_NO,
                TRIM(A.CASD) as CASD,
                TRIM(A.CARD) as CARD,
                '[' || TRIM(B.EMID) || '] ' || TRIM(B.EMNM) AS ENGINEER,
                TRIM(C.CONM) AS SALE_COMPANY,
                TRIM(D.CONM) AS SUBCON,
                TRIM(A.CALNO_EXT) as CALNO_EXT,
                TRIM(A.CANCEL_RSN) as CANCEL_RSN,
                CASE
                    WHEN E.EMID IS NOT NULL THEN '[' || TRIM(E.EMID) || '] ' || TRIM(E.EMNM)
                END AS CANCEL_PERSON
            FROM EASYCAL.TBCALMAN A
            LEFT JOIN EASYCAL.TBEMPMAN B ON A.EMID = B.EMID
            LEFT JOIN EASYCAL.TBSUPMAN C ON A.SALE_CCOM = C.COID
            LEFT JOIN EASYCAL.TBSUPMAN D ON A.EXTN = D.COID
            LEFT JOIN EASYCAL.TBEMPMAN E ON A.PREN = E.EMID
            WHERE TRIM(A.ISID) = :isid
            ORDER BY A.CIDU DESC
            """,
            {"isid": isid.strip()},
        )


def _extract_code(value: str) -> str:
    text = str(value or "").strip()
    if text.startswith("[") and "]" in text:
        return text[1 : text.index("]")].strip()
    return text


def _to_mmddyyyy(value: str) -> str:
    parts = value.split("-")
    if len(parts) == 3:
        return f"{parts[1]}{parts[2]}{parts[0]}"
    return value
