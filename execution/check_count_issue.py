import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def check_masman_cust_codes():
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
            print("\n--- TBMASMAN CUST Code Distribution ---")
            cursor.execute("SELECT CUST, COUNT(*) FROM TBMASMAN GROUP BY CUST ORDER BY COUNT(*) DESC")
            # Show top 10 cust codes
            rows = cursor.fetchmany(10)
            for row in rows:
                print(f"CUST: [{row[0]}], Count: {row[1]}")

            print("\n--- TWUSRMAN 'admin' Info ---")
            cursor.execute("SELECT USERID, CORPID, CORPNAME FROM CUSTCAL.TWUSRMAN WHERE USERID = 'admin'")
            admin = cursor.fetchone()
            if admin:
                print(f"ID: {admin[0]}, CORPID: [{admin[1]}], CORPNAME: {admin[2]}")
                
                # Check if this CORPID exists in TBMASMAN
                cursor.execute("SELECT COUNT(*) FROM TBMASMAN WHERE CUST = :cid", {"cid": admin[1]})
                count = cursor.fetchone()[0]
                print(f"Total equipment for CORPID [{admin[1]}] (as-is): {count}")
                
                # Check with trimmed CORPID
                trimmed_cid = admin[1].strip() if admin[1] else ""
                cursor.execute("SELECT COUNT(*) FROM TBMASMAN WHERE TRIM(CUST) = :cid", {"cid": trimmed_cid})
                count_trimmed = cursor.fetchone()[0]
                print(f"Total equipment for CORPID [{trimmed_cid}] (trimmed join): {count_trimmed}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    check_masman_cust_codes()
