import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def probe_masman_data():
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
            # TBMASMAN 샘플 데이터 확인하여 장비 정보 및 상태 관리 방식 파악
            print("\n--- Sample Data from TBMASMAN ---")
            # ISID, CUST, EMID 및 장비명/모델명으로 추정되는 컬럼을 더 찾아봅니다.
            # 아까 Key Columns 추출시 MAKER, MODEL 등이 안나왔으므로 조인이 필요할 수도 있습니다.
            cursor.execute("SELECT * FROM TBMASMAN WHERE ROWNUM <= 3")
            columns = [col[0] for col in cursor.description]
            rows = cursor.fetchall()
            for row in rows:
                print(dict(zip(columns, row)))

            # TBCALMAN과 TBMASMAN의 관계 확인 (ISID 등으로 조인 가능한지)
            print("\n--- Testing Join TBMASMAN & TBCALMAN ---")
            try:
                cursor.execute("""
                    SELECT M.ISID, M.CUST, C.MAKER, C.MODEL, C.S_NO 
                    FROM TBMASMAN M 
                    JOIN TBCALMAN C ON M.ISID = C.ISID 
                    WHERE ROWNUM <= 3
                """)
                for row in cursor.fetchall():
                    print(row)
            except Exception as e:
                print(f"Join error: {e}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    probe_masman_data()
