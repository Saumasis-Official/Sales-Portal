/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

    CREATE TYPE sd_status_type AS ENUM (
        'OPEN',
        'CLOSE'
    );
  
    CREATE TABLE IF NOT EXISTS service_delivery_requests (
        id serial PRIMARY KEY,
        distributor_id varchar NOT NULL ,
        req_reason_id integer NOT NULL ,
        cfa_reason_id integer NULL ,
        sd_number varchar(13) NOT NULL UNIQUE,
        so_number integer NULL,
        sd_request_date timestamptz NOT NULL DEFAULT NOW(),
        sd_req_comments varchar(255) NULL,
        sd_res_comments varchar(255) NULL,
        sd_response_date timestamptz NULL DEFAULT NOW(),
        status sd_status_type NOT NULL DEFAULT 'OPEN', 
        is_deleted boolean NOT NULL DEFAULT false, 
        created_by varchar(100) NULL,
        created_by_usergroup varchar(100) NOT NULL,
        updated_by varchar(100) NULL,
        material_code varchar(18) NOT NULL,
        material_description varchar(255) NOT NULL,
        plant_code varchar(50) NOT NULL,
        cfa_name varchar(100) NOT NULL,
        cfa_email varchar(255) NOT NULL,
        cfa_contact varchar(13) NOT NULL,
		FOREIGN KEY(distributor_id) REFERENCES distributor_master(id),
		FOREIGN KEY(so_number) REFERENCES orders(id),
		FOREIGN KEY(cfa_reason_id) REFERENCES service_request_categories(id),
		FOREIGN KEY(req_reason_id) REFERENCES service_request_categories(id)		
    )

`);
};

exports.down = pgm => {
    pgm.sql(`            

        DROP TABLE IF EXISTS service_delivery_requests;

        DROP TYPE sd_status_type;

    `);    
};
