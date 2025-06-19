/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE stock_norm_default (
            id SERIAL PRIMARY KEY,
            customer_group_id INTEGER NOT NULL,
            class_a_sn NUMERIC NOT NULL,
            class_a_ss_percent NUMERIC NOT NULL,
            class_b_sn NUMERIC NOT NULL,
            class_b_ss_percent NUMERIC NOT NULL,
            class_c_sn NUMERIC NOT NULL,
            class_c_ss_percent NUMERIC NOT NULL,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_by VARCHAR(50) DEFAULT 'PORTAL_MANAGED',
            FOREIGN KEY (customer_group_id) REFERENCES customer_group_master (id)
            );
        
        INSERT INTO stock_norm_default (customer_group_id, class_a_sn, class_a_ss_percent, class_b_sn, class_b_ss_percent, class_c_sn, class_c_ss_percent)
        select 
            cgm.id,
            6 as class_a_sn,
            50 as class_a_ss_percent,
            6 as class_b_sn, 
            50 as class_b_ss_percent,
            6 as class_c_sn,
            50 as class_c_ss_percent
            from customer_group_master cgm 
        `);

};

exports.down = pgm => {
    pgm.sql(`
        DROP TABLE stock_norm_default;
    `);
};
