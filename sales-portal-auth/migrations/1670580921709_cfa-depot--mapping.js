/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {pgm.sql(
    `
    CREATE TABLE IF NOT EXISTS cfa_depot_mapping(
        id serial PRIMARY KEY,
        zone varchar(15),
        depot_code varchar(4) NOT NULL,
        sales_org int NOT NULL,
        distribution_channel int NOT NULL,
        division int NOT NULL,
        location varchar(55),
        name varchar(55) NOT NULL,
        address varchar(255),
        email varchar(55) NOT NULL, 
        contact_person varchar(255) NOT NULL,
        contact_number varchar(16),
        zone_manager_email varchar(255),
        cluster_manager_email varchar(255),
        is_deleted boolean DEFAULT false,
        created_on timestamptz NOT NULL DEFAULT NOW(),
        updated_on timestamptz NULL DEFAULT NOW(),
        UNIQUE (depot_code,sales_org,distribution_channel,division)
        )
    `
)};

exports.down = pgm => {pgm.sql(

    `DROP TABLE IF EXISTS cfa_depot_mapping `

)};