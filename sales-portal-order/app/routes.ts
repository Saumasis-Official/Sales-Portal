/* eslint func-names: ["error", "never"] */
/* eslint prefer-destructuring: 0 */
import express from 'express';
const expressRouter = express.Router();
import defaultRoutes from './routes/defaultRoutes';
import orderRoutes from './routes/orderRoutes';
import adminRoutes from './routes/adminRoutes';
import rushOrderRoutes from './routes/rushOrder.routes';

expressRouter.use('/', defaultRoutes);
expressRouter.use('/', orderRoutes);
expressRouter.use('/admin', adminRoutes);
expressRouter.use('/rush-order', rushOrderRoutes);
export default expressRouter;
 