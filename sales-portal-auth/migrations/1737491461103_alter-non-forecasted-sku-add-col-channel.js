/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        BEGIN;

            ALTER TABLE non_forecasted_sku ADD COLUMN channel character varying;
            ALTER TABLE non_forecasted_sku DROP CONSTRAINT non_forecasted_uk;
            ALTER TABLE non_forecasted_sku ADD CONSTRAINT non_forecasted_uk UNIQUE (area_code, psku, tse_code, channel);
            DROP TABLE IF EXISTS non_forecasted_sku_dist_channels_mapping;
            DROP TRIGGER IF EXISTS non_forecasted_sku_audit_trail_trigger ON public.non_forecasted_sku;

            CREATE TEMPORARY TABLE tt AS 
            SELECT 
                area_code, 
                psku, 
                created_on, 
                updated_on, 
                updated_by, 
                deleted, 
                tse_code, 
                included_cg_db, 
                COALESCE(msd2.channel, 'GT') AS channel
            FROM
                non_forecasted_sku nfs
            LEFT JOIN (
                SELECT
                    DISTINCT msd.material_code,
                    CASE
                        WHEN msd.distribution_channel = 10 OR msd.distribution_channel = 40 THEN 'GT'
                        WHEN msd.distribution_channel = 90 THEN 'NOURISHCO'
                        ELSE 'GT'
                    END AS channel
                FROM
                    material_sales_details msd
            ) AS msd2 ON msd2.material_code = nfs.psku;

            TRUNCATE TABLE non_forecasted_sku;

            INSERT INTO non_forecasted_sku (area_code, psku, created_on, updated_on, updated_by, deleted, tse_code, included_cg_db, channel)
            SELECT 
                area_code, 
                psku, 
                created_on, 
                updated_on, 
                updated_by, 
                deleted, 
                tse_code, 
                included_cg_db, 
                channel 
            FROM tt;

            DROP TABLE IF EXISTS tt;

            CREATE OR REPLACE FUNCTION public.non_forecasted_sku_audit_trail_trigger_function()
            RETURNS trigger
            LANGUAGE plpgsql
            AS $function$
            BEGIN
                INSERT INTO audit_trail (table_name, reference_value, column_values) 
                VALUES (
                    'non_forecasted_sku',
                    NEW.id,
                    json_build_array(jsonb_build_object(
                        'deleted', NEW.deleted,
                        'psku', NEW.psku,
                        'tse_code', NEW.tse_code,
                        'included_cg_db', NEW.included_cg_db,
                        'created_on', NEW.created_on,
                        'updated_on', NEW.updated_on,
                        'updated_by', NEW.updated_by,
                        'area_code', NEW.area_code,
                        'channel', NEW.channel
                    ))
                )
                ON CONFLICT (table_name, reference_value) DO UPDATE SET
                column_values = audit_trail.column_values || EXCLUDED.column_values;
                RETURN NEW;
            END;
            $function$;

            CREATE TRIGGER non_forecasted_sku_audit_trail_trigger
            AFTER INSERT OR UPDATE ON public.non_forecasted_sku
            FOR EACH ROW EXECUTE FUNCTION public.non_forecasted_sku_audit_trail_trigger_function();        

        COMMIT;
    `)
};

exports.down = pgm => {};
