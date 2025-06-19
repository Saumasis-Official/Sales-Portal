/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        TRUNCATE TABLE non_forecasted_sku; 
        ALTER TABLE IF EXISTS non_forecasted_sku DROP CONSTRAINT IF EXISTS non_forecasted_uk;
        ALTER TABLE IF EXISTS non_forecasted_sku DROP COLUMN IF EXISTS customer_group;
        ALTER TABLE IF EXISTS non_forecasted_sku DROP COLUMN IF EXISTS included_db;

        ALTER TABLE IF EXISTS non_forecasted_sku ADD COLUMN IF NOT EXISTS tse_code character varying(15) NOT NULL;
        ALTER TABLE IF EXISTS non_forecasted_sku ADD COLUMN IF NOT EXISTS included_cg_db jsonb;
        ALTER TABLE IF EXISTS non_forecasted_sku ADD CONSTRAINT non_forecasted_uk UNIQUE (area_code,psku,tse_code);

        CREATE OR REPLACE FUNCTION public.non_forecasted_sku_audit_trail_trigger_function()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        BEGIN
            insert into audit_trail (table_name, reference_value, column_values) 
            values (
                'non_forecasted_sku',
                new.id,
                json_build_array(jsonb_build_object(
                    'deleted', new.deleted,
                    'psku', new.psku,
                    'tse_code', new.tse_code,
                    'included_cg_db', new.included_cg_db,
                    'created_on', new.created_on,
                    'updated_on', new.updated_on,
                    'updated_by', new.updated_by,
                    'area_code', new.area_code
                ))
            )
            on conflict (table_name, reference_value) do update set
            column_values = audit_trail.column_values || excluded.column_values;
        return new;
        end;
        $$ 
        ;

        DROP TRIGGER IF EXISTS non_forecasted_sku_audit_trail_trigger ON non_forecasted_sku;
        CREATE TRIGGER non_forecasted_sku_audit_trail_trigger AFTER INSERT OR UPDATE ON non_forecasted_sku
        FOR EACH ROW EXECUTE FUNCTION non_forecasted_sku_audit_trail_trigger_function();
    `)
};

exports.down = pgm => {
    pgm.sql(`
        DROP FUNCTION IF EXISTS non_forecasted_sku_audit_trail_trigger_function;
        DROP TRIGGER IF EXISTS non_forecasted_sku_audit_trail_trigger;
    `)
};
``