/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE SCHEMA IF NOT EXISTS archive;

        CREATE TABLE IF NOT EXISTS archive.forecast_distribution_archive (
            id int8 NULL,
            distributor_code text NULL,
            psku text NULL,
            applicable_month text NULL,
            pdp text NULL,
            division varchar(6) NULL,
            "_1" numeric NULL,
            "_2" numeric NULL,
            "_3" numeric NULL,
            "_4" numeric NULL,
            "_5" numeric NULL,
            "_6" numeric NULL,
            "_7" numeric NULL,
            "_8" numeric NULL,
            "_9" numeric NULL,
            "_10" numeric NULL,
            "_11" numeric NULL,
            "_12" numeric NULL,
            "_13" numeric NULL,
            "_14" numeric NULL,
            "_15" numeric NULL,
            "_16" numeric NULL,
            "_17" numeric NULL,
            "_18" numeric NULL,
            "_19" numeric NULL,
            "_20" numeric NULL,
            "_21" numeric NULL,
            "_22" numeric NULL,
            "_23" numeric NULL,
            "_24" numeric NULL,
            "_25" numeric NULL,
            "_26" numeric NULL,
            "_27" numeric NULL,
            "_28" numeric NULL,
            "_29" numeric NULL,
            "_30" numeric NULL,
            "_31" numeric NULL,
            created_on timestamptz NULL,
            updated_on timestamptz NULL,
            "class" varchar(1) NULL
        );

        CREATE TABLE IF NOT EXISTS archive.stock_norm_config_archive (
            applicable_month varchar(6) NULL,
            updated_by varchar(50) NULL,
            updated_on timestamptz NULL,
            remarks text NULL,
            dist_id varchar(255) NULL,
            id int8 NULL,
            stock_norm numeric NULL,
            ss_percent numeric NULL,
            psku text NULL,
            class_of_last_update varchar(1) NULL
        );

        CREATE TABLE IF NOT EXISTS archive.ars_forecast_total_archive (
            id bigint NULL,
            applicable_month varchar NULL,
            psku varchar NULL,
            forecast_buom numeric NULL,
            forecast_cs numeric NULL,
            area_forecast _jsonb NULL
        );

        CREATE INDEX IF NOT EXISTS forecast_distribution_distributor_code_applicable_month_idx ON public.forecast_distribution (distributor_code,applicable_month DESC);
        CREATE INDEX IF NOT EXISTS stock_norm_config_dist_id_applicable_month_idx ON public.stock_norm_config (dist_id,applicable_month DESC);
        CREATE INDEX IF NOT EXISTS orders_distributor_order_status_date_idx ON public.orders (distributor_id,order_type,status,so_date DESC);
        CREATE INDEX IF NOT EXISTS sku_rule_configurations_tse_code_delete_channel_idx ON public.sku_rule_configurations (tse_code,deleted,channel);

        `)
};

exports.down = pgm => {};
