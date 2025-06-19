/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
            BEGIN;
                CREATE TABLE public.material_tolerance_exclusions (
                    id bigserial NOT NULL,
                    psku varchar(18) NOT NULL,
                    updated_on timestamptz DEFAULT now(),
                    updated_by varchar(30) DEFAULT 'PORTAL_MANAGED' NOT NULL,
                    deleted boolean DEFAULT FALSE NOT NULL,
                    CONSTRAINT material_tolerance_exclusions_pk PRIMARY KEY (id),
                    CONSTRAINT material_tolerance_exclusions_uk UNIQUE (psku),
                    CONSTRAINT material_tolerance_exclusions_fk FOREIGN KEY (psku) REFERENCES public.material_master(code) ON DELETE CASCADE ON UPDATE CASCADE
                );

                WITH materials AS (SELECT DISTINCT 
                                        mm.code AS psku
                                    FROM material_master mm 
                                    INNER JOIN material_sales_details msd ON (msd.material_code = mm.code)
                                    WHERE mm.status = 'ACTIVE'
                                        AND mm.deleted = FALSE 
                                        AND msd.division = 14)
                INSERT INTO material_tolerance_exclusions (psku)
                SELECT psku
                FROM materials
                ON CONFLICT DO NOTHING;

            COMMIT;
        `);
};

exports.down = pgm => {
    pgm.sql(`
            DROP TABLE IF EXISTS public.material_tolerance_exclusions;
        `);
};
