import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def final_schema_verification():
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
            # 1. TBCALMAN의 Serial Number 컬럼명 재확인 (S_NO vs SNO)
            print("\n--- Testing TBCALMAN Query with corrected S_NO ---")
            query = """
                SELECT 
                    M.ISID, M.MAKER, M.MODEL, M.S_NO, R.FNAM, R.CDAT 
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

            # 2. TBUSRMAN의 CUST 컬럼과 TBCALMAN의 CUST 컬럼 일치 확인
            print("\n--- Verifying Customer Code Join (TBUSRMAN & TBCALMAN) ---")
            query = """
                SELECT 
                    U.USNM, U.CUST, M.ISID, M.MAKER 
                FROM 
                    TBUSRMAN U
                JOIN 
                    TBCALMAN M ON U.CUST = M.CUST
                WHERE 
                    ROWNUM <= 5
            """
            cursor.execute(query)
            for row in cursor.fetchall():
                print(f"User: {row[0]}, Cust: {row[1]}, Equipment ISID: {row[2]}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    final_schema_verification()
