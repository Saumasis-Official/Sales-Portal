/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    BEGIN;
        CREATE TABLE IF NOT EXISTS pdp_unlock_request
        (
            request_id varchar NOT NULL PRIMARY KEY,
            area_codes _varchar NOT NULL,
	        regions _varchar NOT NULL,
            distributor_codes _varchar NOT NULL,
            start_date timestamptz NOT NULL,
            end_date timestamptz NOT NULL,
            comments text NULL,
            status order_approval_status NOT NULL DEFAULT 'PENDING'::order_approval_status,
            requested_on timestamptz DEFAULT now() NOT NULL,
            requested_by varchar NOT NULL,
            responded_on _timestamptz NULL,
            responded_by _varchar NULL
        );

        ALTER TABLE IF EXISTS distributor_master ADD COLUMN IF NOT EXISTS pdp_unlock_id varchar NULL;

        CREATE TABLE IF NOT EXISTS pdp_lock_audit_trail (
            id bigserial NOT NULL PRIMARY KEY,
            distributor_id varchar NOT NULL,
            status bool NOT NULL,
            updated_by varchar NOT NULL,
            updated_on timestamptz DEFAULT now() NOT NULL,
            request_id varchar NULL,
            CONSTRAINT distributor_id_fkey FOREIGN KEY (distributor_id) REFERENCES distributor_master(id),
            CONSTRAINT request_id_fkey FOREIGN KEY (request_id) REFERENCES pdp_unlock_request(request_id)
        );

        COMMIT;
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE IF EXISTS pdp_unlock_request;
        ALTER TABLE IF EXISTS distributor_master DROP COLUMN IF EXISTS pdp_unlock_id;
    `);
};
