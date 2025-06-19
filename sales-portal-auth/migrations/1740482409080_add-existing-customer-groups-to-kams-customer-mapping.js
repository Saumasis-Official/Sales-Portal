/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
  pgm.sql(`
    WITH distinct_payer_codes AS (
        SELECT DISTINCT
            kcm.user_id,
            payer_code_element ->> 'payer_code' AS payer_code
        FROM
            kams_customer_mapping kcm,
            UNNEST(kcm.payer_code) AS payer_code_json,
            jsonb_array_elements(payer_code_json) AS payer_code_element
    ),
    aggregated_customer_groups AS (
        SELECT 
            dpc.user_id,
            ARRAY_AGG(DISTINCT mepcm.customer_group) AS customer_groups
        FROM 
            mt_ecom_payer_code_mapping mepcm
        INNER JOIN 
            distinct_payer_codes dpc ON mepcm.payer_code = dpc.payer_code
        GROUP BY 
            dpc.user_id
    )
    UPDATE kams_customer_mapping kcm
    SET customer_group = acg.customer_groups
    FROM aggregated_customer_groups acg
    WHERE kcm.user_id = acg.user_id;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    UPDATE kams_customer_mapping
    SET customer_group = NULL;
  `);
};
