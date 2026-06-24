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
