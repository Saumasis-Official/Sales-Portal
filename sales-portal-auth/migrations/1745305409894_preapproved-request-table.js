/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        DO $$
        BEGIN
        CREATE TABLE IF NOT EXISTS public.preapproved_pdp_unlock_request (
            request_id varchar NOT NULL,
            start_date timestamptz NOT NULL,
            end_date timestamptz NOT NULL,
            "comments" text,
            filters jsonb NOT NULL,
            requested_on timestamptz NOT NULL DEFAULT now(),
            requested_by varchar NOT NULL,
            CONSTRAINT preapproved_pdp_unlock_request_pkey PRIMARY KEY (request_id)
        );

        CREATE TABLE IF NOT EXISTS public.preapproved_pdp_unlock_mapping(
            id bigserial NOT NULL,
            request_id varchar NOT NULL,
            distributor_id varchar NOT NULL,
            CONSTRAINT preapproved_pdp_unlock_mapping_pkey PRIMARY KEY (id),
            CONSTRAINT preapproved_request_id_fk FOREIGN KEY (request_id) REFERENCES public.preapproved_pdp_unlock_request(request_id) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT preapproved_distributor_id_fk FOREIGN KEY (distributor_id) REFERENCES public.distributor_master(id) ON DELETE RESTRICT ON UPDATE CASCADE
        );

        END
        $$;
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DO $$
        BEGIN
            DROP TABLE IF EXISTS public.preapproved_pdp_unlock_mapping;
            DROP TABLE IF EXISTS public.preapproved_pdp_unlock_request;
        END
        $$;
    `);
};
