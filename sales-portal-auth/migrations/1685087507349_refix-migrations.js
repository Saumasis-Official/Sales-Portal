/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`

    CREATE TABLE IF NOT EXISTS public.sales_allocation (
        key bigserial NOT NULL,
        sold_to_party varchar NOT NULL,
        asm_code varchar(6) NOT NULL,
        parent_sku varchar(18) NOT NULL,
        parent_desc varchar NOT NULL,
        product_hierarchy varchar(18) NOT NULL,
        customer_name varchar NOT NULL,
        billing_quantity_in_base_unit numeric NOT NULL,
        billing_quantity_in_base_unit_sum numeric NOT NULL,
        percentage_sales numeric NOT NULL,
        forecast_qty numeric NOT NULL,
        forecast_uom varchar(8) NOT NULL,
        by_allocation numeric NOT NULL,
        brand_variant varchar NOT NULL,
        regional_brand varchar NOT NULL,
        grammage varchar NOT NULL,
        base_unit varchar(8) NOT NULL,
        weight_unit varchar(8) NOT NULL,
        forecast_month varchar(15) NOT NULL,
        created_on timestamptz NULL DEFAULT now(),
        CONSTRAINT sales_allocation_pkey PRIMARY KEY (key)
    );

    CREATE TABLE IF NOT EXISTS public.monthly_sales (
        key bigserial NOT NULL,
        sold_to_party varchar NOT NULL,
        asm_code varchar(6) NOT NULL,
        year_month varchar(6) NOT NULL,
        parent_sku varchar(18) NOT NULL,
        parent_desc varchar NOT NULL,
        product_hierarchy varchar(18) NOT NULL,
        customer_name varchar NOT NULL,
        billing_quantity_in_base_unit numeric NOT NULL,
        billing_quantity_in_base_unit_sum numeric NOT NULL,
        percentage_sales numeric NOT NULL,
        created_on timestamptz NULL DEFAULT now(),
        column1 int4 NULL,
        yearmonth int4 NULL,
        parent_sku_desc varchar(50) NULL,
        customername varchar(64) NULL,
        billingquantityinbaseunit float4 NULL,
        billingquantityinbaseunit_sum float4 NULL,
        CONSTRAINT monthly_sales_pkey PRIMARY KEY (key)
    );

    DROP TABLE IF EXISTS material_stock CASCADE;
    CREATE TABLE material_stock (
        key bigserial primary key,
        asm_code character varying(6) NOT NULL,
        sold_to_party character varying(8) NOT NULL,
        parent_sku character varying NOT NULL,
        cycle_stock numeric NOT NULL,
        safety_stock numeric NOT NULL,
        total_stock_norms_in_days integer NOT NULL,
        updated_on timestamptz DEFAULT NOW());
    
    DROP TABLE IF EXISTS forecast_distribution CASCADE;
    CREATE TABLE forecast_distribution(
        id bigserial primary key,
        distributor_code text not null,
        psku text NOT NULL,
        applicable_month text not null,
        pdp text not null,
        division character varying(6),
        _1 numeric,
        _2 numeric,
        _3 numeric,
        _4 numeric,
        _5 numeric,
        _6 numeric,
        _7 numeric,
        _8 numeric,
        _9 numeric,
        _10 numeric,
        _11 numeric,
        _12 numeric,
        _13 numeric,
        _14 numeric,
        _15 numeric,
        _16 numeric,
        _17 numeric,
        _18 numeric,
        _19 numeric,
        _20 numeric,
        _21 numeric,
        _22 numeric,
        _23 numeric,
        _24 numeric,
        _25 numeric,
        _26 numeric,
        _27 numeric,
        _28 numeric,
        _29 numeric,
        _30 numeric,
        _31 numeric,
        created_on timestamptz NOT NULL DEFAULT NOW(),
        updated_on timestamptz NOT NULL DEFAULT NOW() ,
        unique(distributor_code, psku ,applicable_month, pdp)
    );

    DROP TABLE IF EXISTS material_conversion CASCADE;
    CREATE TABLE material_conversion (
        parent_sku character varying PRIMARY KEY,
        base_to_case numeric,
        pac_to_base numeric);

    DROP TABLE IF EXISTS updated_sales_allocation CASCADE;
    CREATE TABLE IF NOT EXISTS updated_sales_allocation  (
        key bigserial NOT NULL PRIMARY KEY,
        updated_allocation numeric NOT NULL,
        updated_on timestamptz DEFAULT NOW(),
        updated_by character varying NOT NULL,
        sales_allocation_key bigint NOT NULL unique,
        CONSTRAINT fk_forecast_id
        FOREIGN KEY(sales_allocation_key) 
        REFERENCES sales_allocation(key));

    
    `)
};

exports.down = pgm => { };
