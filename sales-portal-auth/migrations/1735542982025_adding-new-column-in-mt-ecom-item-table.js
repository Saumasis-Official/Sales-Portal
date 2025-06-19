/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
  pgm.sql("ALTER TABLE public.mt_ecom_item_table ADD allocated_qty numeric NULL;");
};

exports.down = pgm => {
  pgm.sql("ALTER TABLE public.mt_ecom_item_table DROP COLUMN allocated_qty;");
};