/* eslint func-names: ["error", "never"] */
/* eslint prefer-destructuring: 0 */
import express from 'express';
const expressRouter = express.Router();
import defaultRoutes from './routes/defaultRoutes';
import adminRoutes from './routes/adminRoutes';

expressRouter.use('/', defaultRoutes);
 expressRouter.use('/admin', adminRoutes);
export default expressRouter;
