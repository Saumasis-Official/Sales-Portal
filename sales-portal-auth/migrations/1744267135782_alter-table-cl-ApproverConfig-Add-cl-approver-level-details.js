/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
      
    ALTER TABLE credit.cl_approver_configuration DROP COLUMN IF EXISTS sales_codes;
    DROP TYPE IF EXISTS credit.sales_code_enum;

    ALTER TABLE credit.cl_approver_configuration ADD COLUMN IF NOT EXISTS header_id int4 ;

    CREATE TABLE if not exists credit.cl_approver_level_details (
        id serial4 NOT NULL,
        header_name varchar(100) NOT NULL,
        CONSTRAINT cl_approver_level_details_pkey PRIMARY KEY (id)
    );

    INSERT INTO credit.cl_approver_level_details (header_name) VALUES
	 ('Finance UP3 (2nd Approver)'),
	 ('Sales UP4 (3rd Approver)'),
	 ('MT + MT Excl'),
	 ('B2B'),
	 ('ECOM'),
	 ('INSTI'),
	 ('FS');

  
     -- Update header_ids based on customer groups array overlaps
    UPDATE credit.cl_approver_configuration 
    SET header_id = 3                                           -- MT + MT Excl
    WHERE customer_group && ARRAY[14, 15];

    UPDATE credit.cl_approver_configuration 
    SET header_id = 4                                           -- B2B
    WHERE customer_group && ARRAY[28,42];

    UPDATE credit.cl_approver_configuration 
    SET header_id = 5                                           -- ECOM
    WHERE customer_group && ARRAY[16];

    UPDATE credit.cl_approver_configuration 
    SET header_id = 6                                           -- INSTI
    WHERE customer_group && ARRAY[17,18,19,21,26,41,43,46,68];

    UPDATE credit.cl_approver_configuration 
    SET header_id = 7                                           -- FS
    WHERE customer_group && ARRAY[52];
	 
      -- Make header_id NOT NULL after populating data
    ALTER TABLE credit.cl_approver_configuration ALTER COLUMN header_id SET NOT NULL;
   
    `);
};

exports.down = (pgm) => {
    pgm.sql(`   
        ALTER TABLE credit.cl_approver_configuration DROP COLUMN IF EXISTS header_id;
        DROP TABLE IF EXISTS credit.cl_approver_level_details;

    `);
};

