/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE IF NOT EXISTS credit_crunch_notifications_log (
            key bigserial PRIMARY KEY,
            distributor_id character varying(8) NOT NULL,
            po_number character varying NOT NULL,
            email_to text NOT NULL,
            email_cc text,
            credit_shortage numeric NOT NULL,
            notified_on timestamptz DEFAULT now(),
            CONSTRAINT distributor_id_fkey FOREIGN KEY (distributor_id)
                        REFERENCES distributor_master (id),
            CONSTRAINT po_number_fkey FOREIGN KEY (po_number)
                        REFERENCES public.orders (po_number) );
       `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS credit_crunch_notifications_log;
    `);
};
