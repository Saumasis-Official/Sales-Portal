/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    CREATE TYPE pdp_type AS ENUM (
        'WE',
        'FN'
    );
    CREATE TABLE public.pdp_windows (
        id bigserial NOT NULL,
        zone_id int8 NULL,
        pdp_type public.pdp_type NOT NULL,
        threshold_frequency numeric DEFAULT '-1'::integer NOT NULL,
        order_window_su varchar NOT NULL,
        order_placement_end_time_su varchar NOT NULL,
        order_window_mo varchar NOT NULL,
        order_placement_end_time_mo varchar NOT NULL,
        order_window_tu varchar NOT NULL,
        order_placement_end_time_tu varchar NOT NULL,
        order_window_we varchar NOT NULL,
        order_placement_end_time_we varchar NOT NULL,
        order_window_th varchar NOT NULL,
        order_placement_end_time_th varchar NOT NULL,
        order_window_fr varchar NOT NULL,
        order_placement_end_time_fr varchar NOT NULL,
        order_window_sa varchar NOT NULL,
        order_placement_end_time_sa varchar NOT NULL,
        created_by text DEFAULT 'PORTAL_MANAGED'::text NOT NULL,
        updated_by text DEFAULT 'PORTAL_MANAGED'::text NOT NULL,
        remarks text NULL,
        created_on timestamptz DEFAULT now() NOT NULL,
        updated_on timestamptz DEFAULT now() NULL,
        CONSTRAINT pdp_windows_pk PRIMARY KEY (id),
        CONSTRAINT pdp_windows_unique UNIQUE (zone_id, pdp_type, threshold_frequency),
        CONSTRAINT pdp_windows_group5_master_fk FOREIGN KEY (zone_id) REFERENCES public.group5_master(id) ON DELETE CASCADE ON UPDATE CASCADE
    );
    CREATE INDEX pdp_windows_zone_id_idx ON public.pdp_windows USING btree (zone_id, pdp_type);

    CREATE OR REPLACE
    FUNCTION public.pdp_windows_audit_trail_trigger_function()
        RETURNS TRIGGER
        LANGUAGE plpgsql
        AS $$
        BEGIN  
            INSERT INTO	audit_trail (table_name, reference_value, column_values)
            VALUES ( 
                    'pdp_windows',
                    new.id,
                    jsonb_build_array(jsonb_build_object(
                        'zone_id', new.zone_id,
                        'pdp_type', new.pdp_type,
                        'threshold_frequency', new.threshold_frequency,
                        'order_window_su', new.order_window_su,
                        'order_placement_end_time_su', new.order_placement_end_time_su,
                        'order_window_mo', new.order_window_mo,
                        'order_placement_end_time_mo', new.order_placement_end_time_mo,
                        'order_window_tu', new.order_window_tu,
                        'order_placement_end_time_tu', new.order_placement_end_time_tu,
                        'order_window_we', new.order_window_we,
                        'order_placement_end_time_we', new.order_placement_end_time_we,
                        'order_window_th', new.order_window_th,
                        'order_placement_end_time_th', new.order_placement_end_time_th,
                        'order_window_fr', new.order_window_fr,
                        'order_placement_end_time_fr', new.order_placement_end_time_fr,
                        'order_window_sa', new.order_window_sa,
                        'order_placement_end_time_sa', new.order_placement_end_time_sa,
                        'created_by', new.created_by,
                        'updated_by', new.updated_by,
                        'remarks', new.remarks,
                        'created_on', new.created_on,
                        'updated_on', new.updated_on
                    ))
                )
            ON CONFLICT (table_name, reference_value) DO
            UPDATE
            SET
                column_values = audit_trail.column_values || excluded.column_values;
            RETURN NEW;
        END;
        $$;

    CREATE TRIGGER pdp_windows_audit_trail_trigger 
        AFTER
    INSERT
        OR
    UPDATE
        ON
        public.pdp_windows
        FOR EACH ROW EXECUTE FUNCTION pdp_windows_audit_trail_trigger_function();

    INSERT INTO public.pdp_windows (zone_id,pdp_type,order_window_su,order_placement_end_time_su,order_window_mo,order_placement_end_time_mo,order_window_tu,order_placement_end_time_tu,order_window_we,order_placement_end_time_we,order_window_th,order_placement_end_time_th,order_window_fr,order_placement_end_time_fr,order_window_sa,order_placement_end_time_sa,threshold_frequency) VALUES
	 (NULL,'WE','43:59','-4:01','67:59','-4:01','67:59','-4:01','43:59','-4:01','43:59','-4:01','43:59','-4:01','43:59','-4:01',-1),
	 (NULL,'FN','43:59','-4:01','67:59','-4:01','67:59','-4:01','43:59','-4:01','43:59','-4:01','43:59','-4:01','43:59','-4:01',-1);

    DELETE FROM app_level_settings WHERE KEY IN (
        'PDP_FN_ORDER_PLACEMENT_END_TIME_FR',
        'PDP_FN_ORDER_PLACEMENT_END_TIME_MO',
        'PDP_FN_ORDER_PLACEMENT_END_TIME_SA',
        'PDP_FN_ORDER_PLACEMENT_END_TIME_SU',
        'PDP_FN_ORDER_PLACEMENT_END_TIME_TH',
        'PDP_FN_ORDER_PLACEMENT_END_TIME_TU',
        'PDP_FN_ORDER_PLACEMENT_END_TIME_WE',
        'PDP_FN_ORDER_WINDOW_FR',
        'PDP_FN_ORDER_WINDOW_MO',
        'PDP_FN_ORDER_WINDOW_SA',
        'PDP_FN_ORDER_WINDOW_SU',
        'PDP_FN_ORDER_WINDOW_TH',
        'PDP_FN_ORDER_WINDOW_TU',
        'PDP_FN_ORDER_WINDOW_WE',
        'PDP_FORTNIGHTLY_ORDER_WINDOW',
        'PDP_ORDER_PLACEMENT_TIME',
        'PDP_WE_ORDER_PLACEMENT_END_TIME_FR',
        'PDP_WE_ORDER_PLACEMENT_END_TIME_MO',
        'PDP_WE_ORDER_PLACEMENT_END_TIME_SA',
        'PDP_WE_ORDER_PLACEMENT_END_TIME_SU',
        'PDP_WE_ORDER_PLACEMENT_END_TIME_TH',
        'PDP_WE_ORDER_PLACEMENT_END_TIME_TU',
        'PDP_WE_ORDER_PLACEMENT_END_TIME_WE',
        'PDP_WE_ORDER_WINDOW_FR',
        'PDP_WE_ORDER_WINDOW_MO',
        'PDP_WE_ORDER_WINDOW_SA',
        'PDP_WE_ORDER_WINDOW_SU',
        'PDP_WE_ORDER_WINDOW_TH',
        'PDP_WE_ORDER_WINDOW_TU',
        'PDP_WE_ORDER_WINDOW_WE',
        'PDP_WEEKLY_OFF',
        'PDP_WEEKLY_ORDER_WINDOW'
    );

    `);

};

exports.down = pgm => {
    pgm.sql(`
    DROP TABLE public.pdp_windows;
    DROP TYPE pdp_type;
    `);
 };
