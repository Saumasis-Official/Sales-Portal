import { Request, Response } from 'express';
import responseTemplate from '../helper/responseTemplate';
import logger from '../lib/logger';
import { OrderService } from '../service/order.service';
import { ErrorMessage } from '../constants/errorMessage';
import { SuccessMessage } from '../constants/successMessage';

class wareHouseController {
    private extractSHY1Points(rows: any){
        try{
            let response: object = {};
            if(rows && rows.length > 0) {
                rows.map((row: any) => {
                    let tempArr = [];
                    let valAr = row.shy_points;
                    valAr.map((syRow: any) => {
                        tempArr.push({
                            partner_code: `${syRow.f1}`,
                            partner_name: `${syRow.f2}`,
                            sales_org: '1010', // As Agreed sales_org are hardcoded as 1010
                            dist_channel: '10', // As Agreed dist_chl and division are hardcoded as 10 
                            divison: '10' // As Agreed dist_chl and division are hardcoded as 10 
                        }) 
                    })
                    response[row.type.toLowerCase()] = tempArr;
                })
            }            
            return response;
        } catch (error) {
            return null;
        }
        
    }
    public async getWarehouseDetails(req: Request, res: Response) {
        logger.info(`inside wareHouseController -> getWarehouseDetails`);
        try {
            const login_id = req.params.login_id;
            
            const result = await OrderService.fetchWarehouseDetails(login_id);
            
            if(result) 
                res.status(200).json(responseTemplate.success(this.extractSHY1Points(result),SuccessMessage.FETCH_WAREHOUSE_DETAILS));
            else
                res.status(200).json(responseTemplate.errorMessage(ErrorMessage.FETCH_WAREHOUSE_DETAILS));
        } catch (error) {
            logger.error(`inside wareHouseController -> getWarehouseDetails, Error:`, error);
            res.status(500).json(responseTemplate.internalServerError());
        }
    }
}

export default wareHouseController;