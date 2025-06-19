"""
Handy Database helper module with
lots of handy functions
"""
import os
import sys
import psycopg2
from src.config.configurations import DATABASE  

def singleton(class_):
    instances = {}

    def getinstance(*args, **kwargs):
        if class_ not in instances:
            instances[class_] = class_(*args, **kwargs)
        return instances[class_]

    return getinstance

@singleton
class DatabaseHelper:
    # Constants and other variables Declared here
    _pool = None
    _table_resource = None
    
    # connection variables
    _read_connection = None
    _write_connection = None
    _cursor = None

    def __init__(self) -> None:
        self._make_read_connection()
        self.get_write_connection()
        

    # PostgresDB related functions
    def _make_read_connection(self):
        """
        Description: Function to Make connection to PostgresDB Server
        Params: NONE
        Returns: NONE
        """
        try:

            if self._read_connection is None:
                self._read_connection = psycopg2.connect(
                    database= DATABASE.get('PGSQL_DATABASE_NAME'), 
                    user = DATABASE.get('PGSQL_USERNAME'),
                    host = DATABASE.get('PGSQL_READ_HOST'),
                    port = DATABASE.get('PGSQL_PORT'),
                    password = DATABASE.get('PGSQL_PASSWORD'),
                )
                self._cursor = self._read_connection.cursor()
                self._cursor.execute("SELECT version();")
                record = self._cursor.fetchone()
                print('Postgres connection successfully to Read Node.')
                print("You are connected to - ", record, "\n")

        except:
            self._read_connection = None
            self._cursor = None
            print('Read DB Connection Error: {} {}'.format(
                sys.exc_info()[0], sys.exc_info()[1]))
    def _make_write_connection(self):
        """
        Description: Function to Make connection to PostgresDB Server
        Params: NONE
        Returns: NONE
        """
        try:

            if self._write_connection is None:
                self._write_connection = psycopg2.connect(
                    database= DATABASE.get('PGSQL_DATABASE_NAME'), 
                    user = DATABASE.get('PGSQL_USERNAME'),
                    host = DATABASE.get('PGSQL_WRITE_HOST'),
                    port = DATABASE.get('PGSQL_PORT'),
                    password = DATABASE.get('PGSQL_PASSWORD'),
                )
                self._cursor = self._write_connection.cursor()
                self._cursor.execute("SELECT version();")
                record = self._cursor.fetchone()
                print('Postgres connection successfully to Write Node.')
                print("You are connected to - ", record, "\n")
        
        except:
            self._write_connection = None
            self._cursor = None
            print('Write DB Connection Error: {} {}'.format(
                sys.exc_info()[0], sys.exc_info()[1]))

    def get_write_connection(self):
        if self._write_connection is None:
            self._make_write_connection()

        return self._write_connection
    def get_read_connection(self):
        if self._read_connection is None:
            self._make_read_connection()

        return self._read_connection
    def is_connected(self):
        try:
            self._cursor = self._write_connection.cursor()
            self._cursor.execute("SELECT version();")
            write_node = self._cursor.fetchone()
            self._cursor = self._read_connection.cursor()
            self._cursor.execute("SELECT version();")
            read_node = self._cursor.fetchone()
            return len(write_node)>0 and len(read_node)>0
        except Exception as e:
            print('DB Connection Error: {} {}'.format(
                sys.exc_info()[0], sys.exc_info()[1]))
            return False

    def close_connections(self):
        try:
            if self._read_connection:
                self._read_connection.close()

            if self._write_connection:
                self._write_connection.close()

        except Exception as e:
            print('DB Connection close Error: {} {}'.format(
                sys.exc_info()[0], sys.exc_info()[1]))
