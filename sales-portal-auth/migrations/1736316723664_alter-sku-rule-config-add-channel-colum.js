/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

            DROP TRIGGER IF EXISTS sku_rule_config_audit_trail_trigger ON public.sku_rule_configurations;

            ALTER TABLE sku_rule_configurations ADD COLUMN IF NOT EXISTS channel VARCHAR(255) NULL;
            ALTER TABLE sku_rule_configurations RENAME COLUMN included_cg to included_cg_db;

            WITH srctbl AS (
                SELECT 
                    src.id,
                    COALESCE(dp.channel, 'GT') AS channel
                FROM 
                    sku_rule_configurations src
                LEFT JOIN (
                    SELECT
                        DISTINCT dm.tse_code AS tc, 
                        dm.area_code AS ac, 
                        CASE 
                            WHEN dp.distribution_channel = 10 OR dp.distribution_channel = 40 THEN 'GT'
                            ELSE 'NOURISHCO' 
                        END AS channel
                    FROM
                        distributor_plants dp
                    INNER JOIN distributor_master dm ON dm.id = dp.distributor_id 
                    WHERE dp.distribution_channel IN (10, 40, 90)
                ) dp ON dp.ac = src.area_code AND dp.tc = src.tse_code 
            )

            UPDATE sku_rule_configurations 
            SET channel = srctbl.channel
            FROM srctbl
            WHERE sku_rule_configurations.id = srctbl.id;

            DROP TABLE IF EXISTS sku_rule_config_dist_channels_mapping ;

            ALTER TABLE sku_rule_configurations  DROP CONSTRAINT sku_rule_configurations_un;
            
            ALTER TABLE sku_rule_configurations ADD CONSTRAINT sku_rule_configurations_un UNIQUE (area_code,sku_code,tse_code,channel);
        
            CREATE OR REPLACE FUNCTION public.sku_rule_config_audit_trail_trigger_function()
                RETURNS trigger
                LANGUAGE plpgsql
                AS $$
                begin
                    insert into audit_trail (table_name, reference_value, column_values)
                    values ( 
                    'sku_rule_configurations',
                    new.id,
                    jsonb_build_array(jsonb_build_object(
                                'area_code', new.area_code,
                                'sku_code', new.sku_code,
                                'tse_code', new.tse_code,
                                'inclusion_customer_groups', new.included_cg_db,
                                'created_on', new.created_on,
                                'updated_by', new.updated_by,
                                'updated_on', new.updated_on,
                                'deleted', new.deleted,
                                'channel', new.channel
                            ))
                    )
                    on conflict (table_name, reference_value) do update set
                        column_values = audit_trail.column_values || excluded.column_values;
                return new;
            end; $$  
            ;
            create trigger sku_rule_config_audit_trail_trigger 
            after insert or update
            on public.sku_rule_configurations 
            for each row execute function sku_rule_config_audit_trail_trigger_function();
    `)
};

exports.down = pgm => {};
