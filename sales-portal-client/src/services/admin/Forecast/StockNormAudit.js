import { connect } from 'react-redux';
import React, { useEffect, useState, useRef } from 'react';
import * as AdminActions from '../actions/adminAction';
import Util from '../../../util/helper/index.js';
import { notification, Popover } from 'antd';
import './StockNormAudit.css';
import _ from 'lodash';
import {
  HistoryOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { pages, hasEditPermission } from '../../../persona/forecast';
import Loader from '../../../components/Loader/index.js';
import { NO_DATA_SYMBOL } from '../../../constants/index.js';
import Paginator from '../../../components/Panigantion';
import Spinner from '../../../components/Spinner'

function StockNormAudit(props) {
  const {
    getStockNormAudit,
    updateStockNormAudit,
    customerGroup,
    timelineEditEnable,
    listForSNFilter,
    arsEnabledDBMode,
    filterDistributors,
    stockNormDbFilter,
    isLoading,
    fetchStockNormForDistributor,
  } = props;
  const originalStockNorm = useRef({});
  const [stockNorm, setStockNorm] = useState([]);
  const [canSave, setCanSave] = useState(false);
  const [editEnable, setEditEnable] = useState(false);
  const [tableData, setTableData] = useState([]);
  const [expandedRow, setExpandedRow] = useState(null);
  const [changedRows, setChangedRows] = useState({});
  const [totalRows, setTotalRows] = useState(0);
  const [limit, setLimit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [invalidRows, setInvalidRows] = useState({});
  const [stockNormData, setStockNormData] = useState([]);
  const [isStockNormLoading, setIsStockNormLoading] = useState(false);
  
  const dbStockNormMap = useRef({});
  
  useEffect(() => {
    getStockNormConfig();
    setExpandedRow(null);
    return () => {
      originalStockNorm.current = {};
      setStockNorm([]);
      setTableData([]);
    };
  }, [
    customerGroup,
    arsEnabledDBMode,
    filterDistributors,
    pageNo,
    limit,
  ]);

  useEffect(() => {
    stockNormDbFilter(arsEnabledDBMode, customerGroup).then((res) => {
      listForSNFilter(res.data);
    });
  }, [customerGroup, arsEnabledDBMode]);

  useEffect(() => {
    setCanSave(false);
    setChangedRows({});
    setInvalidRows({});
  }, [customerGroup, arsEnabledDBMode, filterDistributors, pageNo]);

  useEffect(() => {
    setPageNo(1);
    setOffset(0);
  }, [customerGroup, arsEnabledDBMode, filterDistributors]);

  useEffect(() => {
    if (
      timelineEditEnable[customerGroup]?.editEnable &&
      hasEditPermission(pages.STOCK_NORM)
    )
      setEditEnable(true);
    else setEditEnable(false);
  }, [timelineEditEnable, customerGroup]);

  useEffect(() => {
    const temp = _.cloneDeep(stockNorm);
    const filteredData = temp?.filter((stock) => {
      if (!filterDistributors.length) return true;
      else {
        return filterDistributors?.includes(stock.dist_id);
      }
    });
    setTableData(filteredData);
  }, [stockNorm]);

  function getStockNormConfig() {
    const payload = {};
    payload.ars_db = arsEnabledDBMode;
    payload.distId = filterDistributors;
    payload.offset = offset;
    payload.limit = limit;
    getStockNormAudit(customerGroup, payload).then((res) => {
      let tempResponse = _.cloneDeep(res?.data?.data);
      setTotalRows(tempResponse[0]?.row_count);
      tempResponse?.forEach((dbData) => {
        dbData.stock_norm_data?.forEach((pskuData) => {
          pskuData['dist_id'] = dbData.dist_id;
          const key = pskuData.id;
          originalStockNorm.current[key] = pskuData;
        });
      });
      setStockNorm(_.cloneDeep(res?.data?.data));
    });
  }

  function getStockNormForDistributor(distributorCode) {
    setStockNormData([]);
    setIsStockNormLoading(true);
    fetchStockNormForDistributor(distributorCode).then((response) => {
      const data = response.data[0]?.stock_norm_data ?? []
      setIsStockNormLoading(false)
      setStockNormData(_.cloneDeep(data));
      dbStockNormMap.current = { ...dbStockNormMap.current, [distributorCode]: data };
    });
  }

  const inputValidationStockNorm = (data) => {
    let isValid = true;
    let errorMessage = '';
    if (+data <= 0 || data == '') {
      isValid = false;
      errorMessage = 'Stock Norm should be greater than 0';
    }
    return { isValid, errorMessage };
  };

  const resetHandler = () => {
    setStockNorm(_.cloneDeep(stockNorm));
    if(expandedRow)
      setStockNormData(_.cloneDeep(dbStockNormMap.current[expandedRow]))
    setCanSave(false);
    setInvalidRows({});
    setChangedRows({});
  };

  const toggleHandler = (e, dist_id) => {
    if (expandedRow == dist_id) setExpandedRow(null);
    else {
      setExpandedRow(dist_id);
      if(dbStockNormMap.current[dist_id]){
        setStockNormData(dbStockNormMap.current[dist_id])
      }
      else
        getStockNormForDistributor(dist_id);
    }
  };

  const handleStockNormChange = (e, id) => {
    let formatedStockNorm = e.target.value;
    formatedStockNorm = formatedStockNorm.replace(/^0+/, '');
    formatedStockNorm = isNaN(+formatedStockNorm)
      ? 0
      : formatedStockNorm;
    formatedStockNorm =
      formatedStockNorm == '' ? 0 : formatedStockNorm;
    formatedStockNorm =
      +formatedStockNorm < 0 ? 0 : formatedStockNorm;
    formatedStockNorm = Math.floor(+formatedStockNorm);
    if (formatedStockNorm == 0) {
      setInvalidRows({ ...invalidRows, [id]: id });
      !invalidRows.hasOwnProperty(id) &&
        notification.error({
          message: 'Error',
          description: 'Stock norm can not be 0',
          duration: 5,
          className: 'notification-error',
        });
    } else {
      const temp = { ...invalidRows };
      delete temp[id];
      setInvalidRows(temp);
    }
    let isValid = false;
    const temp = { ...changedRows };
    temp[id] = `${formatedStockNorm}`;
    Object.keys(temp).forEach((item) => {
      if (inputValidationStockNorm(temp[item]).isValid)
        isValid = true;
    });
    setChangedRows(temp);
    setCanSave(isValid);
  };

  const handleSave = () => {
    const payload = { update: [] };
    setExpandedRow(null);
    const stockNormIdMap = Object.values(dbStockNormMap.current).reduce((acc, curr) => {
      curr?.forEach(item => {
        acc[item.id] = item;
      })
      return acc;
    }, {});
    for (let i in changedRows) {
      const data = changedRows[i];
      const originalData = stockNormIdMap[i]
      if (inputValidationStockNorm(data).isValid) {
        if (data !== originalData.stock_norm) 
          payload.update.push({
            id: originalData.id,
            stock_norm: data,
            ss_percent: `${originalData.ss}`,
            remarks: originalData.remarks,
            class_of_last_update: originalData.class,
          });
      }
    }
    if (payload.update.length > 0) {
      updateStockNormAudit(payload)
        .then((data) => {
          if (data?.data?.success) {
            getStockNormConfig();
            notification.success({
              message: 'Success',
              description: 'Stock Norm Updated Successfully',
              duration: 2,
              className: 'notification-green',
            });
          } else throw new Error('Stock Norm could not be updated');
        })
        .catch((e) => {
          notification.error({
            message: 'Failure',
            description:
              e?.message ?? 'Stock Norm could not be updated',
            duration: 5,
            className: 'notification-error',
          });
        });
    }
    dbStockNormMap.current = {};
    setChangedRows({});
    setInvalidRows({});
    setCanSave(false);
  };

  const onChangePage = (page, itemsPerPage) => {
    setLimit(itemsPerPage);
    setPageNo(page);
    setOffset((page - 1) * itemsPerPage);
  };

  return (
    <>
      <Loader>
        <div className="brand-variants-container sn-table-container">
          <table className="table-brand-variants">
            <thead>
              <tr>
                <th className="width3 sub-header"></th>
                <th className="sub-header">Area Code</th>
                <th className="sub-header" style={{ width: '180px' }}>
                  Distributor Code
                </th>
                <th className="sub-header">Distributor Name</th>
                <th className="sub-header">Action</th>
              </tr>
            </thead>
            <tbody>
              {tableData?.map((stock, index) => {
                return (
                  <>
                    <tr key={stock.dist_id}>
                      <td>
                        <button
                          onClick={(e) => {
                            toggleHandler(e, stock.dist_id);
                          }}
                          className="collapse-button-audit"
                        >
                          {expandedRow == stock.dist_id ? '-' : '+'}
                        </button>
                      </td>
                      <td className="center sn-padding">
                        {stock.area_code}
                      </td>
                      <td className="center sn-padding">
                        {stock.dist_id}
                      </td>
                      <td className="sn-padding sub-headearea_codr">
                        {stock.name}
                      </td>
                      <td className="admin-actions center">
                        <Popover
                          content={
                            <table className="pdp-popup-table">
                              <thead>
                                <tr>
                                  <th>Division</th>
                                  <th>PDP</th>
                                </tr>
                              </thead>
                              <tbody>
                                {stock.pdp_details
                                  ?.filter(
                                    (f) =>
                                      f.distribution_channel === 10,
                                  )
                                  ?.sort(
                                    (a, b) =>
                                      +a.division - +b.division,
                                  )
                                  ?.map((item) => {
                                    return (
                                      <tr key={item.division}>
                                        <td>
                                          {item.division_description}/
                                          {item.division}
                                        </td>
                                        <td>
                                          {item.pdp ?? NO_DATA_SYMBOL}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          }
                        >
                          <InfoCircleOutlined />
                        </Popover>
                      </td>
                    </tr>
                    {expandedRow == stock.dist_id && (
                      <tr className="snc-table-tr">
                        <td colSpan={5}>
                          <SubTable
                            stockNormData={stockNormData}
                            changedRows={changedRows}
                            handleStockNormChange={
                              handleStockNormChange
                            }
                            editEnable={editEnable}
                            invalidRows={invalidRows}
                            isStockNormLoading={isStockNormLoading}
                          />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {tableData.length === 0 && (
                <tr style={{ textAlign: 'center' }}>
                  <td colSpan="10">No data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Loader>
      <div
        className="paginator-wrapper"
        style={{ display: isLoading ? 'none' : 'initial' }}
      >
        <Paginator
          itemsPerPage={limit}
          setItemsPerPage={setLimit}
          itemsCount={totalRows}
          setModifiedData={onChangePage}
          pageNo={pageNo}
        />
      </div>
      {Object.keys(originalStockNorm).length > 0 && (
        <>
          <span className="audit-trail">
            Changes made will be effective from{' '}
            {tableData[0]?.applicable_month
              ? Util.applicableMonthToMonthYearString(
                  tableData[0]?.applicable_month,
                )
              : 'next month'}{' '}
            onwards.
          </span>
          <div className="btn-wrapper">
            <button
              type="button"
              onClick={resetHandler}
              disabled={!canSave}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
            >
              Save
            </button>
          </div>
        </>
      )}
    </>
  );
}

const mapStateToProps = (state) => ({
  adjustment_timeline: state.admin.get('adjustment_timeline'),
    isLoading: state.loader.isLoading,
});

const mapDispatchToProps = (dispatch) => ({
  getStockNormAudit: (customerGroup, data) =>
    dispatch(AdminActions.getStockNormAudit(customerGroup, data)),
  updateStockNormAudit: (data) =>
    dispatch(AdminActions.updateStockNormAudit(data)),
  stockNormDbFilter: (ao_enabled, cg) =>
    dispatch(AdminActions.stockNormDbFilter(ao_enabled, cg)),
  fetchStockNormForDistributor: (distributorCode) =>
    dispatch(
      AdminActions.fetchStockNormForDistributor(distributorCode),
    ),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
)(StockNormAudit);

function SubTable(props) {
  const {
    stockNormData,
    changedRows,
    handleStockNormChange,
    editEnable,
    invalidRows,
    isStockNormLoading,
  } = props;
  return (
      <Spinner loading={isStockNormLoading}>
        <table className="table-brand-variants snc-table">
            <thead>
                <th className="sub-header width15">PSKU Code</th>
                <th className="sub-header width40">PSKU Name</th>
                <th className="sub-header width20">Stock Norm(Days)</th>
                <th className="sub-header width10">Class</th>
                <th className="sub-header width15">Actions</th>
            </thead>
            <tbody
                style={{
                    display: 'block',
                    height: 'max-content',
                    maxHeight: '390px',
                    overflowY: 'scroll',
                    scrollbarWidth: 'thin',
                }}
            >
                {stockNormData?.map((item, index) => {
                    return (
                        <tr key={`db-${item}/${index}`}>
                            <td className="width15">{item.psku}</td>
                            <td className="width40">{item.psku_name}</td>
                            <td className="width20">
                                <input
                                    disabled={
                                        !item.stock_norm &&
                                            hasEditPermission(pages.STOCK_NORM)
                                            ? false
                                            : editEnable
                                                ? false
                                                : true
                                    }
                                    style={{
                                        padding: '2px',
                                        maxWidth: '100px',
                                        borderRadius: '2px',
                                        textAlign: 'center',
                                        border: invalidRows.hasOwnProperty(item.id)
                                            ? 'solid red'
                                            : '1px solid #d5d5d5',
                                    }}
                                    value={
                                        changedRows.hasOwnProperty(item.id)
                                            ? changedRows[item.id]
                                            : item.stock_norm
                                                ? item.stock_norm
                                                : ''
                                    }
                                    onChange={(e) => handleStockNormChange(e, item.id)}
                                />
                            </td>
                            <td className="width10">{item.class}</td>
                            <td className=" width15">
                                <Popover
                                    content={
                                        <div className="time-details ">
                                            <p style={{ marginBottom: '5px' }}>
                                                <b>
                                                    <i>Last Updated by:</i>
                                                </b>{' '}
                                                {item.first_name
                                                    ? `${item.first_name} ${item.last_name}`
                                                    : null}{' '}
                                                ({item.updated_by})
                                            </p>
                                            <p style={{ marginBottom: '5px' }}>
                                                <b>
                                                    <i>Last Updated on:</i>
                                                </b>{' '}
                                                {Util.formatDate(item.updated_on)}{' '}
                                                {Util.formatTime(item.updated_on)}
                                            </p>
                                            <p style={{ marginBottom: '5px' }}>
                                                <b>
                                                    <i>Class as of last update:</i>
                                                </b>{' '}
                                                {item?.class_of_last_update ?? NO_DATA_SYMBOL}
                                            </p>
                                        </div>
                                    }
                                    title=""
                                    trigger="hover"
                                    placement="leftBottom"
                                >
                                    <HistoryOutlined className="padding5px" />
                                </Popover>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </Spinner>
  );
}
