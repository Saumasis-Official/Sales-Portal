/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    
    INSERT INTO service_request_categories(label, description) VALUES
    ('Data - PDP Queries', 'Unable to submit order due to pdp error'),
    ('Data - Self Lifting & Direct Dispatch - Pricing Queries', 'Price mismatch for self lifting and direct dispatch order');
    `);
};

exports.down = pgm => {
    pgm.sql(`

       DELETE FROM service_request_categories WHERE label = 'Data - PDP Queries';
       DELETE FROM service_request_categories WHERE label = 'Data - Self Lifting & Direct Dispatch - Pricing Queries';
    
    `);
};
