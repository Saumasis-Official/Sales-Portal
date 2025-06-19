/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {pgm.sql(
    `
    ALTER TABLE sales_hierarchy_details
    ADD COLUMN cfa_email varchar(55) ,
    ADD COLUMN cfa_contact_person varchar(255) ,
    ADD COLUMN cfa_contact_number varchar(16) ;
    `
)};

exports.down = pgm => {
    pgm.sql(
        `
        ALTER TABLE sales_hierarchy_details 
        DROP COLUMN cfa_email,
        DROP COLUMN cfa_contact_person,
        DROP COLUMN cfa_contact_number
        `
    )
};
