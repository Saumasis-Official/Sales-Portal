/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        -- Query to upsert TIMELINE configuration for customer group 62, 63, 69, and 70
        INSERT
            INTO
            ars_configurations (
                CONFIGURATION,
                customer_group_id,
                enable_adjustment,
                allowed_values,
                field_type,
                start_date,
                end_date
            )
        SELECT DISTINCT
            'TIMELINE'::ars_configuration_type,
            CGM.ID,
            FALSE,
            '{"1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30","31"}'::TEXT[],
            'SET'::app_config_field_type,
            1,
            31
        FROM
            customer_group_master cgm
        WHERE
            cgm.name in ('62','63','69','70')
        ON CONFLICT ON CONSTRAINT ars_configurations_unique DO NOTHING;

        -- Query to upsert SWITCH configuration for customer group 62, 63, 69, and 70
        INSERT
            INTO
            ars_configurations (
                CONFIGURATION,
                region_id,
                customer_group_id,
                auto_order,
                auto_order_submit,
                field_type
            )
        SELECT
            DISTINCT 
            'SWITCH'::ars_configuration_type,
            dm.group5_id,
            dm.group_id,
            TRUE,
            FALSE,
            'SET'::app_config_field_type
        FROM
            distributor_master dm
        INNER JOIN customer_group_master cgm ON
            cgm.id = dm.group_id
        WHERE
            cgm.name in ('62','63','69','70')
        ON
            CONFLICT ON
            CONSTRAINT ars_configurations_unique DO NOTHING;

        -- Query to upsert default stock norm
        INSERT
            INTO
            public.stock_norm_default
        (
                customer_group_id,
                class_a_sn,
                class_a_ss_percent,
                class_b_sn,
                class_b_ss_percent,
                class_c_sn,
                class_c_ss_percent
            )
        SELECT
            cgm.id,
            10,
            50,
            12,
            50,
            15,
            50
        FROM
        customer_group_master cgm 
        ON
            CONFLICT (customer_group_id)
        DO NOTHING;
        `);
};

exports.down = (pgm) => {
    pgm.sql(`
        DELETE FROM ars_configurations WHERE customer_group_id in (SELECT id FROM customer_group_master WHERE name in ('62', '63', '69', '70'));
        DELETE FROM stock_norm_default WHERE customer_group_id in (SELECT id FROM customer_group_master WHERE name in ('62', '63', '69', '70'));
    `);
};
