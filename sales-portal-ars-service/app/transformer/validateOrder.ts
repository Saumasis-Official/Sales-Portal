export const ValidateOrderTransformer = {
    transform(items) {
        return ValidateOrderTransformer._transformItems(items);
    },
    _transformItems(items) {
        if (Array.isArray(items)) {
            let output = [];
            items.forEach((item) => output.push(ValidateOrderTransformer._transformItemData(item)));
            return output;
        }
        else {
            let x = ValidateOrderTransformer._transformItemData(items);
            return x
        }
    },
    _transformItemData(item) {
        if (!item) { return {}; }
        const obj = {};
        let initial = (item.original_quantity != null) ? { original_quantity: item.original_quantity } : {};
        return Object.assign(initial, {
            "material_code": item.code,
            "item_number": item.item_number,
            "required_qty": item.quantity,
            "target_qty": item.quantity,
            "pack_type": item.pak_type,
            "sales_unit": item.sales_unit,
            "description": item.description,
            "sales_org": item.sales_org,
            "distribution_channel": item.distribution_channel,
            "division": item.division,
            "stock_in_hand": item.stock_in_hand,
            "stock_in_transit": item.stock_in_transit,
            "open_order": item.open_order
        }, obj);
    }
}

