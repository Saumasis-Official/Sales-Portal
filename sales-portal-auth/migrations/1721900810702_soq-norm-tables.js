/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE if not exists public.ars_forecast_total (
            id bigserial NOT NULL,
            applicable_month varchar NOT NULL,
            psku varchar NOT NULL,
            forecast_buom numeric DEFAULT 0 NOT NULL,
            forecast_cs numeric DEFAULT 0 NOT NULL,
            CONSTRAINT ars_forecast_total_pk PRIMARY KEY (id),
            CONSTRAINT ars_forecast_total_unique UNIQUE (applicable_month, psku)
        );
        CREATE TABLE IF NOT EXISTS public.soq_norm (
            id bigserial NOT NULL,
            division numeric NOT NULL,
            range_min numeric DEFAULT 0 NOT NULL,
            range_max numeric DEFAULT '-999'::integer NOT NULL,
            quantity numeric DEFAULT 0 NOT NULL,
            updated_by varchar DEFAULT 'PORTAL_MANAGED'::character varying NOT NULL,
            updated_on timestamptz DEFAULT now() NOT NULL,
            deleted bool DEFAULT false NOT NULL,
            CONSTRAINT soq_norm_pk PRIMARY KEY (id),
            CONSTRAINT soq_norm_unique UNIQUE (division, range_min, range_max)
        );
        CREATE INDEX IF NOT EXISTS soq_norm_division_idx ON public.soq_norm USING btree (division);

         CREATE OR REPLACE FUNCTION public.soq_norm_trigger_function()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $$
        begin  
            insert into audit_trail (table_name, reference_value, column_values)
            values ( 
            'soq_norms',
            OLD.division,
            jsonb_build_array(jsonb_build_object(
                'division', OLD.division,
                'range_min', OLD.range_min,
                'range_max', OLD.range_max,
                'quantity', OLD.quantity,
                'updated_by', OLD.updated_by,
                'updated_on', OLD.updated_on,
                'deleted', OLD.deleted,
                'deleted_on', now()
                    ))
            )
            on conflict (table_name, reference_value) do update set
                column_values = audit_trail.column_values || excluded.column_values;
        return new;
        end;
        $$
        ;

        create TRIGGER soq_norm_audit_trail_trigger
        BEFORE delete
        on public.soq_norm 
        for each row execute function soq_norm_trigger_function();

        `);
};

exports.down = pgm => {
    pgm.down(`
        DROP TABLE public.ars_forecast_total;
        DROP TRIGGER soq_norm_audit_trail_trigger ON public.soq_norm;
        DROP FUNCTION public.soq_norm_trigger_function;
        DROP TABLE public.soq_norm;
        `);
};
