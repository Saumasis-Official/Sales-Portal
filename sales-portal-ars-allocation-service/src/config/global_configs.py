class GlobalConfigs:
    """
    Singleton class to manage global configurations.

    This class ensures that only one instance of the configuration is created and used
    throughout the application.
    """

    _instance = None
    _is_aos_submit_running = False

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(GlobalConfigs, cls).__new__(cls, *args, **kwargs)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "_initialized"):
            self._is_aos_submit_running = False
            self._initialized = True

    def reset(self):
        self._is_aos_submit_running = False

    def get_is_aos_submit_running(self):
        return self._is_aos_submit_running

    def set_is_aos_submit_running(self, is_aos_submit_running):
        self._is_aos_submit_running = is_aos_submit_running
