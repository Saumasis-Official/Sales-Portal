import express from "express";
const router = express.Router();
import { Router } from "express";
import expressJoiValidator from "express-joi-validator";
import expressJoi from "../lib/requestValidator";
import commonHelper from "../helper";

import { PoolClient } from "pg";
import PostgresqlConnection from "../lib/postgresqlConnection";
import AdminController from "../controller/AdminController";
const conn = new PostgresqlConnection();

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
            current_date: commonHelper.formatDate(new Date()),
            current_time: commonHelper.formatTime(new Date()),
          }
        };
        res.status(200).json({ success: true, date_time, message: `Auth is up and running with PostgresSql( VERSION: ${readResult?.rows[0]?.version}) + node(VERSION: ${process.version}) .. ⚡️⚡️⚡️⚡️⚡️⚡️⚡️` });
      }
      else
        res.status(500).json({ success: false, message: 'Auth service Postgres connection could not be established...🚨🚨🚨🚨🚨🚨🚨' });
    } catch (error) {
      res.status(500).json({ success: false, error: error, message: 'Auth service is down...💀💀💀💀💀💀💀' });
    } finally {
      clientRead?.release();
      clientWrite?.release();
    }
  };

  init() {
    this.router.get("/", this.rootPage);
    this.router.get('/pdp-window/:regionId', expressJoiValidator(expressJoi.getPDPWindows), AdminController.getPDPWindows);

  }
}


// Create the Router, and export its configured Express.Router
const defaultRouter = new DefaultRouter();
defaultRouter.init();

export default defaultRouter.router;
