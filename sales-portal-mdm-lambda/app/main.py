
from lib.helper import HelperClass
from lib.authorizer import Authorizer
from controllers.mdm_controller import MdmController

helper = HelperClass()
authorizer = Authorizer()

def init(event, context):
    print(event)

    #Authenticate api call
    try:
        assert authorizer.authenticate(event)
    except AssertionError:
        return helper.send_error_response("Request is not authorized, Token invalid", 'unauthorized')
    
    #Initialize the controller with event to inject the event for the whole controller instance
    mdmController = MdmController(event)
    response = None

    # Check request path and handle the controller
    request_path = event.get('path', None)

    if request_path not in get_route_mapping().keys():
        return helper.send_error_response("404 Not found", "not_found")
    
    for path, func in get_route_mapping().items():
        if path == request_path:
            response = eval(f'{func}()')

            if type(response).__name__ == 'ErrorHelper':
                return helper.send_error_response(response.get_errors())

    return helper.get_response_object(response)

def get_route_mapping()-> dict:
    return {
        '/mdm/v1/get-materials' : 'mdmController.get_material_data',
        '/mdm/v1/get-article-data' : 'mdmController.get_article_data'
    }