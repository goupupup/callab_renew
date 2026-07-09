class AccountRepository:
    def __init__(self, database):
        self.database = database

    def list_accounts(self):
        return self.database.fetch_all(
            """
            SELECT
                USERID,
                CORPID,
                USERNAME,
                CORPNAME,
                AUTHORITY,
                CORPTYPE,
                STATE,
                REGDATE
            FROM CUSTCAL.TWUSRMAN
            WHERE STATE = '1'
            ORDER BY REGDATE DESC NULLS LAST
            """,
            {},
        )

    def create_account(self, payload):
        return self.database.execute(
            """
            INSERT INTO CUSTCAL.TWUSRMAN (
                USERID, PASSWORD, USERNAME, CORPID, CORPNAME,
                AUTHORITY, CORPTYPE, STATE, REGDATE
            ) VALUES (
                :userId, :password, :userName, :corpId, :corpName,
                :authority, :corpType, '1', SYSDATE
            )
            """,
            {
                "userId": payload.get("userId", ""),
                "password": payload.get("password", ""),
                "userName": payload.get("userName", ""),
                "corpId": payload.get("corpId", ""),
                "corpName": payload.get("corpName", ""),
                "authority": payload.get("authority", ""),
                "corpType": payload.get("corpType", ""),
            },
        )

    def list_access_requests(self):
        return self.database.fetch_all(
            """
            SELECT
                USERID,
                USERNAME,
                CORPNAME,
                CORPADDRESS,
                TELNO,
                EMAIL,
                REGDATE,
                STATE
            FROM CUSTCAL.TWUSRMAN
            WHERE NVL(STATE, '0') <> '1'
            ORDER BY REGDATE DESC NULLS LAST
            """,
            {},
        )

    def search_customer_companies(self, q: str):
        return self.database.fetch_all(
            """
            SELECT *
            FROM (
                SELECT DISTINCT
                    TRIM(COID) as CORP_ID,
                    TRIM(CONM) as CORP_NAME
                FROM EASYCAL.TBSUPMAN
                WHERE COID IS NOT NULL
                  AND CONM IS NOT NULL
                  AND (
                    UPPER(TRIM(CONM)) LIKE '%' || UPPER(TRIM(:q)) || '%'
                    OR UPPER(TRIM(COID)) LIKE '%' || UPPER(TRIM(:q)) || '%'
                  )
                ORDER BY TRIM(CONM)
            )
            WHERE ROWNUM <= 20
            """,
            {"q": q.strip()},
        )

    def get_account_request(self, user_id: str):
        return self.database.fetch_one(
            """
            SELECT USERID, STATE
            FROM CUSTCAL.TWUSRMAN
            WHERE UPPER(TRIM(USERID)) = UPPER(TRIM(:user_id))
              AND NVL(STATE, '0') <> '1'
            """,
            {"user_id": user_id},
        )

    def create_access_request(self, payload):
        return self.database.execute(
            """
            INSERT INTO CUSTCAL.TWUSRMAN (
                USERID, PASSWORD, USERNAME, CORPNAME, CORPADDRESS,
                TELNO, EMAIL, AUTHORITY, CORPTYPE, STATE, MEMO, REGDATE
            ) VALUES (
                :userId, :password, :userName, :corpName, :corpAddress,
                :telNo, :email, 'U', 'C', '0', :memo, SYSDATE
            )
            """,
            {
                "userId": payload.get("userId", ""),
                "password": payload.get("password", ""),
                "userName": payload.get("userName", ""),
                "corpName": payload.get("corpName", ""),
                "corpAddress": payload.get("corpAddress", ""),
                "telNo": payload.get("telNo") or None,
                "email": payload.get("email", ""),
                "memo": "PUBLIC ACCESS REQUEST",
            },
        )

    def approve_access_request(self, payload):
        return self.database.execute(
            """
            UPDATE CUSTCAL.TWUSRMAN
            SET
                CORPID = :corpId,
                CORPNAME = :corpName,
                AUTHORITY = :authority,
                CORPTYPE = :corpType,
                STATE = '1'
            WHERE UPPER(TRIM(USERID)) = UPPER(TRIM(:userId))
              AND NVL(STATE, '0') <> '1'
            """,
            {
                "userId": payload.get("userId", ""),
                "corpId": payload.get("corpId", ""),
                "corpName": payload.get("corpName", ""),
                "authority": payload.get("authority", "U"),
                "corpType": payload.get("corpType", "C"),
            },
        )

    def reject_access_request(self, user_id: str):
        return self.database.execute(
            """
            DELETE FROM CUSTCAL.TWUSRMAN
            WHERE UPPER(TRIM(USERID)) = UPPER(TRIM(:user_id))
              AND NVL(STATE, '0') <> '1'
            """,
            {"user_id": user_id.strip()},
        )

    def get_account_by_user_id(self, user_id: str):
        return self.database.fetch_one(
            """
            SELECT
                USERID,
                USERNAME,
                CORPID,
                CORPNAME,
                PASSWORD,
                TELNO,
                EMAIL
            FROM CUSTCAL.TWUSRMAN
            WHERE UPPER(TRIM(USERID)) = UPPER(TRIM(:user_id))
              AND STATE = '1'
            """,
            {"user_id": user_id},
        )

    def update_my_account(self, user_id: str, payload):
        password = (payload.get("password") or "").strip()
        params = {
            "user_id": user_id,
            "tel_no": payload.get("telNo") or None,
            "email": payload.get("email") or None,
        }
        password_sql = ""
        if password:
            password_sql = ", PASSWORD = :password"
            params["password"] = password

        return self.database.execute(
            f"""
            UPDATE CUSTCAL.TWUSRMAN
            SET
                TELNO = :tel_no,
                EMAIL = :email
                {password_sql}
            WHERE UPPER(TRIM(USERID)) = UPPER(TRIM(:user_id))
              AND STATE = '1'
            """,
            params,
        )
