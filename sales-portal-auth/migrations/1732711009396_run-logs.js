/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE TABLE if not exists shopify.run_logs (
        "RunLogId" int4 NOT NULL DEFAULT nextval('shopify.runlogid'::regclass),
        "tableName" varchar(100) NOT NULL,
        "runStatus" bool NULL,
        "messageText" text NULL,
        "exceptionContext" text NULL,
        "createdAt" timestamp NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
        "createdBy" int4 NULL,
        "updatedAt" timestamp NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
        "updatedBy" int4 NULL,
        "deletedAt" timestamp NULL,
        "deletedBy" int4 NULL,
        "lastReplication" timestamp NULL DEFAULT (now() AT TIME ZONE 'utc'::text),
        CONSTRAINT runlogid_pkey PRIMARY KEY ("RunLogId")
    );
        `)
};

exports.down = pgm => {
    pgm.sql(`
        Drop table if exist shopify.run_logs
        `)
};
