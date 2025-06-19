/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE IF EXISTS sales_hierarchy_details ADD COLUMN IF NOT EXISTS status entity_status NOT NULL DEFAULT 'ACTIVE';
    `);
};

exports.down = (pgm) => {
  pgm.sql(`
    ALTER TABLE IF EXISTS sales_hierarchy_details DROP COLUMN IF EXISTS status;
    `);
};
