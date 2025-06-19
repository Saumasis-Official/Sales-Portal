/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS credit.audit_trail ADD COLUMN IF NOT EXISTS sap_response jsonb NULL;
        ALTER TABLE IF EXISTS credit.gt_transactions
        ADD COLUMN IF NOT EXISTS requestor_remarks varchar(255),
        ADD COLUMN IF NOT EXISTS approvers_remarks jsonb DEFAULT '{"approver1_remarks": null, "approver2_remarks": null}';
    `);
};

exports.down = (pgm) => {
    pgm.sql(`
        ALTER TABLE IF EXISTS credit.audit_trail DROP COLUMN IF EXISTS sap_response;
         ALTER TABLE IF EXISTS credit.gt_transactions
        DROP COLUMN IF EXISTS requestor_remarks,
        DROP COLUMN IF EXISTS approvers_remarks
    `);
};
