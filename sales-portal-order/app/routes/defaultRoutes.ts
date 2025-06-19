import express from "express";
const router = express.Router();
import path from 'path';
import { Router } from "express";
import multer from 'multer';
import utilController from "../controller/utilController";
import ResponseTemplate from "../global/templates/response";
import { ErrorMessage } from "../constants/errorMessage";
import expressJoiValidator from "express-joi-validator";
import expressJoi from "../lib/requestValidator";
import Helper from "../helper";

import { PoolClient } from "pg";
import PostgresqlConnection from "../lib/postgresqlConnection";
const conn = new PostgresqlConnection();

let migrationStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    cb(null, `${file.originalname}`);
  }
})

let upload = multer({
  storage: migrationStorage,
  fileFilter: function (_req, file, cb) {
    checkFileType(file, cb);
  },
  onError: function (err, next) {
    next(err);
  }
}).single('dataset');

function uploadFile(req, res, next) {
  upload(req, res, function (err) {
    if (err) res.status(500).json({
      message: err,
      success: false
    });
    else next()
  })
}

function checkFileType(file, cb) {
  // Allowed ext
  // const filetypes = /xls|xlsx|csv/g;
  // Check ext
  const extname = path.extname(file.originalname).toLowerCase().replace('.', '');
  // Check mime
  // const mimetype = filetypes.test(file.mimetype);
  if (extname === 'xls' || extname === 'xlsx' || extname === 'csv') {
    return cb(null, true);
  } else {
    cb('Only xls, xlsx and csv files are allowed');
  }
}

export class DefaultRouter {
  router: Router;

  /**
   * Initialize the Router
   */
  constructor() {
    this.router = Router();
  }

  public async rootPage(req: express.Request, res: express.Response) {
    let clientRead: PoolClient | null = null;
    let clientWrite: PoolClient | null = null;
    try {
      clientRead = await conn.getReadClient();
      clientWrite = await conn.getWriteClient();
      const readResult = await clientRead.query(`SELECT version()`);
      const writeResult = await clientWrite.query(`SELECT version()`);
      if (readResult?.rows?.length && writeResult?.rows?.length) { 
        const serverTime = await clientRead.query(`
         SELECT 
          NOW()::DATE::TEXT AS current_date, 
          NOW()::TIME::TEXT AS current_time, 
          EXTRACT(TIMEZONE FROM NOW()) AS timezone_offset_seconds,
          NOW() AS time_stamp;
        `);
        const date_time = {
          server_time: {
            current_date: serverTime.rows[0].current_date,
            current_time: serverTime.rows[0].current_time,
            timezone_offset_seconds: serverTime.rows[0].timezone_offset_seconds,
            time_stamp: serverTime.rows[0].time_stamp,
          },
          service_time: {
            current_date: Helper.formatDate(new Date()),
            current_time: Helper.formatTime(new Date()),
          }
        };
        res.status(200).json({ success: true,date_time, message: `Order is up and running with PostgresSql(VERSION: ${readResult?.rows[0]?.version}) + node(VERSION: ${process.version}) .. ⚡️⚡️⚡️⚡️⚡️⚡️⚡️` });
      }
      else
        res.status(500).json({ success: false, message: 'Order service Postgres connection could not be established...🚨🚨🚨🚨🚨🚨🚨' });
    } catch (error) {
      res.status(500).json({ success: false, error: error, message: 'Order service is down...💀💀💀💀💀💀💀' });
    } finally {
      clientRead?.release();
      clientWrite?.release();
    }
  };

  public async uploadData(req, res) {
    const { type } = req.body;
    let response = null;
    switch (type) {
      case 'distributors':
        response = await utilController.migrateDistributors(req.file.filename);
        break;
      case 'warehouse-details':
        response = await utilController.migrateWarehouseDetails(req.file.filename);
        break;
      case 'sales-hierarchy':
        response = await utilController.migrateSalesHierarchy(req.file.filename);
        break;
      case 'materials':
        response = await utilController.migrateMaterials(req.file.filename);
        break;
      case 'new-materials':
        response = await utilController.migrateMaterialsFromNewExcel(req.file.filename);
        break;
      default:
    }

    res.status(200).json(response);
  }

  public async updateMaterialTags(req, res) {
    try {
      if (!req.file) return res.status(200).json({ success: false, message: 'Please upload a file to update tags' });
      let response = await utilController.updateMaterialTags(req.file.path);
      res.status(200).json(response);
    } catch (error) {
      res.status(500).json(ResponseTemplate.error(500, ErrorMessage.UPDATE_MATERIAL_TAGS_ERROR));
    }
  }

  public async updateSalesHierarchyDetails(req, res) {
    if (!req.file) return res.status(500).json({ success: false, message: 'Please upload a file to update tags' });
    let response = await utilController.updateSalesHierarchyDetails(req.file.filename);
    res.status(response.success ? 200 : 500).json(response);
  }

  init() {
    this.router.get("/hc-index", this.rootPage);
    this.router.post("/util/update-material-tags", uploadFile, this.updateMaterialTags);
    this.router.post("/util/sales-hierarchy-details", upload, this.updateSalesHierarchyDetails);
    this.router.post('/test-rushOrderResponseStatus', utilController.rushOrderResponseStatus);
    this.router.post('/get-rdd-auto-closure',expressJoiValidator(expressJoi.rddAutoClosure), utilController.getRDDForAutoClosure)
  }
}


// Create the Router, and export its configured Express.Router
const defaultRouter = new DefaultRouter();
defaultRouter.init();

export default defaultRouter.router;
