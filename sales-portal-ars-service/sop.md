# Standard Operating Procedure(SOP)
```
This file highlights the necessary steps to be taken for some specific tasks
```

# `Inclusion of new customer group for ARS`

## Update constants:
 * Update all `CUSTOMER_GROUP_FOR_ARS` constants with the new customer group
 * Confirm the sub-channel of the new customer group. Update the `SUB_CHANNEL_FOR_ARS` constant in the `sales-portal-ars-allocation-service`.
 * Update the value of `customerGroupList` in the `sales-portal-client` to include the new customer group.

## Migrations:
 * Add settings in the `ars_configuration` table for `SWITCH` and `TIMELINE` settings related to the new customer group.
 * Add the value of the new customer group in the `stock_norm_default` table.

## Functionality Check:
 * Check the functionality of ARS forecast, stock norm, SOQ norm, etc., to ensure they are working correctly with the new customer group.
 * Check ordering is working for the all the other customer groups as well.
 * Ensure the new customer group is visible in the Auto Closure, specifically in the Auto Closure GT tab.
 * Verify that the forecast configuration page CSS is not broken due to the addition of the new customer group.
