import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def scout_supman_data():
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
            print("\n--- TBSUPMAN Sample Data ---")
            cursor.execute("SELECT * FROM TBSUPMAN WHERE ROWNUM <= 3")
            columns = [col[0] for col in cursor.description]
            for row in cursor.fetchall():
                print(dict(zip(columns, row)))

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    scout_supman_data()
