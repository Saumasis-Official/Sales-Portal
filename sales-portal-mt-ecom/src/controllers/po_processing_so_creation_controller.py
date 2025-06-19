from src.services.po_processing_so_creation_service import PoProcessingSoCreationService

po_processing_so_creation_service = PoProcessingSoCreationService()
class PoProcessingSoCreationController:

    def po_processing_so_creation(self, data):
        print("inside_po_processing_so_creation",data)
        try:
            return po_processing_so_creation_service.po_processing_so_creation_service(data)
        except Exception as e:
            print("Exception in po_processing_so_creation_controller",e)
            raise e
