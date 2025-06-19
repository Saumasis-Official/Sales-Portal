/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.sql("ALTER TYPE sync_type ADD VALUE IF NOT EXISTS 'KAMS_CUSTOMER_CODE_SYNC';");
};

exports.down = pgm => {
  pgm.sql("DELETE FROM pg_enum WHERE enumlabel = 'KAMS_CUSTOMER_CODE_SYNC' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'sync_type');");
};