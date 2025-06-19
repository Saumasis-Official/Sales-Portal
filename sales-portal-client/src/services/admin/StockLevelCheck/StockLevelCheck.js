import './StockLevelCheck.css';
import { connect } from 'react-redux'
import React, { useEffect, useState } from "react";
import * as Actions from '../actions/adminAction';
import Util from '../../../util/helper';
import { Select, notification, Collapse, Table, Button } from 'antd';
import Loader from '../../../components/Loader';
import { NO_DATA_SYMBOL} from '../../../constants';
import ArsSimulation from './ArsSimulation';
import AosAuditReport from './AosAuditReport';

const { Panel } = Collapse;
const StockLevelCheck = props => {
    const { getStockSyncTime, fetchSkuStockData } = props;

    // variable and useState declarations
    const [syncTime, setSyncTime] = useState({
        STOCK_IN_HAND: {
            name: "Stock In Hand",
            value: NO_DATA_SYMBOL
        },
        STOCK_IN_TRANSIT: {
            name: "Stock In Transit",
            value: NO_DATA_SYMBOL,
        },
        OPEN_ORDER: {
            name: "Open Order",
            value: NO_DATA_SYMBOL
        }
    });
    const [stockData, setStockData] = useState();
    const [tableSyncData, setTableSyncData] = useState();
    const [dbSku, setDbSku] = useState({
        distributor_code: '',
        sku: "",
        docType: "ZOR",
    });

    // useEffect declarations
    useEffect(() => {
        async function getLastSyncTime() {
            const response = await getStockSyncTime();
            response && setTableSyncData(response.table_status);
            const syncTimeResponse = response?.sync_time;
            if (syncTimeResponse) {
                const lastSync = syncTime;
                Object.keys(syncTimeResponse).forEach(key => {
                    lastSync[key].value = Util.formatDateTime(syncTimeResponse[key])
                })
                setSyncTime({ ...lastSync });
            }
        }
        getLastSyncTime();
    }, []);

    // function declarations
    const onSubmitFormHandler = async (e) => {
        e.preventDefault();
        const response = await fetchSkuStockData(dbSku);
        if (response) {
            setStockData(response);
        } else {
            setStockData([])
            notification.error({
                message: "Error!",
                description: "Couldn't fetch stock data for the given DB SKU Order type combination",
                duration: 8,
                className: 'notification-error error-scroll'
            });
        }
    }
    return (
        <div className="admin-dashboard-wrapper">
            <div className="admin-dashboard-block">
                <header className="admin-dashboard-head" id='admin-dashboard-head'>
                    <div id="page-title">
                        <h2>Stock Level Check</h2>
                    </div>
                </header>
                <section className="time-info">
                    <ul>
                        <li> <h3> Last Synced On:</h3></li>
                        {syncTime && Object.keys(syncTime).map((key) => {
                            return <li key={syncTime[key].name}>
                                <span >{syncTime[key].name}</span>
                                <em >{syncTime[key].value}</em>
                            </li>;
                        })}
                    </ul>
                </section>
                {
                    tableSyncData && <>
                        <header className="admin-dashboard-head" id='admin-dashboard-head'>
                            <div id="page-title">
                                <h2>Datalake Table Status</h2>
                            </div>
                        </header>
                        <TableSyncStatus data={tableSyncData} />
                    </>
                }
                <article>
                        <header className="admin-dashboard-head" id='admin-dashboard-head'>
                            <div id="page-title">
                                <h2>ARS Simulation</h2>
                            </div>
                        </header>
                        <ArsSimulation />
                </article>
                <article>
                        <header className="admin-dashboard-head" id='admin-dashboard-head'>
                            <div id="page-title">
                                <h2>AOS Audit Report</h2>
                            </div>
                        </header>
                        <AosAuditReport />
                </article>
                <article>
                    <form className="db-sku-form">
                        <header className="admin-dashboard-head" id='stock-data-head'>
                            <div id="stock-date-page-title">
                                <h2>Stock Data</h2>
                            </div>
                        </header>
                        <input className='inputs'
                            type="text"
                            placeholder='DB code'
                            value={dbSku.distributor_code}
                            onChange={(e) => setDbSku({ ...dbSku, distributor_code: e.target.value })} />
                        <input
                            className='inputs'
                            type="text"
                            placeholder='SKU code'
                            value={dbSku.sku}
                            onChange={(e) => setDbSku({ ...dbSku, sku: e.target.value })} />
                        <Select
                            defaultValue="ZOR"
                            style={{
                                width: 120,
                            }}
                            onChange={(value) => setDbSku({ ...dbSku, docType: value })}
                            options={[
                                {
                                    value: 'ZOR',
                                    label: 'ZOR',
                                },
                                {
                                    value: 'ZLIQ',
                                    label: 'ZLIQ',
                                }
                            ]}
                        />
                        <Button type="submit" onClick={onSubmitFormHandler}>Fetch</Button>
                    </form>

                    <section className="admin-dashboard-table">
                        {stockData?.length > 0 &&
                            <Loader>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Material Code</th>
                                            <th>Material Description</th>
                                            <th>Stock In Hand ( CV )</th>
                                            <th>Stock In Transit ( CV )</th>
                                            <th>Open Order ( CV )</th>
                                            <th>SIH Closing Stock Date</th>
                                            <th>SIT Update Time</th>
                                            <th>OO Update Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stockData?.map(item => {
                                            return <tr key={item.sku}>
                                                <td>{item.sku}</td>
                                                <td>{item.description}</td>
                                                <td>{item.stock_in_hand ? item.stock_in_hand : NO_DATA_SYMBOL}</td>
                                                <td>{item.stock_in_transit ? item.stock_in_transit : NO_DATA_SYMBOL}</td>
                                                <td>{item.open_order ? item.open_order : NO_DATA_SYMBOL}</td>
                                                <td>{item.sih_closing_stock_date ? Util.formatDateTime(item.sih_closing_stock_date) : NO_DATA_SYMBOL}</td>
                                                <td>{item.sit_update_time ? Util.formatDateTime(item.sit_update_time) : NO_DATA_SYMBOL}</td>
                                                <td>{item.oo_update_time ? Util.formatDateTime(item.oo_update_time) : NO_DATA_SYMBOL}</td>
                                            </tr>
                                        })}
                                    </tbody>
                                </table>
                            </Loader>
                        }
                    </section>
                </article>
                
            </div>
        </div>
    );
};


const TableSyncStatus = (props) => {
    const { data } = props;
    // Helper function to transform data into table data source format
    const transformDataToTableSource = (dataObject) => {
        return Object.entries(dataObject).map(([key, value]) => ({
            key: key.replace(/\./g, '/'),
            value
        }));
    };

    // Define columns for your tables
    const columns = [
        {
            title: 'Table Name',
            dataIndex: 'key',
            key: 'key',
        },
        {
            title: 'Record Count',
            dataIndex: 'value',
            key: 'value',
        }
    ];

    return (
        <Collapse accordion>
            {Object.entries(data).map(([category, values]) => (
                <Panel header={category} key={category}>
                    <Table
                        columns={columns}
                        dataSource={transformDataToTableSource(values)}
                        pagination={false}
                    />
                </Panel>
            ))}
        </Collapse>
    );
};

const mapDispatchToProps = (dispatch) => {
    return {
        getStockSyncTime: () => dispatch(Actions.getStockSyncTime()),
        fetchSkuStockData: (payload) => dispatch(Actions.fetchSkuStockData(payload)),
    }
};

export default connect(null, mapDispatchToProps)(StockLevelCheck);