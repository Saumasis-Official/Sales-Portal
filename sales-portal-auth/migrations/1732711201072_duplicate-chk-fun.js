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

        messageText TEXT;

        exceptionContext TEXT;

        begin
            
        p_order := 0;
        select 1 into p_order from "shopify".uk_shopify_duplicacy_check where order_number = old.order_number;

        if p_order is null then

        insert into "shopify".uk_shopify_duplicacy_check (id_number,
            order_number,
            tracking_id,
            transaction_date,
            process_date
            ) values (new.id_number,
            new.order_number,
            new.tracking_id,
            new.transaction_date,
        new.process_date);

        end if;

        INSERT INTO "shopify".run_logs ("tableName","runStatus") VALUES ('uk_shopify_duplicacy_check',true);

        delete from shopify.uk_shopify_duplicacy_check_stg;
        return new;

        EXCEPTION
            WHEN others THEN 
                get stacked diagnostics
                    messageText = message_text,
                    exceptionContext = pg_exception_context;
                
                INSERT INTO "shopify".run_logs ("tableName","runStatus","messageText","exceptionContext") VALUES ('uk_shopify_duplicacy_check',false, messageText||'order number'||new.order_number||'ID number'||new.id_number,exceptionContext);
            
            --INSERT INTO "shopify".run_logs ("tableName","runStatus","messageText","exceptionContext") VALUES ('uk_shopify_duplicacy_check',false, messageText,exceptionContext);
        return new;
        end;
        $function$
        ;

        `)
};

exports.down = pgm => {};
