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
