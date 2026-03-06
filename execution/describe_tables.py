import oracledb
import os
from dotenv import load_dotenv

load_dotenv()

def describe_tables():
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
            target_tables = ['TBUSRMAN', 'TBCALMAN', 'TBCALRPT']
            
            for table in target_tables:
                print(f"\n--- Schema for {table} ---")
                cursor.execute(f"SELECT column_name, data_type, data_length, nullable FROM user_tab_columns WHERE table_name = '{table}' ORDER BY column_id")
                columns = cursor.fetchall()
                for col in columns:
                    print(f"{col[0]:<20} {col[1]:<15} ({col[2]}) {'NULL' if col[3]=='Y' else 'NOT NULL'}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    describe_tables()
