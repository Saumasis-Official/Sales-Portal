/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `
        INSERT INTO service_request_categories(
            label, description, created_by, status, type)
             VALUES ('Order not serviced', 'Order not serviced', 'PORTAL_MANAGED', 'ACTIVE', 'SD_REQUEST'),
                    ('Fill rate concerns', 'Fill rate concerns', 'PORTAL_MANAGED', 'ACTIVE', 'SD_REQUEST'),
                    ('Order not serviced on time', 'Order not serviced on time', 'PORTAL_MANAGED', 'ACTIVE', 'SD_REQUEST'),
                    ('Material returned by customer', 'Material returned by customer', 'PORTAL_MANAGED', 'ACTIVE', 'SD_REQUEST'),
                    ('Fresh stock is not dispatched', 'Fresh stock is not dispatched', 'PORTAL_MANAGED', 'ACTIVE', 'SD_REQUEST'),
                    ('Truck dispatched on (Time)','Truck dispatched on (Time)','PORTAL_MANAGED','ACTIVE','SD_RESPONSE'),
                    ('Delay on Truck load','Delay on Truck load','PORTAL_MANAGED','ACTIVE','SD_RESPONSE'),
                    ('PO SO mismatch','PO SO mismatch','PORTAL_MANAGED','ACTIVE','SD_RESPONSE'),
                    ('Pricing Issue','Pricing Issue','PORTAL_MANAGED','ACTIVE','SD_RESPONSE'),
                    ('Expired PO not short closed properly','Expired PO not short closed properly','PORTAL_MANAGED','ACTIVE','SD_RESPONSE'),
                    ('Unloading delay','Unloading delay','PORTAL_MANAGED','ACTIVE','SD_RESPONSE');`
    );
};

exports.down = pgm => {
    pgm.sql(
        `
        DELETE FROM service_request_categories WHERE label = 'Order not serviced';
        DELETE FROM service_request_categories WHERE label = 'Fill rate concerns';
        DELETE FROM service_request_categories WHERE label = 'Order not serviced on time';
        DELETE FROM service_request_categories WHERE label = 'Material returned by customer';
        DELETE FROM service_request_categories WHERE label = 'Fresh stock is not dispatched';
        DELETE FROM service_request_categories WHERE label = 'Truck dispatched on (Time)';
        DELETE FROM service_request_categories WHERE label = 'Delay on Truck load';
        DELETE FROM service_request_categories WHERE label = 'PO SO mismatch';
        DELETE FROM service_request_categories WHERE label = 'Pricing Issue';
        DELETE FROM service_request_categories WHERE label = 'Expired PO not short closed properly';
        DELETE FROM service_request_categories WHERE label = 'Unloading delay';
        `
    );

};
