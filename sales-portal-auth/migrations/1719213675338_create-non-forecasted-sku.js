/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        create table if not exists non_forecasted_sku
        (
            id bigserial not null,
            area_code character varying(4) not null,
            psku character varying(18) not null,
            customer_group character varying(50) not null,
            included_db  character varying [],
            created_on timestamp with time zone NOT NULL DEFAULT NOW(),
            updated_on timestamp with time zone NOT NULL DEFAULT NOW(),
            updated_by character varying (20) not null default 'PORTAL_MANAGED',
            deleted boolean not null default false,
            constraint non_forecasted_psku_pkey PRIMARY KEY(id),
            constraint non_forecasted_uk UNIQUE (area_code,psku,customer_group),
            constraint non_forecasted_fk FOREIGN KEY (psku) references public.material_master (code) MATCH SIMPLE
            ON UPDATE CASCADE
            ON DELETE RESTRICT
        );
        CREATE OR REPLACE FUNCTION public.non_forecasted_sku_audit_trail_trigger_function()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        begin
            insert into audit_trail (table_name, reference_value, column_values) 
            values (
                'non_forecasted_sku',
                new.id,
                json_build_array(jsonb_build_object(
                    'deleted', new.deleted,
                    'psku', new.psku,
                    'customer_group', new.customer_group,
                    'included_db', new.included_db,
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

        create trigger non_forecasted_sku_audit_trail_trigger 
        after insert or update
        on public.non_forecasted_sku 
        for each row execute function non_forecasted_sku_audit_trail_trigger_function();
    `)
};

exports.down = pgm => {
    pgm.sql(`
    DROP FUNCTION IS EXISTS public.non_forecasted_sku_audit_trail_trigger_function();
    DROP TABLE IF EXISTS public.non_forecasted_sku;
    `);
};
