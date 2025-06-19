/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`

        INSERT INTO service_request_categories (label, description) VALUES
        ('Order block or F&F pending ', 'Validate is giving error - Blocked for F&F Pending'),
        ('Sold-to-party not maintained', 'Validate is giving error - Sold-to-party not maintained for sales area'),
        ('Customer has general block', 'Validate is giving error - Customer has been assigned Order block:General block'),
        ('Submit Error', 'Sales order not created')
       
        `);
};

exports.down = (pgm) => {
  pgm.sql(`

        Delete from service_request_categories where label in ('Order block or F&F pending ','Sold-to-party not maintained','Customer has general block','Submit Error');
    
    `);
};
