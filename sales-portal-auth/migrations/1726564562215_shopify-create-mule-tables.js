/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {

    pgm.sql(`
    CREATE SEQUENCE shopify.runlogid
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 9223372036854775807
	START 1
	CACHE 1
	NO CYCLE;

CREATE TABLE if not exists shopify.run_logs (
	"RunLogId" int4 NOT NULL DEFAULT nextval('shopify.runlogid'::regclass),
	"tableName" varchar(100) NOT NULL,
	"runStatus" bool NOT NULL,
	"messageText" text NULL,
	"exceptionContext" text NULL,
	"createdAt" timestamp NOT NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
	"createdBy" int4 NULL,
	"updatedAt" timestamp NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
	"updatedBy" int4 NULL,
	"deletedAt" timestamp NULL,
	"deletedBy" int4 NULL,
	"lastReplication" timestamp NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
	CONSTRAINT runlogid_pkey PRIMARY KEY ("RunLogId")
);


CREATE TABLE shopify.uk_shopify_duplicacy_check (
	id_number varchar(15) NOT NULL,
	order_number varchar(20) NOT NULL,
	tracking_id varchar(25) NULL,
	transaction_date timestamp NULL,
	process_date timestamp NULL,
	CONSTRAINT pk_uk_transaction_check PRIMARY KEY (id_number, order_number)
);
CREATE INDEX idx_transaction_check ON shopify.uk_shopify_duplicacy_check USING btree (id_number, order_number);

CREATE TABLE shopify.uk_shopify_duplicacy_check_stg (
	id_number varchar(15) NULL,
	order_number varchar(20) NULL,
	tracking_id varchar(25) NULL,
	transaction_date timestamp NULL,
	process_date timestamp NULL
);

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
    allow_reprocess_flag,
    reprocess_date,
    reprocess_count) values (new.id_number,new.order_number, new.tracking_id,new.transaction_date, new.allow_reprocess_flag,
   new.reprocess_date,new.reprocess_count);

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
return new;
end;
$function$
;


create trigger uk_duplicate_chk after
insert
    on
    shopify.uk_shopify_duplicacy_check_stg for each row execute function shopify.duplicate_chk_fun()
    `)
};

exports.down = pgm => {};
