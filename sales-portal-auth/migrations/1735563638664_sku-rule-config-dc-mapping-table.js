/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
            CREATE TABLE IF NOT EXISTS public.sku_rule_config_dist_channels_mapping (
                rule_config_id int8 NOT NULL,
                distribution_channel int4 NOT NULL,
                CONSTRAINT sku_rule_config_dist_channels_mapping_pk PRIMARY KEY (rule_config_id,distribution_channel),
                CONSTRAINT sku_rule_config_dist_channels_mapping_fk FOREIGN KEY (rule_config_id) 
                    REFERENCES public.sku_rule_configurations(id) ON DELETE CASCADE ON UPDATE RESTRICT
                );
            
            INSERT INTO public.sku_rule_config_dist_channels_mapping(rule_config_id, distribution_channel)
                SELECT id AS rule_config_id, dcs.dist_channel AS distribution_channel
                FROM sku_rule_configurations src 
                CROSS JOIN (SELECT UNNEST(ARRAY[10,40]) AS dist_channel) AS dcs
            ON CONFLICT DO NOTHING;

        `);
};

exports.down = pgm => {
    pgm.sql(`
            DROP TABLE IF EXISTS public.sku_rule_config_dist_channels_mapping;
    `);
};
