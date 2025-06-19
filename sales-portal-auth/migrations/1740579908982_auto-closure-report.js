/* eslint-disable camelcase */
/* eslint-disable no-undef */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
CREATE TABLE IF NOT EXISTS audit.auto_closure_gt_so_audit_report (
   id bigserial NOT NULL,
   so_number varchar NOT NULL,
   po_number varchar NULL,
   db_code varchar NOT NULL,
   customer_group varchar NOT NULL,
   order_date date NOT NULL,
   order_type public.order_type NOT NULL,
   sales_order_type varchar NULL,
   rdd varchar NOT NULL,
   so_validity date NOT NULL,
   so_sent_to_sap bool DEFAULT false NOT NULL,
   material varchar NULL,
   item_status varchar NULL,
   overall_status varchar NULL,
   job_run timestamptz DEFAULT now() NOT NULL,
   created_on timestamptz DEFAULT now() NOT NULL,
   updated_on timestamptz DEFAULT now() NOT NULL,
   audit_id int8 NOT NULL,
   created_by_user varchar NULL,
   short_close_days numeric NOT NULL,
   sap_message text NULL,
   CONSTRAINT auto_closure_gt_so_audit_report_pk PRIMARY KEY (id),
   CONSTRAINT auto_closure_gt_so_audit_report_auto_closure_gt_so_audit_fk FOREIGN KEY (audit_id) REFERENCES audit.auto_closure_gt_so_audit(audit_id),
   CONSTRAINT auto_closure_gt_so_audit_report_customer_group_master_fk FOREIGN KEY (customer_group) REFERENCES public.customer_group_master("name")
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'auto_closure_gt_so_audit_report_unique_null_idx'
        AND n.nspname = 'audit'
    ) THEN
        CREATE UNIQUE INDEX auto_closure_gt_so_audit_report_unique_null_idx ON audit.auto_closure_gt_so_audit_report (so_number, COALESCE(material, ''));
        CREATE INDEX auto_closure_gt_so_audit_report_so_number_idx ON audit.auto_closure_gt_so_audit_report (so_number);
        CREATE INDEX auto_closure_gt_so_audit_report_po_number_idx ON audit.auto_closure_gt_so_audit_report (po_number);
        CREATE INDEX auto_closure_gt_so_audit_report_order_type_idx ON audit.auto_closure_gt_so_audit_report (order_type,sales_order_type,order_date);
    END IF;
END $$;

