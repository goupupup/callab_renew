import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def check_masman_key_fields():
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
            for field in ['CUST', 'REGD', 'ISID', 'SERN', 'MODL']:
                cursor.execute(f"SELECT column_name, data_type, data_length FROM user_tab_columns WHERE table_name = 'TBMASMAN' AND column_name = '{field}'")
                print(f"TBMASMAN.{field}: {cursor.fetchone()}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    check_masman_key_fields()
