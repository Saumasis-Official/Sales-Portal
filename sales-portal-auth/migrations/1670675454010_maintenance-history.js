/* eslint-disable camelcase */

exports.up = pgm => {
    pgm.sql(`
    CREATE TABLE IF NOT EXISTS maintenance_history (
        id serial PRIMARY KEY,
        status maintenance_status NOT NULL,
        start_date_time timestamp with time zone NOT NULL,
        end_date_time timestamp with time zone NULL,
        duration int NULL,
        remark varchar(250) NULL,
        user_id varchar(50) NOT NULL,
        user_name varchar(50) NOT NULL	
    );
`);
};

exports.down = pgm => {
    pgm.sql(`
    DROP TABLE IF EXISTS maintenance_history
    `)
};
