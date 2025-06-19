from src.services.xml_validation_service import XmlValidationService

xml_validation_service = XmlValidationService()
class XmlValidationController:

    def validate_xml(self,request):
        try:
            return xml_validation_service.validate_xml_services(request)
        except Exception as e:
            print(e)
            return False