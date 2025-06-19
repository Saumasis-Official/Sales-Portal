

def singleton(class_):
    instances = {}

    def getinstance(*args, **kwargs):
        if class_ not in instances:
            instances[class_] = class_(*args, **kwargs)
        return instances[class_]
    return getinstance


@singleton
class GlobalsVars:
    CURRENT_CUSTOMER = None

    def set_current_customer(self, customer):
        GlobalsVars.CURRENT_CUSTOMER = customer
    
    def get_current_customer(self):
        return GlobalsVars.CURRENT_CUSTOMER