"""
Handy Database helper module with
lots of handy functions
"""
import os
import sys
import psycopg2
from src.config.configurations import DATABASE
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, scoped_session

class DatabaseHelper:
    # Constants and other variables Declared here
    _pool = None
    _table_resource = None

    # connection variables
    _connection = None
    _cursor = None
    _engine = None
    _session_factory = None
    
    # Singleton instance
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(DatabaseHelper, cls).__new__(cls, *args, **kwargs)
        return cls._instance

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
                    database=DATABASE.get("PGSQL_DATABASE_NAME"),
                    user=DATABASE.get("PGSQL_USERNAME"),
                    password=DATABASE.get("PGSQL_PASSWORD"),
                    host=DATABASE.get("PGSQL_HOST"),
                    port=DATABASE.get("PGSQL_PORT")
                )
                self._cursor = self._connection.cursor()
                assert self._cursor

                self._cursor.execute("SELECT version();")
                record = self._cursor.fetchone()
                print('Postgres connection successful.')
                print("You are connected to - ", record, "\n")

        except Exception:
            self._connection = None
            self._cursor = None
            
            print('DB Connection Error: {} {}'.format(
                sys.exc_info()[0], sys.exc_info()[1]))



    def get_connection(self):
        if self._connection is None:
            self._make_connection()

        return self._connection

    def get_cursor(self):
        print("get_cursor")
        if self._cursor is None or self._cursor.closed:
            self._make_connection()

        return self._cursor

    def close_connections(self):
        try:
            print("closing connection")
            if self._connection:
                self._cursor.close()
                self._connection.close()

        except Exception as e:
            print('DB Connection close Error: {} {}'.format(
                sys.exc_info()[0], sys.exc_info()[1]))

    def _make_engine(self):
        if self._engine is None:
            self._engine = create_engine(
                'postgresql+psycopg2://{user}:{pw}@{host}:{port}/{database}'
                .format(user=DATABASE.get("PGSQL_USERNAME"),
                        pw=DATABASE.get('PGSQL_PASSWORD'),
                        host=DATABASE.get("PGSQL_HOST"),
                        port=DATABASE.get("PGSQL_PORT"),
                        database=DATABASE.get("PGSQL_DATABASE_NAME")),
                connect_args={'options': '-csearch_path={}'.format("public")})
            self._session_factory = scoped_session(sessionmaker(bind=self._engine))
            print("Engine created successfully")

    def get_engine(self):
        if self._engine is None:
            self._make_engine()

        return self._engine
    
    def get_session(self):
        if self._session_factory is None:
            self._make_engine()
        return self._session_factory

    def dispose_engine(self):
        if self._engine:
            self._engine.dispose()
