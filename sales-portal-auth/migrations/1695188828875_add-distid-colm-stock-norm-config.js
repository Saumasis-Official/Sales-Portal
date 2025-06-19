/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

    CREATE TABLE IF NOT EXISTS public.audit_trail
    (
        id bigserial NOT NULL,
        table_name character varying COLLATE pg_catalog."default" NOT NULL,
        reference_value character varying COLLATE pg_catalog."default" NOT NULL,
        column_values jsonb,
        CONSTRAINT audit_trail_pkey PRIMARY KEY (id),
        CONSTRAINT audit_trail_uk UNIQUE (table_name, reference_value)
    );
    

    insert into audit_trail ( table_name, reference_value, column_values)	
        select
        'stock_norm_config' as table_name,
        area_code as reference_value,
        jsonb_agg(
        json_build_object(
            'applicable_month', applicable_month,
            'area_code', area_code,
            'class_a_sn', class_a_sn,
            'class_a_ss_percent', class_a_ss_percent,
            'class_b_sn',class_b_sn,
            'class_b_ss_percent',class_b_ss_percent,
            'class_c_sn',class_c_sn,
            'class_c_ss_percent',class_c_ss_percent,
            'updated_by',updated_by,
            'updated_on',updated_on,
            'remarks',remarks
        )) as column_values
        from stock_norm_config
        group by area_code;

    truncate table stock_norm_config;

    ALTER TABLE stock_norm_config DROP CONSTRAINT IF EXISTS stock_norm_config_pk;
    ALTER TABLE stock_norm_config ADD COLUMN dist_id VARCHAR(255) NOT NULL;
    ALTER TABLE stock_norm_config ADD COLUMN id bigserial PRIMARY KEY;
    ALTER TABLE stock_norm_config ADD CONSTRAINT stock_norm_config_uk UNIQUE (dist_id, applicable_month);
    ALTER TABLE stock_norm_config DROP COLUMN area_code;
    `);
};

exports.down = pgm => {
    pgm.sql(`
    ALTER TABLE stock_norm_config DROP COLUMN dist_id;
    ALTER TABLE stock_norm_config DROP COLUMN id;
    ALTER TABLE stock_norm_config DROP CONSTRAINT IF EXISTS stock_norm_config_uk;
    ALTER TABLE stock_norm_config ADD COLUMN area_code VARCHAR(6) NOT NULL;
    ALTER TABLE stock_norm_config ADD CONSTRAINT stock_norm_config_pk UNIQUE (area_code, applicable_month);
    `);
};
