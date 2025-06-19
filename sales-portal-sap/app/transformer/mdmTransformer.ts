export const mdmTransformer = {
    uploadMdmDataTransformer: (data) => {
        const invalidResult: any[] = [];
        const result: any[] = [];
        data?.forEach((d, index) => {
            const obj = {};
            obj['customer_name'] = d['Customer Name'];
            obj['customer_code'] = d['Customer Code'];
            obj['psku'] = d['PSKU'];
            obj['psku_desc'] = d['PSKU Description'];
            obj['sku'] = d['SKU'];
            obj['sku_desc'] = d['SKU Description'];
            obj['division'] = d['Division'];
            obj['article_id'] = d['Article ID']?.trim() || '';
            obj['article_desc'] = d['Article Description']?.trim() || '';
            obj['plant_code'] = d['Plant Code'];
            obj['site_code'] = d['Site Code'];

            if (mdmTransformer.validateNotEmptyFields(obj)) result.push({ id: index + 1, ...obj });
            else invalidResult.push({ __line__: index + 1, ...obj });
        });
        return invalidResult?.length > 0 ? { isInvalid: true, result: invalidResult } : { isInvalid: false, result };
    },

    validateNotEmptyFields: (data): boolean => {
        /**Return TRUE: when no error */
        return (
            data['article_id']?.toString()?.length > 0 &&
            data['article_desc']?.length > 0 &&
            !(
                isNaN(data['psku']) ||
                isNaN(data['sku']) ||
                isNaN(data['plant_code']) ||
                isNaN(data['customer_code']) ||
                data['psku'] == null ||
                data['sku'] == null ||
                data['plant_code'] == null ||
                data['customer_code'] == null
            )
        );
    },
    updateMDMDataTransformer: (data) => {
        return (data = data.map((item) => {
            let obj = {};
            obj['mrp'] = parseFloat(item.MRP);
            obj['psku'] = parseInt(item.SKU_Code);
            obj['primary_buying_uom'] = item.PRIMARYSALESUOM;
            obj['mrp_uom_buying'] = item.MRPUOM;
            obj['l1_pack'] = parseInt(item.L1PACK);
            obj['l1_pack_uom'] = item.L1PACKUOM;
            obj['l2_pack'] = parseFloat(item.L2PACK);
            obj['l2_pack_uom'] = item.L2PACKUOM;
            obj['l3_pack'] = parseInt(item.L3PACK);
            obj['l3_pack_uom'] = item.L3PACKUOM;
            obj['l4_pack'] = parseInt(item.L4PACK);
            obj['l4_pack_uom'] = item.L4PACKUOM;
            return obj;
        }));
    },
    updateHolidayTransformer: (data) => {
        const result: any[] = [];

        data?.forEach((d) => {
            const obj = {};
            obj['year'] = d['Fiscal_Year'];
            obj['state_code'] = d['state_Code'];
            obj['state_description'] = d['State_Description'];
            let date = new Date(d['Holiday_date']);
            obj['holiday_date'] = date
                .toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                })
                .replace(/\//g, '-');
            obj['plant'] = d['plant'];
            obj['plant_description'] = d['plant_description'];
            result.push(obj);
        });
        return JSON.stringify(result);
    },
};
