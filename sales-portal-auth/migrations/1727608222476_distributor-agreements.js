/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

    CREATE TYPE public.agreement_status_type AS ENUM (
        'AGREED',
        'DISAGREED'
      );
      
      CREATE TABLE public.distributor_agreements (
          id serial4 NOT NULL,
          distributor_id varchar NOT NULL,
          agreement_status public.agreement_status_type NOT NULL,
          created_at timestamptz NOT NULL DEFAULT now(),
          CONSTRAINT distributor_agreements_distributor_id_key UNIQUE (distributor_id),
          CONSTRAINT distributor_agreements_pkey PRIMARY KEY (id),
          CONSTRAINT distributor_agreements_distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES public.distributor_master(id)
      );
`);
};

exports.down = pgm => {
};
