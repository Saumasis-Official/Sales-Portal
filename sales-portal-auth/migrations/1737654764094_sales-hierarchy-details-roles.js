/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        -- Step 1: Drop default value from roles column
        ALTER TABLE public.sales_hierarchy_details ALTER COLUMN roles DROP DEFAULT;

        -- Step 2: Alter the column type to roles_type[]
        ALTER TABLE public.sales_hierarchy_details
        ALTER COLUMN roles TYPE roles_type[] USING ARRAY[roles]::roles_type[];

        -- Step 3: Set the default value to ["TSE"]
        ALTER TABLE public.sales_hierarchy_details
        ALTER COLUMN roles SET DEFAULT ARRAY['TSE']::roles_type[];
    `);
};

exports.down = pgm => {};
