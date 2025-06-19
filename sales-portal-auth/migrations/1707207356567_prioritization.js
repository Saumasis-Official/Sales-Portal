/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS public.prioritization
    (
        id bigserial NOT NULL PRIMARY KEY,
        area_code character varying(4) NOT NULL,
        brand_variant text NOT NULL,
        priority integer NOT NULL,
        created_on timestamp with time zone NOT NULL DEFAULT NOW(),
        updated_on timestamp with time zone NOT NULL DEFAULT NOW(),
        updated_by character varying(20) NOT NULL DEFAULT 'PORTAL_MANAGED'::character varying,
        deleted boolean NOT NULL DEFAULT 'false',
        CONSTRAINT prioritization_un UNIQUE (area_code, brand_variant)
    );

    CREATE OR REPLACE FUNCTION public.prioritization_audit_trail_trigger_function()
    RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    begin  
        insert into audit_trail (table_name, reference_value, column_values)
        values ( 
        'prioritization',
        new.id,
        jsonb_build_array(jsonb_build_object(
                    'area_code', new.area_code,
                    'brand_variant', new.brand_variant,
                    'priority', new.priority,
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

    create trigger prioritization_audit_trail_trigger 
    after insert or update
    on public.prioritization 
    for each row execute function prioritization_audit_trail_trigger_function();

    `);
};

exports.down = pgm => {
    pgm.sql(`
    DROP TABLE IF EXISTS public.prioritization;
    DROP FUNCTION IF EXISTS public.prioritization_audit_trail_trigger_function();
    `);
};
