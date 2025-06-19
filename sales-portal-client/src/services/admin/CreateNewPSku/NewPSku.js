import React, { useEffect, useState, useRef } from 'react';
import { Modal, Select, notification } from 'antd';
import './NewPSku.css';
import _, { debounce, set, uniqBy } from 'lodash';

let NewPSku = (props) => {
    const { getMdmData, kams } = props;
    const { Option } = Select;
    const [type, setType] = useState('');
    const [selectedPSKU, setSelectedPSKU] = useState();
    const [selectedPSKUDesc, setSelectedPSKUDesc] = useState('');
    const [selectedSKU, setSelectedSKU] = useState([]);
    const [selectedSKUDesc, setSelectedSKUDesc] = useState('');
    const [division, setDivision] = useState('');
    const [selectedCustomerProductID, setSelectedCustomerProductID] = useState('');
    const [selectedCustomerDCCode, setSelectedCustomerDCCode] = useState('');
    const [selectedProductDesc, setSelectedProductDesc] = useState('');
    const [selectedCustomerCode, setSelectedCustomerCode] = useState('');
    const [selectedPlantCode, setSelectedPlantCode] = useState('');
    const [selectedVendorCode, setSelectedVendorCode] = useState('');
    const [priority, setPriority] = useState(1);
    const [headerFilter, setHeaderFilter] = useState({});
    const [sku, setSku] = useState();
    const debouncedSearch = useRef(debounce((nextValue) => setHeaderFilter(nextValue), 500)).current;
    const mdmData = useRef();
    const [enableSearch, setEnableSearch] = useState({ pskusearch: false, skuSearch: false, articleSearch: false });
    const [editedData, setEditedData] = useState({
        article_id: props.data?.article_id,
        site_code: props.data?.site_code,
        article_desc: props.data?.article_desc,
        customer_code: props.data?.customer_code,
        plant_code: props.data?.plant_code,
        vendor_code: props.data?.vendor_code,
        priority: props.data?.priority,
    });

    const handleCancel = () => {
        setHeaderFilter({});
        setSelectedPSKU('');
        setSku();
        setSelectedSKU([]);
        setSelectedPSKUDesc();
        setSelectedSKUDesc();
        setSelectedCustomerProductID('');
        setSelectedProductDesc('');
        setSelectedPlantCode('');
        setSelectedVendorCode('');
        setSelectedCustomerCode('');
        setSelectedCustomerDCCode('');
        setDivision('');
        setEditedData({
            article_id: props.data?.article_id,
            site_code: props.data?.site_code,
            article_desc: props.data?.article_desc,
            customer_code: props.data?.customer_code,
            plant_code: props.data?.plant_code,
            vendor_code: props.data?.vendor_code,
            priority: props.data?.priority,
        });
        props.onCancel();
    };
    let mdmPayload = {
        offset: '',
        limit: 100,
        kams: 'Reliance',
        customerCode: [],
        siteCode: [],
        depotCode: [],
        region: [],
        vendorCode: [],
        status: [],
        headerFilter: headerFilter || {},
        article_code: '',
        article_desc: '',
    };
    const handleCreateRequest = async () => {
        let requestData = {
            psku: parseInt(selectedPSKU),
            psku_desc: selectedPSKUDesc,
            sku: parseInt(selectedSKU[0]?.name),
            sku_desc: selectedSKUDesc,
            division: division,
            article_id: selectedCustomerProductID,
            article_desc: selectedProductDesc,
            plant_code: parseInt(selectedPlantCode),
            site_code: selectedCustomerDCCode,
            customer_code: parseInt(selectedCustomerCode),
            vendor_code: selectedVendorCode,
            type: props.type,
            priority: parseInt(priority),
            customer_name: kams,
        };
        props.onSave(requestData);
        handleCancel();
    };
    const unMap = async () => {
        let requestData = {
            psku: parseInt(props.data.psku),
            sku: parseInt(props.data.sku),
            region: props.data.region,
            plant_code: parseInt(props.data.plant_code),
            site_code: props.data.site_code,
            customer_name: props.data.customer_name,
            customer_code: parseInt(props.data.customer_code),
            vendor_code: props.data.vendor_code,
            type: props.type,
            priority: parseInt(props.data.priority),
        };
        await props.onSave(requestData);
        handleCancel();
    };
    const EditRequest = async () => {
        let requestData = [
            {
                article_id: editedData.article_id,
                article_desc: editedData.article_desc,
                plant_code: parseInt(editedData.plant_code),
                site_code: editedData.site_code,
                customer_code: parseInt(editedData.customer_code),
                vendor_code: editedData.vendor_code,
                type: 'EDIT',
                priority: parseInt(editedData.priority),
            },
            {
                psku: parseInt(props.data.psku),
                sku: parseInt(props.data.sku),
                region: props.data.region,
                article_id: props.data.article_id,
                article_desc: props.data.article_desc,
                plant_code: parseInt(props.data.plant_code),
                site_code: props.data.site_code,
                customer_code: parseInt(props.data.customer_code),
                customer_name: props.data.customer_name,
                vendor_code: props.data.vendor_code,
                type: 'EDIT',
                priority: parseInt(props.data.priority),
            },
        ];
        const result = await props.onSave(requestData);
        handleCancel();
    };
    const handlePSKUChange = async (e) => {
        let { value } = e.target;
        const headerTemp = _.cloneDeep(headerFilter);
        headerTemp['pskusearch'] = value;
        setSelectedPSKU(e.target.value);
        debouncedSearch(headerTemp);
        setSku();
        setSelectedPSKUDesc('');
    };
    const editedChange = (fieldName, value) => {
        setEditedData((prevValues) => ({
            ...prevValues,
            [fieldName]: value,
        }));
    };
    async function fetchData() {
        let data = await getMdmData(mdmPayload);
        mdmData.current = data;
        let sku1 = data?.data?.rows?.filter((e) => {
            return e.sku;
        });
        sku1 = uniqBy(sku1, 'sku');
        setSelectedSKU(() =>
            sku1.map((o) => {
                return { id: o.id, name: o.sku };
            }),
        );
        setSelectedPSKUDesc(data?.data?.rows?.find((i) => i.psku == selectedPSKU) ? data?.data?.rows[0].psku_desc : '');
        setSelectedSKUDesc(sku ? data?.data?.rows[0].sku_desc : '');
    }
    useEffect(() => {
        fetchData();
    }, [headerFilter]);
    useEffect(() => {
        setSelectedSKUDesc(sku ? mdmData.current?.data?.rows?.find((i) => i.id == sku)?.sku_desc : '');
    }, [sku]);
    useEffect(() => {
        let customerCode = mdmData.current?.data?.site_code?.find((i) => i.site_code === selectedCustomerDCCode)?.customer_code;
        setSelectedCustomerCode(customerCode ? customerCode : '');
    }, [selectedCustomerDCCode]);

    useEffect(() => {
        setEditedData({
            article_id: props.data?.article_id,
            site_code: props.data?.site_code,
            article_desc: props.data?.article_desc,
            customer_code: props.data?.customer_code,
            plant_code: props.data?.plant_code,
            vendor_code: props.data?.vendor_code,
            priority: props.data?.priority,
        });
    }, [props.data]);

    return (
        <>
            <Modal title="Add New Product Data" visible={props.visible} onCancel={handleCancel} footer={null} wrapClassName="comment-modal" width={700}>
                <form>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b>
                        <span className="title-fld">TCPL Parent SKU</span>
                        <input
                            type="number"
                            className="form-ctrl"
                            placeholder="Enter TCPL Parent SKU"
                            disabled={props.type == 'UNMAP' ? true : false}
                            style={
                                props.type == 'UNMAP'
                                    ? { cursor: 'not-allowed', backgroundColor: 'rgb(212 212 212 / 41%)', color: 'gray' }
                                    : { cursor: 'text', backgroundColor: 'white' }
                            }
                            value={props.type == 'UNMAP' ? props.data.psku : selectedPSKU}
                            onChange={(e) => {
                                handlePSKUChange(e);
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b>
                        <span className="title-fld">TCPL Parent SKU Desc</span>
                        <input
                            type="text"
                            className="form-ctrl"
                            disabled
                            style={{ cursor: 'not-allowed', backgroundColor: 'rgb(212 212 212 / 41%)', color: 'gray' }}
                            placeholder="Enter Parent SKU Desc"
                            value={props.type == 'UNMAP' ? props.data.psku_desc : selectedPSKUDesc}
                        />
                    </div>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b>
                        <span className="title-fld">TCPL System SKU</span>
                        <Select
                            placeholder="Select TCPL System SKU"
                            style={
                                props.type == 'UNMAP'
                                    ? { cursor: 'not-allowed', backgroundColor: 'rgb(212 212 212 / 41%)', width: '100%' }
                                    : { cursor: 'text', backgroundColor: 'white', fontWeight: 400, width: '100%' }
                            }
                            options={selectedSKU.map((c) => ({ value: c.id, label: c.name }))}
                            disabled={props.type == 'UNMAP' ? true : false}
                            value={props.type == 'UNMAP' ? props.data.sku : sku}
                            defaultValue={'Select TCPL System SKU'}
                            onChange={(value) => setSku(value)}
                        />
                    </div>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b>
                        <span className="title-fld">TCPL System SKU Desc</span>
                        <input
                            type="text"
                            className="form-ctrl"
                            style={{ cursor: 'not-allowed', backgroundColor: 'rgb(212 212 212 / 41%)', color: 'gray' }}
                            placeholder="Enter TCPL System SKU Desc"
                            value={props.type == 'UNMAP' ? props.data.sku_desc : selectedSKUDesc}
                        />
                    </div>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b>
                        <span className="title-fld">Division</span>
                        <input
                            type="text"
                            className="form-ctrl"
                            style={
                                props.type == 'UNMAP'
                                    ? { cursor: 'not-allowed', backgroundColor: 'rgb(212 212 212 / 41%)', color: 'gray' }
                                    : { cursor: 'text', backgroundColor: 'white' }
                            }
                            placeholder="Enter Division"
                            value={props.type == 'UNMAP' ? props.data.division : division}
                            onChange={(e) => {
                                setDivision(e.target.value);
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b>
                        <span className="title-fld">Customer Product ID</span>
                        <input
                            type="text"
                            className="form-ctrl"
                            placeholder="Enter Customer Product ID"
                            value={props.type == 'UNMAP' ? editedData.article_id : selectedCustomerProductID}
                            onChange={(e) => {
                                props.type == 'UNMAP' ? editedChange('article_id', e.target.value) : setSelectedCustomerProductID(e.target.value);
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b> <span className="title-fld">Customer DC Code</span>
                        <input
                            type="text"
                            className="form-ctrl"
                            placeholder="Enter Customer DC Code"
                            value={props.type == 'UNMAP' ? editedData.site_code : selectedCustomerDCCode}
                            onChange={(e) => {
                                props.type == 'UNMAP' ? editedChange('site_code', e.target.value) : setSelectedCustomerDCCode(e.target.value);
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b>
                        <span className="title-fld">Customer Product Desc</span>
                        <input
                            type="text"
                            className="form-ctrl"
                            placeholder="Enter Customer Product Desc"
                            value={props.type == 'UNMAP' ? editedData.article_desc : selectedProductDesc}
                            onChange={(e) => {
                                props.type == 'UNMAP' ? editedChange('article_desc', e.target.value) : setSelectedProductDesc(e.target.value);
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b>
                        <span className="title-fld">TCPL Customer Code</span>
                        <input
                            type="number"
                            className="form-ctrl"
                            placeholder="Enter TCPL Customer Code"
                            value={props.type == 'UNMAP' ? editedData.customer_code : selectedCustomerCode}
                            onChange={(e) => {
                                props.type == 'UNMAP' ? editedChange('customer_code', e.target.value) : setSelectedCustomerCode(e.target.value);
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b>
                        <span className="title-fld">TCPL Plant Code</span>
                        <input
                            type="number"
                            className="form-ctrl"
                            placeholder="Enter TCPL Plant Code"
                            value={props.type == 'UNMAP' ? editedData.plant_code : selectedPlantCode}
                            onChange={(e) => {
                                props.type == 'UNMAP' ? editedChange('plant_code', e.target.value) : setSelectedPlantCode(e.target.value);
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b>
                        <span className="title-fld">Vendor Code</span>
                        <input
                            type="text"
                            className="form-ctrl"
                            placeholder="Enter Vendor Code"
                            value={props.type == 'UNMAP' ? editedData.vendor_code : selectedVendorCode}
                            onChange={(e) => {
                                props.type == 'UNMAP' ? editedChange('vendor_code', e.target.value) : setSelectedVendorCode(e.target.value);
                            }}
                        />
                    </div>
                    <div className="form-group">
                        <b className="mandatory-mark">* </b>
                        <span className="title-fld">Priority</span>
                        <input
                            type="number"
                            className="form-ctrl"
                            placeholder="Enter Priority"
                            value={props.type == 'UNMAP' ? editedData.priority : priority}
                            onChange={(e) => {
                                props.type == 'UNMAP' ? editedChange('priority', e.target.value) : setPriority(e.target.value);
                            }}
                            onKeyPress={(e) => {
                                if (!/[0-9]/.test(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                            onWheel={(e) => {
                                e.target.blur();
                            }}
                        />
                    </div>
                    <div className="btn">
                        {props.type == 'ADD' && (
                            <button
                                type="button"
                                className="sbmt-btns"
                                disabled={
                                    !selectedPSKU ||
                                    !sku ||
                                    !selectedCustomerProductID ||
                                    !selectedCustomerDCCode ||
                                    !selectedProductDesc ||
                                    !selectedCustomerCode ||
                                    !selectedPlantCode ||
                                    !selectedVendorCode ||
                                    !priority
                                }
                                onClick={handleCreateRequest}>
                                Submit
                            </button>
                        )}
                    </div>
                    {props.type == 'UNMAP' && (
                        <div className="btn">
                            <button type="button" className="sbmt-btns" onClick={EditRequest}>
                                Submit
                            </button>
                            <button type="button" className="confirmation-button proceed-btn" onClick={unMap}>
                                Delete
                            </button>
                        </div>
                    )}
                </form>
            </Modal>
        </>
    );
};

export default NewPSku;
