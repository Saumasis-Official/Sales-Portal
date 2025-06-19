/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    CREATE TABLE IF NOT EXISTS Plant_Code_Update_Request (
        id serial PRIMARY KEY,
        Pc_number varchar(13) NOT NULL UNIQUE,
        SalesOrg varchar(4) NOT NULL,
        Division varchar(2) NOT NULL,
        Distribution_Channel varchar(2) NOT NULL,
        Plant_Code varchar(4) NOT NULL,
        code varchar(8) NOT NULL,
        distributor_name varchar(255) NOT NULL,
        distributor_code varchar(20) NOT NULL,
        comments TEXT DEFAULT NULL,
        Logistic_response Text DEFAULT NULL,
        requested_type plant_request_type NOT NULL,
        status request_status NOT NULL,
        Created_by varchar(255) NOT NULL,
        Update_by varchar(255) NULL,
        Created_on timestamptz NULL,
        Update_on timestamptz NULL 
    )`);

};

exports.down = pgm => {
    pgm.sql(`
    DROP TABLE IF Plant_Code_Update_Request;
    `)
};
