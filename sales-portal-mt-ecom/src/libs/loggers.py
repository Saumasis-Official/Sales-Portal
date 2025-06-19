import logging
from fastapi import HTTPException


def singleton(class_):
    instances = {}

    def getinstance(*args, **kwargs):
        if class_ not in instances:
            instances[class_] = class_(*args, **kwargs)
        return instances[class_]

    return getinstance



class Logger:
    """
    Singleton Model Logger Class
    Initialise Logger with type for specific function/layer
    Can change a logger stream to console log or file
    Initialise eg:
        logger = Logger("lambda_function")
    """

    # Protected class variables
    _logger = None
    _console_handler = None
    _default_format = "[%(levelname)s][%(name)s][%(funcName)s] :- %(message)s"
    _formatter = None

    def __init__(self, logger_name='unknown') -> None:
        """
        Initialise logger with function/layer name
        Set level and stream to console
        """
        self._logger = logging.getLogger(logger_name)
        self._logger.setLevel(logging.DEBUG)
        self._console_handler = logging.StreamHandler()
        self._formatter = logging.Formatter(self._default_format)
        self._console_handler.setFormatter(self._formatter)
        self._logger.addHandler(self._console_handler)

    def change_format(self, format: str) -> None:
        pass

    def get_logger(self) -> object:
        return self._logger

    def info(self, message: str, reference: str = "") -> None:
        self._logger.info(f"[{reference}] [{message}]")

    def external_api_logs(self, message: str, session: str) -> None:
        log_text = f"[{session}] [{message}]"
        self._logger.info(log_text)

    def error(self, message: str, reference: str) -> None:
        self._logger.error(f"[{reference}] [{message}]")

    def debug(self, message: str, reference: str = "") -> None:
        self._logger.debug(message)


def log_decorator(func):
    def wrapper(*args, **kwargs):
        # logger = Logger("MT_ECOM")

        print(f"Function ({func.__name__}) called")
        return func(*args, **kwargs)

    return wrapper
