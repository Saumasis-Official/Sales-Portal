let CreateOrderTransformer = {
    transform: (items) => {
        return CreateOrderTransformer._transformItems(items);
    },
    _transformItems: (items) => {
        if (Array.isArray(items)) {
            let output = [];
            items.forEach((item) => {
                output.push(CreateOrderTransformer._transformItemData(item));
            });
            return output;
        }
        else {
            return CreateOrderTransformer._transformItemData(items);
        }
    },
    _transformItemData: (item) => {
        if (!item) { return {}; }
        const obj = {};
        return Object.assign({}, {
            "item_number": item.item_number,
            "material_code": item.code,
            "required_qty": item.quantity,
            "sales_unit": item.sales_unit,
            "sales_org": item.sales_org,
            "distribution_channel": item.distribution_channel,
            "division": item.division
        }, obj);
    }
}

export default CreateOrderTransformer;
