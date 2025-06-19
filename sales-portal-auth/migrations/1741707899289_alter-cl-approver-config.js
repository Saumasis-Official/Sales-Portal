/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
    TRUNCATE TABLE credit.cl_risk_category CONTINUE IDENTITY RESTRICT;
    
    ALTER TABLE if exists credit.cl_risk_category add if not exists risk_code varchar NULL;

    INSERT INTO credit.cl_risk_category (credit_risk,low_credit_risk_b,medium_credit_risk_c,high_credit_risk_d,updated_by,risk_code) VALUES
	 ('Upto 15% of Base Credit Limit','Approver Category 1','Approver Category 1','Approver Category 2','SYSTEM','First'),
	 ('Between 15%-30% of Base Credit Limit','Approver Category 1','Approver Category 2','Approver Category 3','SYSTEM','Second'),
	 ('Beyond 30% of Base Credit Limit','Approver Category 2','Approver Category 3','Approver Category 4','SYSTEM','Third');


    `);
};

exports.down = (pgm) => {
    pgm.sql(` `);
};
