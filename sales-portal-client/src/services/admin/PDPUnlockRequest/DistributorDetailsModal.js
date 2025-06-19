import React, { useState, useEffect } from 'react';
import { Modal, Select } from 'antd';
import './DistributorDetailsModal.css';

const DistributorDetailsModal = (props) => {
    const { isModalVisible, hideModal, reqData, reqDetails, width, height } = props;

    const [tableData, setTableData] = useState([]);
    const [regions, setRegions] = useState([]);
    const [areas, setAreas] = useState([]);
    const [distributorNames, setDistributorNames] = useState([]);
    const [distributorCodes, setDistributorCodes] = useState([]);
    const [plantCodes, setPlantCodes] = useState([]);
    const [selectedRegions, setSelectedRegions] = useState([]);
    const [selectedAreas, setSelectedAreas] = useState([]);
    const [selectedDistributorNames, setSelectedDistributorNames] = useState([]);
    const [selectedDistributorCodes, setSelectedDistributorCodes] = useState([]);
    const [selectedPlantCodes, setSelectedPlantCodes] = useState([]);

    const setOptions = (data) => {
        const regionSet = new Set();
        const areaSet = new Set();
        const distributorNameSet = new Set();
        const distributorCodeSet = new Set();
        const plantCodeSet = new Set();
        data?.forEach((item) => {
            regionSet.add(item.region);
            areaSet.add(item.area_code);
            distributorNameSet.add(item.distributor_name);
            distributorCodeSet.add(item.distributor_id);
            plantCodeSet.add(item.plant);
        });

        if (!selectedRegions || selectedRegions.length === 0) setRegions(Array.from(regionSet));
        if (!selectedAreas || selectedAreas.length === 0) setAreas(Array.from(areaSet));
        if (!selectedDistributorNames || selectedDistributorNames.length === 0) setDistributorNames(Array.from(distributorNameSet));
        if (!selectedDistributorCodes || selectedDistributorCodes.length === 0) setDistributorCodes(Array.from(distributorCodeSet));
        if (!selectedPlantCodes || selectedPlantCodes.length === 0) setPlantCodes(Array.from(plantCodeSet));
    };

    useEffect(() => {
        const plantCodes = new Set(reqDetails?.plant_codes || []);
        let filteredData = reqData;
        if (plantCodes.size > 0) {
            filteredData = filteredData.filter((item) => {
                return plantCodes.has(item.plant);
            });
        } else {
            const idSet = new Set();
            filteredData = filteredData.filter((item) => {
                if (idSet.has(item.distributor_id)) return false;
                idSet.add(item.distributor_id);
                return true;
            });
        }
        setTableData(filteredData);
        setSelectedRegions([]);
        setSelectedAreas([]);
        setSelectedDistributorNames([]);
        setSelectedDistributorCodes([]);
        setSelectedPlantCodes([]);
        setOptions(reqData);
    }, [reqData]);

    useEffect(() => {
        const plantCodes = new Set(reqDetails?.plant_codes || []);
        const idSet = new Set();
        const filteredData = reqData.filter((item) => {
            return (
                (plantCodes.size === 0 || plantCodes.has(item.plant)) &&
                (idSet.has(item.distributor_id) ? false : idSet.add(item.distributor_id)) &&
                (selectedRegions.length === 0 || selectedRegions.includes(item.region)) &&
                (selectedAreas.length === 0 || selectedAreas.includes(item.area_code)) &&
                (selectedDistributorNames.length === 0 || selectedDistributorNames.includes(item.distributor_name)) &&
                (selectedDistributorCodes.length === 0 || selectedDistributorCodes.includes(item.distributor_id)) &&
                (selectedPlantCodes.length === 0 || selectedPlantCodes.includes(item.plant))
            );
        });

        setOptions(filteredData);
        setTableData(filteredData);
    }, [selectedRegions, selectedAreas, selectedDistributorNames, selectedDistributorCodes, selectedPlantCodes]);

    // let modalHeight = 350;
    // if (height > 1000) {
    //   modalHeight = 700;
    // }else if (height > 800) {
    //   modalHeight = 500;
    // }else{
    //   modalHeight = 350;
    // }
    const tableCellStyle = {
        padding: width > 767 ? '9px 14px' : '3px 5px',
    };

    const onClose = () => {
        hideModal();
    };

    return (
        <div className="pdp-db-container">
            <Modal
                className="pdp-db-details-modal"
                title="Distributor Details"
                visible={!!isModalVisible}
                onCancel={onClose}
                footer={null}
                width={800}
                bodyStyle={{ padding: '10px' }}
                style={{ position: 'sticky', bottom: 10 }}>
                <div className="distributor-table-header" style={{ maxHeight: '70vh' }}>
                    <div>
                        <b>Request Comments: </b>
                        {reqDetails?.comments || '-'}
                    </div>
                    <table style={{ fontSize: width > 767 ? '14px' : '12px' }}>
                        <thead style={{ position: 'sticky', top: '0' }}>
                            <tr>
                                <th style={tableCellStyle}>
                                    <div className="db-details-filter">
                                        <Select
                                            showSearch
                                            mode="multiple"
                                            maxTagCount={0}
                                            placeholder="Regions"
                                            value={selectedRegions}
                                            optionFilterProp="children"
                                            allowClear={regions?.length > 0}
                                            onChange={(value) => setSelectedRegions(value)}
                                            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                            options={regions.map((item) => {
                                                return { value: item, label: item };
                                            })}
                                        />
                                    </div>
                                </th>
                                <th style={tableCellStyle}>
                                    <div className="db-details-filter">
                                        <Select
                                            showSearch
                                            mode="multiple"
                                            maxTagCount={0}
                                            placeholder="Areas"
                                            value={selectedAreas}
                                            optionFilterProp="children"
                                            allowClear={areas?.length > 0}
                                            onChange={(value) => setSelectedAreas(value)}
                                            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                            options={areas.map((item) => {
                                                return { value: item, label: item };
                                            })}
                                        />
                                    </div>
                                </th>
                                <th style={tableCellStyle}>
                                    <div className="db-details-filter">
                                        <Select
                                            showSearch
                                            mode="multiple"
                                            maxTagCount={0}
                                            placeholder="Distributor Names"
                                            value={selectedDistributorNames}
                                            optionFilterProp="children"
                                            allowClear={distributorNames?.length > 0}
                                            onChange={(value) => setSelectedDistributorNames(value)}
                                            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                            options={distributorNames.map((item) => {
                                                return { value: item, label: item };
                                            })}
                                        />
                                    </div>
                                </th>
                                <th style={tableCellStyle}>
                                    <div className="db-details-filter">
                                        <Select
                                            showSearch
                                            mode="multiple"
                                            maxTagCount={0}
                                            placeholder="Distributor Codes"
                                            value={selectedDistributorCodes}
                                            optionFilterProp="children"
                                            allowClear={distributorCodes?.length > 0}
                                            onChange={(value) => setSelectedDistributorCodes(value)}
                                            filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                            options={distributorCodes.map((item) => {
                                                return { value: item, label: item };
                                            })}
                                        />
                                    </div>
                                </th>
                                {reqDetails?.plant_codes?.length ? (
                                    <th style={tableCellStyle}>
                                        <div className="db-details-filter">
                                            <Select
                                                showSearch
                                                mode="multiple"
                                                maxTagCount={0}
                                                placeholder="Plant Codes"
                                                value={selectedPlantCodes}
                                                optionFilterProp="children"
                                                allowClear={plantCodes?.length > 0}
                                                onChange={(value) => setSelectedPlantCodes(value)}
                                                filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                                options={plantCodes.map((item) => {
                                                    return { value: item, label: item };
                                                })}
                                            />
                                        </div>
                                    </th>
                                ) : (
                                    <></>
                                )}
                            </tr>
                            <tr>
                                <th style={tableCellStyle}>Region</th>
                                <th style={tableCellStyle}>Area</th>
                                <th style={tableCellStyle}>Distributor Name</th>
                                <th style={tableCellStyle}>Distributor Code</th>
                                {reqDetails?.plant_codes?.length ? <th style={tableCellStyle}>Plant Code</th> : <></>}
                            </tr>
                        </thead>
                        <tbody>
                            {tableData.map((item, index) => (
                                <tr key={index}>
                                    <td style={tableCellStyle}>{item.region ? item.region : ''}</td>
                                    <td style={tableCellStyle}>{item.area_code ? item.area_code : ''}</td>
                                    <td style={tableCellStyle}>{item.distributor_name ? item.distributor_name : ''}</td>
                                    <td style={tableCellStyle}>{item.distributor_id ? item.distributor_id : ''}</td>
                                    {reqDetails?.plant_codes?.length ? <td style={tableCellStyle}>{item.plant}</td> : <></>}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Modal>
        </div>
    );
};
export default DistributorDetailsModal;
