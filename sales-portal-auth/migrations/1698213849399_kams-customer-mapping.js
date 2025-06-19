/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        ` CREATE TABLE IF NOT EXISTS kams_customer_mapping
        (
            id SERIAL PRIMARY KEY,
            customer_name varchar[] NOT NULL,
            user_id varchar(20) NOT NULL,
            created_on timestamp with time zone DEFAULT NOW(),
            updated_on timestamp with time zone DEFAULT NOW(),
            is_deleted boolean DEFAULT false,
            updated_by varchar(255),
            FOREIGN KEY (user_id) REFERENCES sales_hierarchy_details(user_id) ON DELETE CASCADE
        );
        `
    )
};

exports.down = pgm => {};
