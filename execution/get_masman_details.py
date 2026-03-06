import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def get_masman_details():
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
            # TBMASMAN 테이블의 모든 컬럼과 샘플 데이터 1건 확인
            print("\n--- TBMASMAN Schema & Sample ---")
            cursor.execute("SELECT column_name FROM user_tab_columns WHERE table_name = 'TBMASMAN' ORDER BY column_id")
            cols = [col[0] for col in cursor.fetchall()]
            print(", ".join(cols))
            
            cursor.execute("SELECT * FROM TBMASMAN WHERE ROWNUM = 1")
            row = cursor.fetchone()
            if row:
                print(dict(zip(cols, row)))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    get_masman_details()
