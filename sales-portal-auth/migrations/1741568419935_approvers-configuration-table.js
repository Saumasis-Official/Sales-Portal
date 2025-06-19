/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`

      DROP TABLE IF EXISTS credit.approvers;
      CREATE TYPE credit.sales_code_enum AS ENUM ('SALES_MT_EXC','SALES_ECOM','SALES_B2B','INSTI','FS');  

      CREATE TABLE credit.cl_approver_configuration (
        id serial4 NOT NULL,
        category varchar(255) NULL DEFAULT NULL::character varying,
        finance_emails varchar(255) NOT NULL,
        sales_codes credit.sales_code_enum NULL,
        sales_emails varchar(255) NOT NULL,
        customer_group _int4 NOT NULL,
        updated_by varchar(255) NULL DEFAULT NULL::character varying,
        updated_on timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT cl_approver_configuration_pk PRIMARY KEY (id)
      );

      CREATE TABLE IF NOT EXISTS credit.cl_risk_category (
        id serial4 NOT NULL,
        credit_risk varchar(255) NOT NULL,
        low_credit_risk_b varchar(255) NOT NULL,
        medium_credit_risk_c varchar(255) NOT NULL,
        high_credit_risk_d varchar(255) NOT NULL,
        updated_by varchar(255) NOT NULL DEFAULT NULL::character varying,
        updated_on timestamptz NOT NULL DEFAULT now()
      );

    INSERT INTO credit.cl_approver_configuration (category,finance_emails,sales_codes,sales_emails,customer_group,updated_by) VALUES
	 ('Approver Category 5 (Default Approver Category)','oderportal.testing@tataconsumer.com','SALES_MT_EXC','oderportal.testing@tataconsumer.com','{14,15}','SYSTEM'),
	 ('Approver Category 4','oderportal.testing@tataconsumer.com','SALES_B2B','oderportal.testing@tataconsumer.com','{28,42}','SYSTEM'),
	 ('Approver Category 4','oderportal.testing@tataconsumer.com','SALES_ECOM','oderportal.testing@tataconsumer.com','{16}','SYSTEM'),
	 ('Approver Category 5 (Default Approver Category)','oderportal.testing@tataconsumer.com','SALES_ECOM','oderportal.testing@tataconsumer.com','{16}','SYSTEM'),
	 ('Approver Category 5 (Default Approver Category)','oderportal.testing@tataconsumer.com','SALES_B2B','oderportal.testing@tataconsumer.com','{28,42}','SYSTEM'),
	 ('Approver Category 2','oderportal.testing@tataconsumer.com','SALES_ECOM','oderportal.testing@tataconsumer.com','{16}','SYSTEM'),
	 ('Approver Category 2','oderportal.testing@tataconsumer.com','SALES_B2B','oderportal.testing@tataconsumer.com','{28,42}','SYSTEM'),
	 ('Approver Category 4','oderportal.testing@tataconsumer.com','SALES_MT_EXC','oderportal.testing@tataconsumer.com','{14,15}','SYSTEM'),
	 ('Approver Category 1','oderportal.testing@tataconsumer.com','SALES_ECOM','oderportal.testing@tataconsumer.com','{16}','SYSTEM'),
	 ('Approver Category 2','oderportal.testing@tataconsumer.com','SALES_MT_EXC','oderportal.testing@tataconsumer.com','{14,15}','SYSTEM');
  
   INSERT INTO credit.cl_approver_configuration (category,finance_emails,sales_codes,sales_emails,customer_group,updated_by) VALUES
	 ('Approver Category 3','oderportal.testing@tataconsumer.com','SALES_MT_EXC','oderportal.testing@tataconsumer.com','{14,15}','SYSTEM'),
	 ('Approver Category 3','oderportal.testing@tataconsumer.com','SALES_ECOM','oderportal.testing@tataconsumer.com','{16}','SYSTEM'),
	 ('Approver Category 3','oderportal.testing@tataconsumer.com','SALES_B2B','oderportal.testing@tataconsumer.com','{28,42}','SYSTEM'),
	 ('Approver Category 1','oderportal.testing@tataconsumer.com','SALES_MT_EXC','oderportal.testing@tataconsumer.com','{14,15}','SYSTEM'),
	 ('Approver Category 1','oderportal.testing@tataconsumer.com','SALES_B2B','oderportal.testing@tataconsumer.com','{28,42}','SYSTEM');

   
    INSERT INTO credit.cl_approver_configuration (category,finance_emails,sales_codes,sales_emails,customer_group,updated_by) VALUES
     ('Approver Category 1','oderportal.testing@tataconsumer.com','INSTI','oderportal.testing@tataconsumer.com','{17,18,19,21,26,41,43,46,68}','SYSTEM'),
     ('Approver Category 2','oderportal.testing@tataconsumer.com','INSTI','oderportal.testing@tataconsumer.com','{17,18,19,21,26,41,43,46,68}','SYSTEM'),
     ('Approver Category 3','oderportal.testing@tataconsumer.com','INSTI','oderportal.testing@tataconsumer.com','{17,18,19,21,26,41,43,46,68}','SYSTEM'),
     ('Approver Category 4','oderportal.testing@tataconsumer.com','INSTI','oderportal.testing@tataconsumer.com','{17,18,19,21,26,41,43,46,68}','SYSTEM'),
     ('Approver Category 5 (Default Approver Category)','oderportal.testing@tataconsumer.com','INSTI','oderportal.testing@tataconsumer.com','{17,18,19,21,26,41,43,46,68}','SYSTEM'),
     ('Approver Category 1','oderportal.testing@tataconsumer.com','FS','oderportal.testing@tataconsumer.com','{52}','SYSTEM'),
     ('Approver Category 2','oderportal.testing@tataconsumer.com','FS','oderportal.testing@tataconsumer.com','{52}','SYSTEM'),
     ('Approver Category 3','oderportal.testing@tataconsumer.com','FS','oderportal.testing@tataconsumer.com','{52}','SYSTEM'),
     ('Approver Category 4','oderportal.testing@tataconsumer.com','FS','oderportal.testing@tataconsumer.com','{52}','SYSTEM'),
     ('Approver Category 5 (Default Approver Category)','oderportal.testing@tataconsumer.com','FS','oderportal.testing@tataconsumer.com','{52}','SYSTEM');
  


    INSERT INTO credit.cl_risk_category (credit_risk, low_credit_risk_b, medium_credit_risk_c, high_credit_risk_d,updated_by)
    VALUES 
    ('Upto 15% of Base Credit Limit', 'Approver Category 1', 'Approver Category 1', 'Approver Category 2','SYSTEM'),
    ('Between 15%-30% of Base Credit Limit', 'Approver Category 1', 'Approver Category 2', 'Approver Category 3','SYSTEM'),
    ('Beyond 30% of Base Credit Limit', 'Approver Category 2', 'Approver Category 3', 'Approver Category 4','SYSTEM');

    `);
};

exports.down = (pgm) => {
    pgm.sql(`
              DROP TABLE IF EXISTS credit.cl_approver_configuration;
              DROP TABLE IF EXISTS credit.cl_risk_category;
              DROP TYPE IF EXISTS credit.sales_code_enum;

        `);
};
