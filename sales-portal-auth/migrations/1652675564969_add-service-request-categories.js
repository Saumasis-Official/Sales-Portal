/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        INSERT INTO service_request_categories (label, description) VALUES
            ('Unloading point not available', 'Unloading point is not available in dropdown'),
            ('Incorrect mapping of distributor to TSE', 'Incorrect TSE is mapped to distributor'),
            ('Update phone no./email id', 'Please update phone no./email id'),
            ('Update distributor to TSE mapping', 'Please update distributor to TSE mapping'),
            ('Add shipping point as unloading point', 'Please add shipping point as unloading point');
    `);
};

exports.down = pgm => {
    pgm.sql(`
        DELETE FROM service_request_categories where label = 'Unloading point not available';
        DELETE FROM service_request_categories where label = 'Incorrect mapping of distributor to TSE';
        DELETE FROM service_request_categories where label = 'Update phone no./email id';
        DELETE FROM service_request_categories where label = 'Update distributor to TSE mapping';
        DELETE FROM service_request_categories where label = 'Add shipping point as unloading point';
    `);
};
