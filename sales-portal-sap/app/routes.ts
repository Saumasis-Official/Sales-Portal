/* eslint func-names: ["error", "never"] */
/* eslint prefer-destructuring: 0 */
import express from 'express';
const expressRouter = express.Router();
import sapRoutes from './routes/routes';
import defaultRoutes from './routes/defaultRoutes';
import adminRoutes from './routes/adminRoutes';
import authRoutes from './routes/authRoutes';

expressRouter.use('/', defaultRoutes);
expressRouter.use('/', sapRoutes);
expressRouter.use('/admin', adminRoutes);
expressRouter.use('/auth', authRoutes);

export default expressRouter;
 