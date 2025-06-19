/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    WITH max_id AS (
        SELECT COALESCE(MAX(id), 0) + 1 AS next_id 
        FROM cfa_depot_mapping
    )
    INSERT INTO cfa_depot_mapping (id, zone, depot_code, sales_org, distribution_channel, division, "location", "name", address, email, contact_person, contact_number, zone_manager_email, cluster_manager_email, is_deleted, logistic_email, group5_id)
    SELECT 
        next_id + ROW_NUMBER() OVER () - 1 AS id,
        zone,
        depot_code,
        sales_org,
        distribution_channel,
        22,
        "location",
        "name",
        address,
        email,
        contact_person,
        contact_number,
        zone_manager_email,
        cluster_manager_email,
        is_deleted,
        logistic_email,
        group5_id
    FROM cfa_depot_mapping, max_id
    WHERE division = 10 on conflict( depot_code, sales_org, distribution_channel,division) do nothing;
    
    `);
};

exports.down = pgm => {};
