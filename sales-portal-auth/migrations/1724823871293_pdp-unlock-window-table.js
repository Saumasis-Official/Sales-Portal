/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        BEGIN;
            CREATE TABLE IF NOT EXISTS pdp_unlock_window (
                id serial4 NOT NULL,
                group5_id int4 NOT NULL,
                start_date int4 NOT NULL,
                end_date int4 NOT NULL,
                updated_on timestamptz DEFAULT now(),
                updated_by varchar NOT NULL,
                "comments" varchar(200) NULL,
                CONSTRAINT pdp_unlock_window_pk PRIMARY KEY (id),
                CONSTRAINT pdp_unlock_window_unique UNIQUE (group5_id),
                CONSTRAINT pdp_unlock_window_group5_master_fk FOREIGN KEY (group5_id) REFERENCES public.group5_master(id) 
                    ON DELETE CASCADE ON UPDATE CASCADE
            );
            INSERT INTO public.pdp_unlock_window(group5_id, start_date, end_date, updated_by)
            SELECT gm.id, 25 AS start_date, 1 AS end_date, 'SYSTEM_GENERATED' AS updated_by
            FROM group5_master gm;
        COMMIT;
   `)
};

exports.down = pgm => {
    pgm.sql(
        `DROP TABLE IF EXISTS pdp_unlock_window;`
    );
};
