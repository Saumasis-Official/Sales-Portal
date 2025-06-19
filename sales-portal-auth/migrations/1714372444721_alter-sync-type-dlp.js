/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'DLP_SYNC';
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'ARS_ORDER_REPORT';
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'MTECOM_ORDER_REPORT';
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'ROR_SYNC';
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'RO_EXPIRY_CHECK';
        ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'ARS_STOCK_HOLDING_NOTIFICATION';

        ALTER TABLE IF EXISTS sync_logs 
        ADD COLUMN IF NOT EXISTS is_cron_job boolean NOT NULL DEFAULT false;`
    )
};
exports.down = pgm => {
    pgm.sql(`ALTER TABLE IF EXISTS sync_logs DROP COLUMN IF EXISTS is_cron_job;`)
};
