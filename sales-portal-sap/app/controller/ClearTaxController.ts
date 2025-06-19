import logger from '../lib/logger';
import Template from '../helper/responseTemplate';
import { ErrorMessage } from '../constant/error.message';
import { SuccessMessage } from '../constant/sucess.message';
import { ClearTaxService } from '../service/ClearTax.service';

class ClearTaxController {
    static async getGstPan(req: any, res: any) {
        try {
            logger.info(`Inside ClearTaxController -> Fetching getGstPan:`);
            let data: any;
            if (req.body.gstin) {
                data = await ClearTaxService.getGst(req.body);
            } else if (req.body.pan) {
                data = await ClearTaxService.getPan(req.body);
            }
            if (data) {
                // res.data = data;
                return res.status(200).json(Template.success(data, SuccessMessage.GST_PAN_SUCCESS))
            }
            else {
                return res.status(400).json(Template.errorMessage(ErrorMessage.GST_PAN_FAILURE));
            }
        }
        catch (err) {
            return res.status(400).json(Template.errorMessage(ErrorMessage.GST_PAN_ERROR));
        }
    }
}

export default ClearTaxController;