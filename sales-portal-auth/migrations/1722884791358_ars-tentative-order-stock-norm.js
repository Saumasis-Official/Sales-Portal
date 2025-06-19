/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(
        `
        CREATE TABLE IF NOT EXISTS public.ars_tentative_order_stock_norm_cv (
            id bigserial NOT NULL,
            distributor_code text NOT NULL,
            psku text NOT NULL,
            applicable_month text NOT NULL,
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
            updated_on timestamptz DEFAULT now() NOT NULL,
            CONSTRAINT ars_tentative_order_stock_norm_cv_distributor_code_psku_month_k UNIQUE (distributor_code, psku, applicable_month),
            CONSTRAINT ars_tentative_order_stock_norm_cv_pkey PRIMARY KEY (id),
            CONSTRAINT ars_tentative_order_stock_norm_cv_distributor_master_fk FOREIGN KEY (distributor_code) REFERENCES public.distributor_master(id),
            CONSTRAINT ars_tentative_order_stock_norm_cv_material_master_fk FOREIGN KEY (psku) REFERENCES public.material_master(code)
        );
        `
    );
};

exports.down = pgm => {
    pgm.sql(
        `
        DROP TABLE public.ars_tentative_order_stock_norm_cv;
        `
    );
};
