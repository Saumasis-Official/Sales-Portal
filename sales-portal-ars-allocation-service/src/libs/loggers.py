import logging


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
    _default_format = "[%(levelname)s][%(name)s][%(callerFunc)s] :- %(message)s"
    _formatter = None

    def __init__(self, logger_name="unknown") -> None:
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
        # self._formatter = logging.Formatter(format)
        # self._console_handler.setFormatter(self._formatter)

    def get_logger(self) -> object:
        return self._logger

    def _log_with_caller(
        self, level, message: str, reference: str = "", show_stack_trace=False
    ) -> None:
        caller = self._logger.findCaller(False, 3)
        func_name = caller[2] if caller else "unknown"
        log_message = f"[{message}] [{reference}]"
        self._logger.log(
            level,
            log_message,
            stack_info=show_stack_trace,
            extra={"callerFunc": func_name},
        )

    def external_api_logs(self, message: str, session: str) -> None:
        self._log_with_caller(logging.INFO, message, session)

    def debug(self, message: str, reference: str = "") -> None:
        self._log_with_caller(logging.DEBUG, message, reference)

    def info(self, message: str, reference: str = "") -> None:
        self._log_with_caller(logging.INFO, message, reference)

    def warning(self, message: str, reference: str = "") -> None:
        self._log_with_caller(logging.WARNING, message, reference)

    def error(self, message: str, reference: str) -> None:
        self._log_with_caller(logging.ERROR, message, reference)

    def critical(self, message: str, reference: str = "") -> None:
        self._log_with_caller(logging.CRITICAL, message, reference, True)

    def exception(self, message: str, reference: str = "") -> None:
        self._log_with_caller(logging.ERROR, message, reference)


def log_decorator(func):
    def wrapper(*args, **kwargs):
        if args and hasattr(args[0], "__class__"):
            class_name = args[0].__class__.__name__
            print_args = args[1:]  # Exclude 'self'
        else:
            class_name = "unknown"
            print_args = args
        print(
            f"inside {class_name} -> {func.__name__}: args={print_args}, kwargs={kwargs}"
        )
        return func(*args, **kwargs)

    return wrapper