CREATE OR REPLACE FUNCTION update_auto_closure_gt_so_audit_report()
RETURNS TRIGGER AS $$
BEGIN
    WITH rdd AS (
        SELECT DISTINCT
            audit_id,
            revision_id,
            created_on,
            (rddd -> 'rdd')::jsonb #>> '{}' AS rdd,
            (rddd -> 'so_validity')::jsonb #>> '{}' AS so_validity,
            (rddd -> 'age')::jsonb #>> '{}' AS age,
            (rddd -> 'ORDERDATE')::jsonb #>> '{}' AS order_date,
            (rddd -> 'SALESORDER')::jsonb #>> '{}' AS so_number,
            (rddd -> 'SOLDTOPARTY')::jsonb #>> '{}' AS db_code,
            (rddd -> 'CREATEDBYUSER')::jsonb #>> '{}' AS created_by_user,
            (rddd -> 'CUSTOMERGROUP')::jsonb #>> '{}' AS customer_group,
            (rddd -> 'SALESORDERTYPE')::jsonb #>> '{}' AS sales_order_type,
            (rddd -> 'PURCHASEORDERBYCUSTOMER')::jsonb #>> '{}' AS po_number
        FROM
            audit.auto_closure_gt_so_audit,
            jsonb_array_elements(rdd_details) AS rddd
        WHERE audit_id = NEW.audit_id
    ),
    auto_closure_settings AS (
        SELECT
            rdd.audit_id,
            acg.order_type,
            COALESCE(
                acg.short_close,
                acga.short_close
            ) AS short_close
        FROM
            rdd
        LEFT JOIN public.auto_closure_gt acg ON
            acg.revision_id = rdd.revision_id
        LEFT JOIN audit.auto_closure_gt_audit acga ON
            acga.revision_id = rdd.revision_id
            AND acga.deleted = false
    ),
    sap_response AS (
        SELECT
            audit_id,
            jsonb_array_elements(sap_response) AS response_batch
        FROM
            audit.auto_closure_gt_so_audit acgsa
        WHERE
            sap_response IS NOT NULL
            AND audit_id = NEW.audit_id
    ),
    sap_response_results AS (
        SELECT
            audit_id,
            response_batch -> 'data' -> 'd' -> 'NAVRESULT' -> 'results' AS results
        FROM
            sap_response
    ),
    sap_response_status AS (
        SELECT
            audit_id,
            (details ->> 'Material') AS material,
            (details ->> 'Message') AS message,
            (details ->> 'SaleOrder') AS salesorder,
            (details ->> 'ItemNumber') AS itemnumber,
            (details ->> 'ItemStatus') AS itemstatus,
            (details ->> 'OverallStatus') AS overallstatus
        FROM
            sap_response_results,
            jsonb_array_elements(results) AS details
        WHERE
            results IS NOT NULL
    ),
    sap AS (
        SELECT
            audit_id,
            rule_id,
            revision_id,
            (jsonb_array_elements(sap_payload) ->> 'NAVSALEORDERS')::jsonb AS navsaleorders
        FROM
            audit.auto_closure_gt_so_audit acgsa
        WHERE
            sap_payload IS NOT NULL
            AND audit_id = NEW.audit_id
    ),
    sap_so AS (
        SELECT DISTINCT
            audit_id,
            rule_id,
            revision_id,
            nso ->> 'SaleOrder' AS so_number,
            nso ->> 'DBnumber' AS db_code,
            nso ->> 'CustomerGroup' AS customer_group
        FROM
            sap,
            jsonb_array_elements(navsaleorders) AS nso
    ),
    source_table AS (
        SELECT DISTINCT
            rdd.so_number,
            rdd.po_number,
            rdd.db_code,
            rdd.customer_group,
            rdd.order_date::date,
            acs.order_type,
            rdd.sales_order_type,
            rdd.rdd,
            rdd.so_validity,
            CASE
                WHEN ss.so_number IS NULL THEN FALSE
                ELSE TRUE
            END AS so_sent_to_sap,
            srs.material,
            srs.itemstatus,
            srs.overallstatus,
            rdd.created_on AS job_run_date,
            rdd.audit_id,
            rdd.created_by_user,
            acs.short_close,
            srs.message
        FROM
            rdd
        INNER JOIN auto_closure_settings acs ON
            acs.audit_id = rdd.audit_id
        LEFT JOIN sap_so ss ON
            rdd.so_number = ss.so_number
        LEFT JOIN sap_response_status srs ON
            rdd.so_number = srs.salesorder
    )
    INSERT INTO audit.auto_closure_gt_so_audit_report (
        so_number,
        po_number,
        db_code,
        customer_group,
        order_date,
        order_type,
        sales_order_type,
        rdd,
        so_validity,
        so_sent_to_sap,
        material,
        item_status,
        overall_status,
        job_run,
        audit_id,
        created_by_user,
        short_close_days,
        sap_message
    )
    SELECT DISTINCT ON (so_number, COALESCE(material, ''))
        src.so_number,
        src.po_number,
        src.db_code,
        src.customer_group,
        src.order_date,
        src.order_type,
        src.sales_order_type,
        src.rdd,
        src.so_validity::date,
        src.so_sent_to_sap,
        src.material,
        src.itemstatus,
        src.overallstatus,
        src.job_run_date,
        src.audit_id,
        src.created_by_user,
        src.short_close,
        src.message
    FROM
        source_table AS src
    ON CONFLICT (so_number, COALESCE(material, ''))
    DO UPDATE
    SET
        so_number = EXCLUDED.so_number,
        po_number = EXCLUDED.po_number,
        db_code = EXCLUDED.db_code,
        customer_group = EXCLUDED.customer_group,
        order_date = EXCLUDED.order_date,
        order_type = EXCLUDED.order_type,
        sales_order_type = EXCLUDED.sales_order_type,
        rdd = EXCLUDED.rdd,
        so_validity = EXCLUDED.so_validity,
        so_sent_to_sap = EXCLUDED.so_sent_to_sap,
        material = EXCLUDED.material,
        item_status = EXCLUDED.item_status,
        overall_status = EXCLUDED.overall_status,
        job_run = EXCLUDED.job_run,
        updated_on = EXCLUDED.updated_on,
        audit_id = EXCLUDED.audit_id,
        created_by_user = EXCLUDED.created_by_user,
        short_close_days = EXCLUDED.short_close_days,
        sap_message = EXCLUDED.sap_message;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_auto_closure_gt_so_audit_report ON audit.auto_closure_gt_so_audit;

CREATE TRIGGER trg_update_auto_closure_gt_so_audit_report
AFTER UPDATE OF sap_response ON audit.auto_closure_gt_so_audit
FOR EACH ROW
WHEN (NEW.sap_response IS DISTINCT FROM OLD.sap_response)
EXECUTE FUNCTION update_auto_closure_gt_so_audit_report();
        `);
};

exports.down = (pgm) => {
  pgm.sql(`
        DROP TABLE IF EXISTS audit.auto_closure_gt_so_audit_report;
        `);
};
