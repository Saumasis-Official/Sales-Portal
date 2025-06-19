/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS audit.auto_closure_mt_ecom_so_audit DROP CONSTRAINT IF EXISTS auto_closure_mt_ecom_so_audit_rule_id_fkey;
        DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'auto_closure_mt_ecom_so_audit_auto_closure_mt_ecom_config_fk'
          AND table_schema = 'audit'
          AND table_name = 'auto_closure_mt_ecom_so_audit'
    ) THEN
        ALTER TABLE IF EXISTS audit.auto_closure_mt_ecom_so_audit
        ADD CONSTRAINT auto_closure_mt_ecom_so_audit_auto_closure_mt_ecom_config_fk
        FOREIGN KEY (rule_id)
        REFERENCES public.auto_closure_mt_ecom_config(id);
    END IF;
END
$$;
        `);
};

exports.down = (pgm) => {};
