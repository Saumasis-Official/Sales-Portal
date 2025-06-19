/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    
        CREATE TABLE IF NOT EXISTS service_request_categories (
            id serial PRIMARY KEY,
            label VARCHAR(255) UNIQUE NOT NULL,
            description TEXT DEFAULT NULL,
            created_by VARCHAR(50) NOT NULL DEFAULT 'PORTAL_MANAGED',
            status entity_status NOT NULL DEFAULT 'ACTIVE',
            created_on timestamptz NOT NULL DEFAULT NOW(),
            updated_on timestamptz NULL DEFAULT NOW()
        );

        INSERT INTO service_request_categories (label, description) VALUES
        ('Product not showing on search', 'Unable to search for products or Products not showing in search'),
        ('Unable to get tentative amount', 'Unable to get tentative amount – while the users add the product, validate does not give tentative amount'),
        ('Material or MRP not available', 'Validate is giving error – material is not enabled for distributor or MRP not available'),
        ('Missing items in Invoice', 'Issues in PO – Invoice does not have all items mentioned in PO'),
        ('Unloading Point is incorrect in PO/SO', 'Unloading Point is incorrect in PO/SO'),
        ('Unloading point is incorrect in Invoice', 'Unloading point is incorrect in Invoice'),
        ('Others', 'Issues not Listed above, provide details in comment');

        ALTER TABLE IF EXISTS service_requests ADD COLUMN IF NOT EXISTS category_id INT DEFAULT NULL;

        ALTER TABLE IF EXISTS service_requests ADD CONSTRAINT service_requests_categories_fkey FOREIGN KEY (category_id) REFERENCES service_request_categories (id);
    
    `);

};

exports.down = pgm => {

    pgm.sql(`

        ALTER TABLE IF EXISTS service_requests DROP COLUMN IF EXISTS category_id;
    
        DROP TABLE IF EXISTS service_request_categories;
    
    `);

 };
