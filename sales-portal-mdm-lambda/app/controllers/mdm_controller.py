# sys packages imports


# application packages imports
from lib.error_helper import ErrorHelper
from lib.Filters import Filters
from services import mdm_service
from lib.helper import HelperClass

helper = HelperClass()


class MdmController():
    _request = None

    def __init__(self, event) -> None:
        self._request = event

    def get_material_data(self):
        query_params = self._request.get('queryStringParameters', {})

        f = Filters()
        err = ErrorHelper()
        customer_name = query_params.get('customer_name', None)
        if not customer_name:
            err.add_error("Customer Name","Customer Name is not Valid")
            return err
        else:
            print("Else Condition - LINE28")
            f.set_customer_name(customer_name)
        # f.set_site_codes(query_params.get('site_codes', None))
        # f.set_vendor_codes(query_params.get('vendor_codes', None))
        # f.set_kams(body['kams']) if 'kams' in body else None
        # f.set_limit(body['limit']) if 'limit' in body else None
        # f.set_offset(body['offset']) if 'offset' in body else None
        # f.set_plant_codes(body['depot_codes']) if 'depot_codes' in body else None
        # f.set_psku(body['psku']) if 'psku' in body else None
        # f.set_sku(body['sku']) if 'sku' in body else None
        # f.set_regions(body['regions']) if 'regions' in body else None
        # f.set_article_ids(query_params.get('article_ids', None))

        response = mdm_service.mdm_data(f)
        return {'data': response, 'count': len(response) if response is not None else 0}

    def get_article_data(self):
        query_params = self._request.get('queryStringParameters', {})

        f = Filters()
        err = ErrorHelper()
        customer_name = query_params.get('customer_name',None)
        if not customer_name:
            return err.add_error("Customer Name","Customer Name is not Valid")
        else:
            print("Else Condition - LINE53")
            f.set_customer_name(customer_name)

        response = mdm_service.article_data(f)
        return {'data': response, 'count': len(response) if response is not None else 0}
