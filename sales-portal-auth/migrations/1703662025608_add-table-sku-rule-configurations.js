/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.sku_rule_configurations
    (
        id bigserial NOT NULL,
        area_code character varying(4) NOT NULL,
        sku_code character varying(18) NOT NULL,
        inclusion_customer_groups character varying[] NOT NULL,
        created_on timestamp with time zone NOT NULL DEFAULT NOW(),
        updated_on timestamp with time zone NOT NULL DEFAULT NOW(),
        updated_by character varying(20) NOT NULL DEFAULT 'PORTAL_MANAGED'::character varying,
        deleted boolean NOT NULL DEFAULT 'false',
        CONSTRAINT sku_rule_configurations_pkey PRIMARY KEY (id),
        CONSTRAINT sku_rule_configurations_un UNIQUE (area_code, sku_code),
        CONSTRAINT sku_rule_configurations_fk FOREIGN KEY (sku_code)
            REFERENCES public.material_master (code) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE RESTRICT
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
                    'inclusion_customer_groups', new.inclusion_customer_groups,
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

    create trigger sku_rule_config_audit_trail_trigger 
    after insert or update
    on public.sku_rule_configurations 
    for each row execute function sku_rule_config_audit_trail_trigger_function();

    `);
};

exports.down = pgm => {
    pgm.sql(`
    DROP FUNCTION IS EXISTS public.sku_rule_config_audit_trail_trigger_function();
    DROP TABLE IF EXISTS public.sku_rule_configurations;
    `);
};
