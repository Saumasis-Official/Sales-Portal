/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS public.distributor_psku_soq_norm (
            id bigserial NOT NULL,
            distributor_code varchar NOT NULL,
            material_code varchar NOT NULL,
            soq_norm numeric NOT NULL,
            deleted bool DEFAULT false NOT NULL,
            created_on timestamptz DEFAULT now() NOT NULL,
            updated_on timestamptz DEFAULT now() NOT NULL,
            updated_by varchar DEFAULT 'PORTAL_MANAGED'::character varying NOT NULL,
            CONSTRAINT distributor_psku_soq_norm_pk PRIMARY KEY (id),
            CONSTRAINT distributor_psku_soq_norm_unique UNIQUE (distributor_code, material_code),
            CONSTRAINT distributor_psku_soq_norm_distributor_master_fk FOREIGN KEY (distributor_code) REFERENCES public.distributor_master(id),
            CONSTRAINT distributor_psku_soq_norm_material_master_fk FOREIGN KEY (material_code) REFERENCES public.material_master(code)
        );
    `);

};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS public.distributor_psku_soq_norm;
    `);
};
