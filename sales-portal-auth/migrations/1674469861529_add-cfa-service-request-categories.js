/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    
    INSERT INTO service_request_categories(label, description, type) VALUES
    ('Unable to close ticket', 'Unable to close service delivery request', 'CFA_REPORT_ISSUE'),
    ('Unable to view ticket', 'Unable to view service delivery request', 'CFA_REPORT_ISSUE'),
    ('Incorrect depot mapping', 'Incorrect depot mapping for CFA', 'CFA_REPORT_ISSUE')
    ON CONFLICT DO NOTHING;

    `);
};

exports.down = pgm => {
    pgm.sql(`

    DELETE FROM service_request_categories WHERE label = 'Unable to close ticket';
    DELETE FROM service_request_categories WHERE label = 'Unable to view ticket';
    DELETE FROM service_request_categories WHERE label = 'Incorrect depot mapping';
 
    `);
};
