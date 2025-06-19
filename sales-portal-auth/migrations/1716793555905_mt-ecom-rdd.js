/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
    Create table if not exists mt_ecom_rdd (
        id bigserial NOT NULL PRIMARY KEY,
        po_number varchar(15) NOT NULL,
        so_number varchar(15) NOT NULL,
        po_expiry_date date ,
        rdd date NOT NULL,
        po_item_number varchar(10),
        sap_item_number varchar(10),
        customer_code varchar(10),
        system_sku numeric,
        sku_name varchar(100),
        psku numeric,
        schedule_line_number varchar(5),
        confirmed_quantity numeric,
        po_qty numeric,
        open_qty numeric,
        article_id numeric,
        created_on timestamptz DEFAULT now() NOT NULL,
        updated_on timestamptz,
        updated_by varchar(50)
        );
   `)
};

exports.down = pgm => {
    pgm.sql(
        `DROP TABLE if exists mt_ecom_rdd`
    )
};
