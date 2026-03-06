import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def verify_report_access():
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
            # 특정 고객(CUST)의 성적서 목록 조회 시나리오 테스트
            # TBCALMAN(장비/의뢰 정보)과 TBCALRPT(성적서 파일 정보) 조인
            # TBCALMAN의 ISID와 TBCALRPT의 ISID가 연결되는지 확인
            print("\n--- Testing Report Lookup for a Sample Customer ---")
            query = """
                SELECT 
                    M.ISID, M.MAKER, M.MODEL, M.SNO, R.FNAM, R.CDAT 
                FROM 
                    TBCALMAN M
                JOIN 
                    TBCALRPT R ON M.ISID = R.ISID
                WHERE 
                    ROWNUM <= 5
            """
            cursor.execute(query)
            for row in cursor.fetchall():
                print(f"ISID: {row[0]}, Equipment: {row[1]} {row[2]} ({row[3]}), File: {row[4]}, Date: {row[5]}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    verify_report_access()
