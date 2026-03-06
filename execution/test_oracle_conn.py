import oracledb
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

def test_connection():
    user = os.getenv("ORACLE_USER")
    password = os.getenv("ORACLE_PASS")
    dsn = os.getenv("ORACLE_CONN_STR")

    print(f"DEBUG: ORACLE_USER is '{user}'")
    print(f"DEBUG: ORACLE_PASS is '{'SET' if password else 'NOT SET'}'")
    print(f"DEBUG: ORACLE_CONN_STR is '{dsn}'")

    print(f"Connecting to {dsn} as {user}...")

    try:
        # DB 버전에 따라 Thin 모드가 지원되지 않을 경우 (DPY-3010),
        # Thick 모드 사용을 시도합니다. (Oracle Instant Client가 설치되어 있어야 함)
        try:
            connection = oracledb.connect(
                user=user,
                password=password,
                dsn=dsn
            )
        except oracledb.Error as e:
            if "DPY-3010" in str(e):
                print("Thin mode not supported (DPY-3010). Attempting Thick mode...")
                # Thick 모드에서는 종종 'user/pass@host:port/service_name' 형식을 선호할 수 있습니다.
                # 또는 Easy Connect 형식을 명확히 전달합니다.
                oracledb.init_oracle_client(lib_dir=r"C:\instantclient_19_20")
                # Thick 모드에서 ORA-12154 해결을 위해 Full TNS Descriptor를 생성합니다.
                host = "172.20.25.2"
                port = 1521
                sid = "XE"
                tns_dsn = f"""
                    (DESCRIPTION =
                        (ADDRESS = (PROTOCOL = TCP)(HOST = {host})(PORT = {port}))
                        (CONNECT_DATA =
                            (SID = {sid})
                        )
                    )
                """
                connection = oracledb.connect(
                    user=user,
                    password=password,
                    dsn=tns_dsn
                )
            else:
                raise
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT 'Connection Successful!' FROM DUAL")
            result = cursor.fetchone()
            print(f"SUCCESS: {result[0]}")
            
            cursor.execute("SELECT banner FROM v$version")
            version = cursor.fetchone()
            print(f"Oracle Version: {version[0]}")

    except Exception as e:
        print(f"FAILURE: Could not connect to Oracle XE.")
        print(f"Error details: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    test_connection()
