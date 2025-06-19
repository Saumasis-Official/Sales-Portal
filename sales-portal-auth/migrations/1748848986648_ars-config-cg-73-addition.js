/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.up = (pgm) => {
    pgm.sql(`
        -- Query to upsert TIMELINE configuration for customer group 73
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
            cgm.name in ('73')
        ON CONFLICT ON CONSTRAINT ars_configurations_unique DO NOTHING;

        -- Query to upsert SWITCH configuration for customer group 73
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
            cgm.name in ('73')
        ON CONFLICT ON CONSTRAINT ars_configurations_unique DO NOTHING;
    `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
exports.down = (pgm) => {};
