import express from 'express';
import adminRoutes from './routes/adminRoutes';
import defaultRoutes from './routes/defaultRoutes';
import arsRoutes from './routes/arsRoutes';
import archiveRoutes from './routes/archive.routes';
const expressRouter = express.Router();

expressRouter.use('/', arsRoutes)
expressRouter.use('/',defaultRoutes)
expressRouter.use('/admin', adminRoutes)
expressRouter.use('/archive', archiveRoutes)

export default expressRouter; 