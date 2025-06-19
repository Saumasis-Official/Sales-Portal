interface ItemsForValidation {
    material_code: string;
    item_number: string;
    target_qty: string;
    required_qty: string;
    sales_org: string;
    distribution_channel: string;
    division: string;
}

const itemsForValidationObj: ItemsForValidation = {
    distribution_channel: '',
    division: '',
    item_number: '',
    material_code: '',
    required_qty: '',
    sales_org: '',
    target_qty: '',
};

export { ItemsForValidation, itemsForValidationObj };
