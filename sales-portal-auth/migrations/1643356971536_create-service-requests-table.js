/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        CREATE SEQUENCE srs;
        
        SELECT setval('srs', 10000000);
        
        CREATE TABLE IF NOT EXISTS service_requests (	
        	sr_no text PRIMARY KEY CHECK (sr_no ~ '^DBO[0-9]+$' ) DEFAULT 'DBO' || nextval('srs'),
        	remarks varchar(255) default null,
        	user_id varchar(30) not null,
        	error_code varchar(255) not null,
        	error_message text default null,
        	corr_id varchar(255) default null,
        	error_info jsonb default null,
        	FOREIGN KEY (user_id) REFERENCES distributor_master (id)
        );
    
    `);

};

exports.down = pgm => {

    pgm.sql(`

        DROP TABLE IF EXISTS service_requests;  

        DROP SEQUENCE IF EXISTS srs;
    
    `);

};
