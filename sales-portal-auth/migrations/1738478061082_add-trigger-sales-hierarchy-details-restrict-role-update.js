/* eslint-disable camelcase */

exports.shorthands = undefined;

exports.up = pgm => {
    pgm.sql(`
        CREATE OR REPLACE FUNCTION public.restrict_role_update()
        RETURNS trigger
        LANGUAGE plpgsql
        AS $function$
        DECLARE 
            restricted_roles public.roles_type[] := ARRAY['SUPER_ADMIN'];
            ADMIN_ROLES public.roles_type[] := ARRAY['SUPER_ADMIN', 'SUPPORT', 'PORTAL_OPERATIONS', 'MDM'];
            SALES public.roles_type[] := ARRAY['VP', 'CLUSTER_MANAGER', 'DIST_ADMIN', 'RSM', 'ASM', 'TSE', 'SHOPPER_MARKETING', 'OPERATIONS', 'CALL_CENTRE_OPERATIONS'];
            PAN_INDIA_SALES public.roles_type[] := ARRAY['VP', 'SHOPPER_MARKETING', 'CALL_CENTRE_OPERATIONS'];
            LOGISTICS public.roles_type[] := ARRAY['CFA', 'LOGISTIC_OFFICER', 'ZONAL_OFFICER'];
            MT_ECOM public.roles_type[] := ARRAY['MDM', 'KAMS', 'NKAMS'];
            FINANCE public.roles_type[] := ARRAY['FINANCE', 'FINANCE_CONTROLLER'];
            SHOPIFY public.roles_type[] := ARRAY['SHOPIFY_UK', 'SHOPIFY_SUPPORT', 'SHOPIFY_OBSERVER'];
            CREDIT_LIMIT public.roles_type[] := ARRAY['APPROVER(PRIMARY)', 'APPROVER(SECONDARY)'];
        BEGIN
            -- Check if restricted role is combined with other roles
            IF EXISTS (SELECT 1 FROM unnest(NEW.roles) AS role WHERE role = ANY(restricted_roles)) AND array_length(NEW.roles, 1) > 1 THEN
                RAISE EXCEPTION 'Cannot add more roles along with %', restricted_roles;
            END IF;

            -- Check if more than one role from ADMIN is assigned
            IF (SELECT COUNT(*) FROM unnest(NEW.roles) AS role WHERE role = ANY(ADMIN_ROLES)) > 1 THEN
                RAISE EXCEPTION 'Cannot have more than 1 role from ADMIN, having : %', NEW.roles;
            END IF;

            -- Check if more than one role from SALES is assigned
            IF (SELECT COUNT(*) FROM unnest(NEW.roles) AS role WHERE role = ANY(SALES)) > 1 THEN
                RAISE EXCEPTION 'Cannot have more than 1 role from SALES, having : %', NEW.roles;
            END IF;

            -- Check if more than one role from PAN_INDIA_SALES is assigned
            IF (SELECT COUNT(*) FROM unnest(NEW.roles) AS role WHERE role = ANY(PAN_INDIA_SALES)) > 1 THEN
                RAISE EXCEPTION 'Cannot have more than 1 role from PAN_INDIA_SALES, having : %', NEW.roles;
            END IF;

            -- Check if more than one role from LOGISTICS is assigned
            IF (SELECT COUNT(*) FROM unnest(NEW.roles) AS role WHERE role = ANY(LOGISTICS)) > 1 THEN
                RAISE EXCEPTION 'Cannot have more than 1 role from LOGISTICS, having : %', NEW.roles;
            END IF;

            -- Check if more than one role from MT_ECOM is assigned
            IF (SELECT COUNT(*) FROM unnest(NEW.roles) AS role WHERE role = ANY(MT_ECOM)) > 1 THEN
                RAISE EXCEPTION 'Cannot have more than 1 role from MT_ECOM, having : %', NEW.roles;
            END IF;

            -- Check if more than one role from FINANCE is assigned
            IF (SELECT COUNT(*) FROM unnest(NEW.roles) AS role WHERE role = ANY(FINANCE)) > 1 THEN
                RAISE EXCEPTION 'Cannot have more than 1 role from FINANCE, having : %', NEW.roles;
            END IF;

            -- Check if more than one role from SHOPIFY is assigned
            IF (SELECT COUNT(*) FROM unnest(NEW.roles) AS role WHERE role = ANY(SHOPIFY)) > 1 THEN
                RAISE EXCEPTION 'Cannot have more than 1 role from SHOPIFY, having : %', NEW.roles;
            END IF;

            -- Check if more than one role from CREDIT_LIMIT is assigned
            IF (SELECT COUNT(*) FROM unnest(NEW.roles) AS role WHERE role = ANY(CREDIT_LIMIT)) > 1 THEN
                RAISE EXCEPTION 'Cannot have more than 1 role from CREDIT_LIMIT, having : %', NEW.roles;
            END IF;

            RETURN NEW;
        END;
        $function$;
        ;
        DROP TRIGGER IF EXISTS restrict_role_update_trigger ON public.sales_hierarchy_details;
        CREATE TRIGGER restrict_role_update_trigger
        BEFORE UPDATE OF roles ON public.sales_hierarchy_details
        FOR EACH ROW
        EXECUTE FUNCTION restrict_role_update();
    `)
};

exports.down = pgm => {};
