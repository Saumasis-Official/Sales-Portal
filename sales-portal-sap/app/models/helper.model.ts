import logger from '../lib/logger';
 const commonHelperModel = {

    tseHierarchyQuery(adminId: any) {
        try {
          return ` (WITH RECURSIVE hierarchy AS
              (SELECT user_id, first_name, last_name, email, mobile_number, code, manager_id 
                  FROM sales_hierarchy_details 
                  WHERE user_id = '${adminId}' 
                  AND deleted = false 
                  UNION 
                  SELECT s.user_id, s.first_name, s.last_name, s.email, s.mobile_number, s.code, s.manager_id 
                  FROM sales_hierarchy_details s 
                  INNER JOIN hierarchy h ON h.user_id = s.manager_id) 
                  SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) FROM hierarchy)`;
        } catch (error) {
          logger.error('Error in tseHierarchyQuery: ', error);
          return '';
        }
      },
      tseHierarchyQueryByCode(code: any) {
        try {
          return `
          (
            WITH RECURSIVE hierarchy AS 
            (
              SELECT user_id,first_name,last_name,email,mobile_number,code,manager_id 
              FROM sales_hierarchy_details WHERE STRING_TO_ARRAY(code,',') && ARRAY['${code}']  
              AND deleted = false 
              UNION 
              SELECT s.user_id, s.first_name, s.last_name, s.email, s.mobile_number, s.code, s.manager_id 
              FROM sales_hierarchy_details s 
              INNER JOIN hierarchy h ON s.manager_id = h.user_id 
              where s.deleted = 'false'
            ) 
            SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) FROM hierarchy 
          ) `
        } catch (error) {
          return '';
        }
      },
      tseUpperHierarchyQueryByCode(tseCode: any) {
        try {
          return `
          WITH RECURSIVE hierarchy AS 
          (SELECT user_id,first_name,last_name,email,mobile_number,code,manager_id,roles 
              FROM sales_hierarchy_details 
              WHERE STRING_TO_ARRAY(code, ',') && STRING_TO_ARRAY('${tseCode}', ',') 
              AND deleted = false 
              UNION 
              SELECT s.user_id, s.first_name, s.last_name, s.email, s.mobile_number, s.code, s.manager_id, s.roles 
              FROM sales_hierarchy_details s 
              INNER JOIN hierarchy h ON h.manager_id = s.user_id
              WHERE deleted = false) 
          SELECT *, roles::_varchar FROM hierarchy`
        } catch (error) {
          return '';
        }
      },
      asmHierarchyQuery(adminId: any) {
        try {
          return `
          (WITH RECURSIVE hierarchy AS
          (SELECT user_id, first_name, last_name, email, mobile_number, code, manager_id 
          FROM sales_hierarchy_details WHERE user_id = '${adminId}' 
          AND deleted = false ) SELECT DISTINCT UNNEST(STRING_TO_ARRAY(code, ',')) FROM hierarchy)
          `;
        } catch (error) {
          return '';
        }
      },
}

export default commonHelperModel;