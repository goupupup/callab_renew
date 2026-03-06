import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def verify_relationships():
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
            # 1. TBUSRMAN 샘플 데이터 확인 (비밀번호 형식 파악용)
            print("\n--- User Sample (TBUSRMAN) ---")
            cursor.execute("SELECT USID, US_NAME, CO_NAME, PASS FROM TBUSRMAN WHERE ROWNUM <= 3")
            for row in cursor.fetchall():
                # 보안을 위해 비밀번호는 앞부분만 출력하거나 길이를 확인
                pass_len = len(row[3]) if row[3] else 0
                print(f"ID: {row[0]}, Name: {row[1]}, Co: {row[2]}, PassLen: {pass_len}")

            # 2. TBCALRPT과 TBCALMAN 관계 확인
            # TBCALRPT의 ISID가 TBCALMAN의 PK 또는 FK인지 확인
            print("\n--- Report Sample (TBCALRPT) ---")
            cursor.execute("SELECT ISID, FNAM, CDAT FROM TBCALRPT WHERE ROWNUM <= 3")
            for row in cursor.fetchall():
                print(f"ISID: {row[0]}, File: {row[1]}, Date: {row[2]}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    verify_relationships()
