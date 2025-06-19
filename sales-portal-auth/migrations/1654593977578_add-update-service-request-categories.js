/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
        INSERT INTO service_request_categories (label, description) VALUES
        ('Data - Ship-To/Sub-D/Unloading point updates', 'Data - Ship-To/Sub-D/Unloading point updates'),
        ('Data - Distributor - TSE Mapping updates', 'Data - Distributor - TSE Mapping updates'),
        ('Data - Distributor - Phone Number/Email ID updates', 'Data - Distributor - Phone Number/Email ID updates'),
        ('PO/SO Update or Delete', 'PO/SO Update or Delete');    
    `);

};

exports.down = pgm => { };
