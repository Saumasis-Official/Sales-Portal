export interface ArsSuggestedMaterials {
    productCode: string;
    qty: string;
    pskuClass: string;
    sn_days: string | null;
    soq_norm_qty: string | null;
    sih?: number | null;
    sit?: number | null;
    oo?: number | null;
}