import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def scout_new_tables():
    user = os.getenv("ORACLE_USER")
    password = os.getenv("ORACLE_PASS")
    lib_dir = r"C:\instantclient_19_20"
    
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

    try:
        oracledb.init_oracle_client(lib_dir=lib_dir)
        connection = oracledb.connect(user=user, password=password, dsn=tns_dsn)
        
        with connection.cursor() as cursor:
            # 1. TBMASMAN, TBSUPMAN, TWUSRMAN 테이블 존재 확인 및 스키마 확인
            # CUSTCAL.TWUSRMAN은 스키마가 다를 수 있으므로 ALL_TABLES나 명시적 조회 필요
            tables_to_check = ['TBMASMAN', 'TBSUPMAN', 'TWUSRMAN']
            
            print("--- Table Check in current schema ---")
            for table in tables_to_check:
                cursor.execute(f"SELECT table_name FROM user_tables WHERE table_name = '{table}'")
                res = cursor.fetchone()
                print(f"Table {table}: {'Found' if res else 'NOT Found'}")

            # 2. CUSTCAL.TWUSRMAN 접근성 확인
            print("\n--- Checking CUSTCAL schema access ---")
            try:
                cursor.execute("SELECT table_name FROM all_tables WHERE owner = 'CUSTCAL' AND table_name = 'TWUSRMAN'")
                res = cursor.fetchone()
                print(f"CUSTCAL.TWUSRMAN: {'Accessible' if res else 'NOT Accessible'}")
            except Exception as e:
                print(f"Error checking CUSTCAL: {e}")

            # 3. 발견된 주요 테이블 스키마 상세 조회
            for table in tables_to_check:
                print(f"\n--- Schema for {table} ---")
                try:
                    cursor.execute(f"SELECT column_name, data_type FROM user_tab_columns WHERE table_name = '{table}' ORDER BY column_id")
                    for col in cursor.fetchall():
                        print(f"{col[0]:<20} {col[1]}")
                except Exception as e:
                    print(f"Could not describe {table}: {e}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    scout_new_tables()
