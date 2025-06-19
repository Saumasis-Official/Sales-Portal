"""
Handy Database helper module with
lots of handy functions
"""
import os
import sys
import psycopg2

class DatabaseHelper:
    # Constants and other variables Declared here
    _pool = None
    _table_resource = None
    
    # connection variables
    _connection = None
    _cursor = None

    # PostgresDB related functions
    def _make_connection(self):
        """
        Description: Function to Make connection to PostgresDB Server
        Params: NONE
        Returns: NONE
        """
        try:

            if self._connection is None:
                self._connection = psycopg2.connect(
                    database=os.environ.get('PGSQL_DATABASE_NAME'),
                    user=os.environ.get('PGSQL_USERNAME'),
                    password=os.environ.get('PGSQL_PASSWORD'),
                    host=os.environ.get('PGSQL_HOST'),
                    port=os.environ.get('PGSQL_PORT')
                )
                self._cursor = self._connection.cursor()
                
                self._cursor.execute("SELECT version();")
                record = self._cursor.fetchone()
                print('Postgres connection successfull.')
                print("You are connected to - ", record, "\n")

        except:
            self._connection = None
            self._cursor = None
            print('DB Connection Error: {} {}'.format(
                sys.exc_info()[0], sys.exc_info()[1]))

    def get_connection(self, config=None):
        if self._connection is None:
            self._make_connection()

        return self._connection

    def get_cursor(self, config=None):
        if self._cursor is None:
            self._make_connection()

        return self._cursor

    def close_connections(self):
        try:
            if self._connection:
                self._cursor.close()
                self._connection.close()

        except Exception as e:
            print('DB Connection close Error: {} {}'.format(
                sys.exc_info()[0], sys.exc_info()[1]))
