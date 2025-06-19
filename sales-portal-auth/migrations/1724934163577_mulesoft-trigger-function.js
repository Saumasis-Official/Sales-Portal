/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
pgm.sql(`
        CREATE OR REPLACE FUNCTION shopify.duplicate_chk_fun()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        DECLARE
        uks_rec "shopify".uk_shopify_duplicacy_check_stg%rowtype;

        p_order integer;

        begin

        for uks_rec in select * from "shopify".uk_shopify_duplicacy_check_stg loop
        p_order := 0;
        select 1 into p_order from "shopify".uk_shopify_duplicacy_check where order_number = uks_rec.order_number;

        if p_order is null THEN

        insert into "shopify".uk_shopify_duplicacy_check (id_number,
        order_number,
        tracking_id,
        transaction_date,
        allow_reprocess_flag,
        reprocess_date,
        reprocess_count) values (uks_rec.id_number,uks_rec.order_number, uks_rec.tracking_id,uks_rec.transaction_date, uks_rec.allow_reprocess_flag, uks_rec.reprocess_date,uks_rec.reprocess_count);

        end if;

        end loop;

        return new;
        end;
        $function$;
`)

};

exports.down = pgm => {};
