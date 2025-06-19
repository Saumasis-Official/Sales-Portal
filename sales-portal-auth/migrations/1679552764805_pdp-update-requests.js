/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(
    ` DO $$
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'request_status') THEN
                CREATE TYPE request_status AS ENUM ('PENDING','APPROVED','REJECTED');
            END IF;
            CREATE TABLE IF NOT EXISTS PDP_Update_Request (
                id serial PRIMARY KEY,
                pdp_update_req_no varchar(15) NOT NULL UNIQUE,
                distributor_name varchar(255) NOT NULL,
                distributor_code varchar(20) NOT NULL,
                sales_org varchar(4) NOT NULL,
                division varchar(2) NOT NULL,
                dist_channel varchar(2) NOT NULL,
                plant_code varchar(4) NOT NULL,
                pdp_current varchar(16) NOT NULL,
                pdp_requested varchar(16) NOT NULL,
                ref_date_current varchar(8) DEFAULT '00000000',
                ref_date_requested varchar(8) DEFAULT '00000000',
                tse_code varchar(50) NOT NULL,
                request_comments TEXT DEFAULT NULL,
                response_comments Text DEFAULT NULL,
                status request_status NOT NULL,
                created_by varchar(255) NOT NULL,
                updated_by varchar(255) NULL,
                created_on timestamptz NULL,
                update_on timestamptz NULL
            );
        END$$;
        `,
  );
};

exports.down = (pgm) => {
    pgm.sql(`
    DROP TABLE IF EXISTS PDP_Update_Request;
    `)
};
