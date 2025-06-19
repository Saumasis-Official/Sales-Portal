/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS public.sales_allocation ADD IF NOT EXISTS contribution numeric NULL;
        ALTER TABLE IF EXISTS public.sales_allocation ADD IF NOT EXISTS cumulative_sum numeric NULL;
        ALTER TABLE IF EXISTS public.sales_allocation ADD IF NOT EXISTS "class" varchar(1) NULL;
    `);
};

exports.down = pgm => {
    pgm.sql(`
        ALTER TABLE IF EXISTS public.sales_allocation DROP IF EXISTS contribution;
        ALTER TABLE IF EXISTS public.sales_allocation DROP IF EXISTS cumulative_sum;
        ALTER TABLE IF EXISTS public.sales_allocation DROP IF EXISTS "class" ;
    `);
};
