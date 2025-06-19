/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
                begin;
                insert into cfa_depot_mapping (zone,depot_code,sales_org, distribution_channel, division, location, name, address, email, contact_person, contact_number, zone_manager_email, cluster_manager_email, logistic_email)
                select zone,depot_code,sales_org, distribution_channel, 17 as division, location, name, address, email, contact_person, contact_number, zone_manager_email, cluster_manager_email, logistic_email
                from cfa_depot_mapping 
                where division = 18
                on conflict (depot_code, sales_org, distribution_channel, division) do nothing;
                commit;
`)
};

exports.down = pgm => {};
