/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        INSERT INTO public.audit_trail (table_name, reference_value, column_values)
        SELECT
            'stock_norm_config' AS table_name,
            'Entire stock_norm_config table' AS reference_value,
            jsonb_agg(
            jsonb_build_object(
                'applicable_month', snc.applicable_month,
                'class_a_sn',snc.class_a_sn,
                'class_a_ss_percent',snc.class_a_ss_percent,
                'class_b_sn',snc.class_b_sn,
                'class_b_ss_percent',snc.class_b_ss_percent,
                'class_c_sn',snc.class_c_sn,
                'class_c_ss_percent',snc.class_c_ss_percent,
                'updated_by',snc.updated_by,
                'updated_on',snc.updated_on,
                'remarks', snc.remarks,
                'dist_id', snc.dist_id,
                'id',snc.id)
            ) AS column_values
        FROM stock_norm_config snc ;

        ALTER TABLE IF EXISTS public.stock_norm_config DROP COLUMN IF EXISTS class_a_sn;
        ALTER TABLE IF EXISTS public.stock_norm_config DROP COLUMN IF EXISTS class_a_ss_percent;
        ALTER TABLE IF EXISTS public.stock_norm_config DROP COLUMN IF EXISTS class_b_sn;
        ALTER TABLE IF EXISTS public.stock_norm_config DROP COLUMN IF EXISTS class_b_ss_percent;
        ALTER TABLE IF EXISTS public.stock_norm_config DROP COLUMN IF EXISTS class_c_sn;
        ALTER TABLE IF EXISTS public.stock_norm_config DROP COLUMN IF EXISTS class_c_ss_percent;

        ALTER TABLE IF EXISTS public.stock_norm_config ADD COLUMN stock_norm NUMERIC;
        ALTER TABLE IF EXISTS public.stock_norm_config ADD COLUMN ss_percent NUMERIC;
        ALTER TABLE IF EXISTS public.stock_norm_config ADD COLUMN psku TEXT;
        alter table if exists stock_norm_config add column if not exists class_of_last_update varchar(1);

        ALTER TABLE stock_norm_config DROP CONSTRAINT stock_norm_config_uk;
        ALTER TABLE stock_norm_config ADD CONSTRAINT stock_norm_config_uk UNIQUE (dist_id,applicable_month,psku);
    `)
};

exports.down = pgm => { };
