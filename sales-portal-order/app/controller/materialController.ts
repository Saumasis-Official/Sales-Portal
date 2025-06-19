import { Request, Response } from 'express';
import responseTemplate from '../helper/responseTemplate';
import logger from '../lib/logger';
import {OrderService} from '../service/order.service';

class materialController {
    public async getMaterials(req: Request, res: Response) {
        try {
            const distributorId = req.user.login_id;
            const queryParams = req.query;
            const {isNourishco} = req.query;
            const suggestedMaterials = await OrderService.getMaterialsList(distributorId, queryParams, isNourishco === 'true');
            res.status(200).json({ success: true, data: suggestedMaterials ?? [] });
        } catch (error) {
            logger.error(`error in getMaterials:`, error);
            res.status(500).json(responseTemplate.error(
                'Technical Error',
                'There may some error occurred while fetching material list',
                []
            ));
        }
    }

}

export default materialController;