import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def get_target_schemas():
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
            # 1. TBMASMAN (장비 관리)
            print("\n--- Key Columns for TBMASMAN ---")
            cursor.execute("SELECT column_name FROM user_tab_columns WHERE table_name = 'TBMASMAN'")
            for col in cursor.fetchall():
                if any(kw in col[0] for kw in ['ID', 'NAME', 'MODEL', 'MAKER', 'SNO', 'REG', 'CUST', 'DATE']):
                    print(col[0])

            # 2. TBSUPMAN (업체 정보)
            print("\n--- Key Columns for TBSUPMAN ---")
            cursor.execute("SELECT column_name FROM user_tab_columns WHERE table_name = 'TBSUPMAN'")
            for col in cursor.fetchall():
                if any(kw in col[0] for kw in ['CUST', 'NAME', 'CODE', 'ID']):
                    print(col[0])

            # 3. CUSTCAL.TWUSRMAN (유저 정보)
            # owner와 table_name을 사용하여 검색
            print("\n--- Columns for CUSTCAL.TWUSRMAN ---")
            try:
                cursor.execute("SELECT column_name, data_type, data_length FROM all_tab_columns WHERE owner = 'CUSTCAL' AND table_name = 'TWUSRMAN' ORDER BY column_id")
                cols = cursor.fetchall()
                if not cols:
                    # Current schema check
                    cursor.execute("SELECT column_name, data_type, data_length FROM user_tab_columns WHERE table_name = 'TWUSRMAN' ORDER BY column_id")
                    cols = cursor.fetchall()
                for col in cols:
                    print(f"{col[0]:20} {col[1]:10} ({col[2]})")
            except Exception as e:
                print(f"Error checking TWUSRMAN: {e}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    get_target_schemas()
