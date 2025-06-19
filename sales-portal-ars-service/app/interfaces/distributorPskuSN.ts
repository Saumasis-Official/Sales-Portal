interface PskuData {
    stock_norm: string;
    safety_stock: string;
    pak_to_cs: string;
    buom_to_cs: string;
}

interface DistributorData {
    [psku: string]: PskuData;
}

export interface DistributorPskuSN {
    [distributor: string]: DistributorData;
}