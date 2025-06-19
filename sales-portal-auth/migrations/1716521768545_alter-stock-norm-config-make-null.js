/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_a_sn DROP NOT NULL;
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_a_sn DROP DEFAULT;
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_a_ss_percent DROP NOT NULL;
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_a_ss_percent DROP DEFAULT;
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_b_sn DROP NOT NULL;
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_b_sn DROP DEFAULT;
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_b_ss_percent DROP NOT NULL;
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_b_ss_percent DROP DEFAULT;
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_c_sn DROP NOT NULL;
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_c_sn DROP DEFAULT;
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_c_ss_percent DROP NOT NULL;
    ALTER TABLE IF EXISTS public.stock_norm_config ALTER COLUMN class_c_ss_percent DROP DEFAULT;  


    INSERT INTO public.audit_trail (table_name, reference_value, column_values)
    SELECT
        'stock_norm_configuration' AS table_name,
        'Entire dropped table' AS reference_value,
        jsonb_agg(
            jsonb_build_object(
                'id', snc.id,
                'area_code', snc.g5_id,
                'area_code',snc.area_code ,
                'division',snc.division,
                'cycle_stock',snc.cycle_stock,
                'safety_stock',snc.safety_stock,
                'updated_on',snc.updated_on,
                'updated_by',snc.updated_by,
                'remarks',snc.remarks,
                'is_deleted',snc.is_deleted 
            ) 
        ) AS column_values
    FROM stock_norm_configuration snc ;

    DROP TABLE IF EXISTS public.stock_norm_configuration;
    DROP TABLE IF EXISTS public.forecast_data;
    ALTER TABLE IF EXISTS public.monthly_sales DROP COLUMN IF EXISTS column1;
    ALTER TABLE IF EXISTS public.monthly_sales DROP COLUMN IF EXISTS yearmonth;
    ALTER TABLE IF EXISTS public.monthly_sales DROP COLUMN IF EXISTS customername;
    ALTER TABLE IF EXISTS public.monthly_sales DROP COLUMN IF EXISTS billingquantityinbaseunit;
    ALTER TABLE IF EXISTS public.monthly_sales DROP COLUMN IF EXISTS billingquantityinbaseunit_sum;


    `);
};

exports.down = pgm => {
    pgm.sql(`
        CREATE TABLE public.forecast_data (
            "key" bigserial NOT NULL,
            sold_to_party varchar NOT NULL,
            asm_code varchar(6) NOT NULL,
            year_month varchar(6) NOT NULL,
            parent_sku varchar NOT NULL,
            product_hierarchy varchar(18) NOT NULL,
            customer_name varchar NOT NULL,
            billing_quantity_in_base_unit numeric NOT NULL,
            billing_quantity_in_base_unit_sum numeric NOT NULL,
            percentage_sales numeric NOT NULL,
            total_months_avg numeric NOT NULL,
            qty numeric NOT NULL,
            by_allocation numeric NOT NULL,
            parent_desc varchar NOT NULL,
            brand_variant varchar NOT NULL,
            regional_brand varchar NOT NULL,
            grammage varchar NOT NULL,
            base_unit varchar NOT NULL,
            weight_unit varchar NOT NULL,
            alternative_unit varchar NOT NULL,
            quantity_numerator int4 NOT NULL,
            quantity_denominator int4 NOT NULL,
            created_on timestamptz NULL DEFAULT now(),
            CONSTRAINT forecast_data_pkey PRIMARY KEY (key)
        );

        CREATE TABLE public.stock_norm_configuration (
            id serial4 NOT NULL,
            g5_id int4 NOT NULL,
            area_code varchar(6) NOT NULL,
            division int4 NOT NULL,
            cycle_stock int4 NULL DEFAULT 4,
            safety_stock int4 NULL DEFAULT 2,
            updated_on timestamptz NULL DEFAULT now(),
            updated_by varchar NOT NULL DEFAULT 'PORTAL_MANAGED'::character varying,
            remarks varchar NULL,
            is_deleted bool NULL DEFAULT false,
            CONSTRAINT g5_area_ukey UNIQUE (g5_id, area_code, division),
            CONSTRAINT stock_norm_configuration_pkey PRIMARY KEY (id),
            CONSTRAINT g5_fkey FOREIGN KEY (g5_id) REFERENCES public.group5_master(id)
        );
    `);
};
