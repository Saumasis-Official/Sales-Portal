/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TEMP TABLE temp_sku_rule_configurations (
            id SERIAL PRIMARY KEY,
            area_code VARCHAR(255),
            sku_code VARCHAR(255),
            tse_code VARCHAR(255),
            inclusion_customer_groups jsonb,
            created_on TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            updated_on TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
            updated_by VARCHAR(255),
            deleted BOOLEAN DEFAULT FALSE
        );

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
                        'tse_code', new.tse_code, -- Corrected the missing quote
                        'inclusion_customer_groups', new.included_cg,
                        'created_on', new.created_on,
                        'updated_by', new.updated_by,
                        'updated_on', new.updated_on,
                        'deleted', new.deleted
                    ))
            )
            on conflict (table_name, reference_value) do update set
                column_values = audit_trail.column_values || excluded.column_values;
        return new;
        end;
        $$
        ;

        WITH tempTable AS (
            SELECT area_code, sku_code, UNNEST(inclusion_customer_groups) AS cg
            FROM sku_rule_configurations
        ),
        mytbl AS (
            SELECT
                src.area_code,
                src.sku_code,
                created_on,
                updated_by,
                deleted,
                tse_code,
                cg AS inclusion_customer_groups
            FROM
                sku_rule_configurations src
            CROSS JOIN (
                SELECT
                    DISTINCT 
                    area_code,
                    tse_code
                FROM
                    distributor_master dm
                ) AS dm_tse
            LEFT JOIN (
                SELECT
                    area_code,
                    sku_code,
                    jsonb_object_agg(cg, TRUE) AS cg
                FROM
                    tempTable
                GROUP BY
                    tempTable.area_code, tempTable.sku_code ) AS tt ON
                tt.area_code = src.area_code
                AND tt.sku_code = src.sku_code
            WHERE
                src.area_code = dm_tse.area_code
        )
        INSERT INTO temp_sku_rule_configurations (area_code, sku_code, tse_code, inclusion_customer_groups, created_on, updated_on, updated_by, deleted)
        SELECT area_code, sku_code, tse_code, COALESCE(inclusion_customer_groups,'{}'::jsonb), created_on, now(), 'PORTAl_MANAGED', deleted FROM mytbl;

        TRUNCATE TABLE sku_rule_configurations;

        ALTER TABLE IF EXISTS sku_rule_configurations DROP CONSTRAINT IF EXISTS sku_rule_configurations_un;
        ALTER TABLE IF EXISTS sku_rule_configurations DROP COLUMN inclusion_customer_groups;

        ALTER TABLE IF EXISTS sku_rule_configurations ADD COLUMN IF NOT EXISTS tse_code CHARACTER VARYING(15) NOT NULL;
        ALTER TABLE IF EXISTS sku_rule_configurations ADD COLUMN included_cg jsonb NOT NULL;
        ALTER TABLE IF EXISTS sku_rule_configurations ADD CONSTRAINT sku_rule_configurations_un UNIQUE (area_code, sku_code, tse_code);

        INSERT INTO sku_rule_configurations (area_code, sku_code, tse_code, included_cg, created_on, updated_on, updated_by, deleted)
        SELECT area_code, sku_code, tse_code, inclusion_customer_groups, created_on, now(), 'PORTAl_MANAGED', deleted FROM temp_sku_rule_configurations;
        DROP TABLE IF EXISTS temp_sku_rule_configurations`)
};

exports.down = pgm => { };
