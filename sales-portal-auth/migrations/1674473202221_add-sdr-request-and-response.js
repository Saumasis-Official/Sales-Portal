/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    UPDATE public.service_request_categories SET label='Order Serviced partially', description='Order Serviced partially'
	WHERE label='Fill rate concerns';

	UPDATE public.service_request_categories SET  
	label='Order not delivered when credit is present', description='Order not delivered when credit is present'
	WHERE label='Fresh stock is not dispatched';
	
	INSERT INTO service_request_categories(
    label, description, created_by, status, type)
    VALUES ('Old stock Received', 'Old stock Received', 'PORTAL_MANAGED', 'ACTIVE', 'SD_REQUEST');
    
    UPDATE public.service_request_categories SET  
    label='Credit not available', description='Credit not available'
    WHERE label='Delay on Truck load';

    UPDATE public.service_request_categories SET  
    label='Truck led delay', description='Truck led delay'
    WHERE label='PO SO mismatch';

    UPDATE public.service_request_categories SET  
    label='Expired SO not short closed properly', description='Expired SO not short closed properly'
    WHERE label='Expired PO not short closed properly';
             
    INSERT INTO service_request_categories(
    label, description, created_by, status, type)
    VALUES ('Material mismatch in SO', 'Material mismatch in SO', 'PORTAL_MANAGED', 'ACTIVE', 'SD_RESPONSE'),
    ('Stock unavailable', 'Stock unavailable', 'PORTAL_MANAGED', 'ACTIVE', 'SD_RESPONSE');
                      
             `
    )
};

exports.down = pgm => { 
    pgm.sql(
        `
        DELETE FROM service_request_categories WHERE label = 'Order not serviced';
        DELETE FROM service_request_categories WHERE label = 'Order Serviced partially';
        DELETE FROM service_request_categories WHERE label = 'Order not serviced on time';
        DELETE FROM service_request_categories WHERE label = 'Material returned by customer';
        DELETE FROM service_request_categories WHERE label = 'Order not delivered when credit is present';
        DELETE FROM service_request_categories WHERE label = 'Old stock Received';
        DELETE FROM service_request_categories WHERE label = 'Truck dispatched on (Time)';
        DELETE FROM service_request_categories WHERE label = 'Credit not available';
        DELETE FROM service_request_categories WHERE label = 'Truck led delay';
        DELETE FROM service_request_categories WHERE label = 'Pricing Issue';
        DELETE FROM service_request_categories WHERE label = 'Expired SO not short closed properly';
        DELETE FROM service_request_categories WHERE label = 'Unloading delay';
        DELETE FROM service_request_categories WHERE label = 'Stock unavailable';
        DELETE FROM service_request_categories WHERE label = 'Material mismatch in SO';
        `
    )
};
