import React, { useEffect, useState } from "react";
import { Checkbox } from 'antd';
import { connect } from 'react-redux';
import * as Actions from './actions/adminAction';
import { SearchOutlined, FilterOutlined } from '@ant-design/icons';
import Panigantion from '../../components/Panigantion';
import '../../style/admin/SapMaterialDashboard.css';
import SearchBox from "../../components/SearchBox";
import _ from 'lodash';
import FilterSearch from "../../components/FilterSearch";
import Loader from "../../components/Loader";
import { allDivisionsArr } from "../../config/constant";
import OptionalColumns from "../../components/OptionalColumns/OptionalColumns";
const CheckboxGroup = Checkbox.Group;
const distChannelOptions = [10, 40, 90];
const divisionOptions = allDivisionsArr;
const defaultDistChannelCheckedList = distChannelOptions;
const defaultDivisionCheckedList = divisionOptions;

const columnsOptions = [
  { label: 'Sales Org.', value: 'salesOrgCol', default: true },
  { label: 'Distribution Channel', value: 'dcCol', default: true },
  { label: 'Division', value: 'divCol', default: true },
  { label: 'Sales Unit', value: 'salesUnitCol' },
  { label: 'UOM', value: 'uomCol' },
  { label: 'BUOM', value: 'buomCol' },
  { label: 'LOB', value: 'lobCol' },
  { label: 'Product Hierarchy', value: 'phCol' },
  { label: 'Conversion Factor', value: 'cfCol' },
  { label: 'BUOM_to_CS', value: 'buomToCsCol' },
  { label: 'PAK_to_CS', value: 'pakToCsCol' },
  { label: 'TON_to_SUOM', value: 'tonToSuomCol' },
];

let SapMaterialDashboard = props => {
  const { getMaintenanceRequests } = props;

  const [searchColm, setSearchColm] = useState('');
  const [materialList, setMaterialList] = useState([]);
  const [filteredMaterialList, setFilteredMaterialList] = useState([]);
  const [displayedMaterialList, setDisplayedMaterialList] = useState([]);
  const [distChannelCheckedList, setDistChannelCheckedList] = useState(defaultDistChannelCheckedList);
  const [divisionCheckedList, setDivisionCheckedList] = useState(defaultDivisionCheckedList);
  const [indeterminate, setIndeterminate] = useState(true);
  const [checkAllDistChannel, setCheckAllDistChannel] = useState(true);
  const [itemPerPage, setItemsPerPage] = useState(10);
  const [page, setPage] = useState(1);
  const [salesUnitFilterArray, setSalesUnitFilterArray] = useState();
  const [displayableColumns, setDisplayableColumns] = useState([]);

  var salesUnitFilteredOptions = [];

  useEffect(() => {
    getMaintenanceRequests();
  }, [])

  useEffect(() => {
    onChangePage(1, itemPerPage);
  }, [filteredMaterialList]);

  const onDistChannelChange = (list) => {
    setDistChannelCheckedList(list);
    setIndeterminate(!!list.length && list.length < distChannelOptions.length);
    setCheckAllDistChannel(list.length === distChannelOptions.length);
  };
  const onDistChannelCheckAllChange = (e) => {
    setDistChannelCheckedList(e.target.checked ? distChannelOptions : []);
    setIndeterminate(false);
    setCheckAllDistChannel(e.target.checked);
    onDivisionCheckAllChange(e);
  };
  const onDivisionChange = (list) => {
    setDivisionCheckedList(list);
    setIndeterminate(!!list.length && list.length < divisionOptions.length);
  }
  const onDivisionCheckAllChange = (e) => {
    setDivisionCheckedList(e.target.checked ? divisionOptions : []);
  };
  function findUniqueItems(dataObjArray, key) {
    let valueArray = [];
    dataObjArray.forEach(element => {
      valueArray.push(element[key]);
    });
    return _.uniq(valueArray);
  }

  const onFetchSubmit = (event) => {
    //distribution channel or division can not be sent empty
    event.preventDefault();
    props.getSapMaterialList({ distributionChannels: distChannelCheckedList, divisions: divisionCheckedList })
      .then((response) => {
        const { data } = response?.data;
        setMaterialList(data)
        setDisplayedMaterialList(data.slice(0, itemPerPage));
        setFilteredMaterialList(data);
        salesUnitFilteredOptions = findUniqueItems(data, 'Sales_Unit');
        setSalesUnitFilterArray([...salesUnitFilteredOptions]);

      });
  }
  const onSearch = (value) => {
    const searchValue = value?.toUpperCase();
    let filteredResult = [];
    if (searchColm === 'sku-code-search') {
      filteredResult = materialList.filter((item) => {
        return item.SKU_Code.includes(searchValue)
      })
    } else if (searchColm === 'sku-description-search') {
      filteredResult = materialList.filter((item) => {
        return item.SKU_Description.includes(searchValue)
      })
    } else if (searchColm === 'sales-unit-filter') {
      if (searchValue === '') {
        filteredResult = materialList.filter((item) => {
          return item.Sales_Unit === searchValue
        })
      } else {
        filteredResult = materialList.filter((item) => {
          return item.Sales_Unit.includes(searchValue)
        })
      }
    } else if (searchColm === 'product-hierarchy-code-search') {
      filteredResult = materialList.filter((item) => {
        return item.Product_hierarchy_code.includes(searchValue)
      })
    }
    setFilteredMaterialList([...filteredResult]);
  }
  const resetPage = () => {
    setFilteredMaterialList([...materialList]);
    onChangePage(1, itemPerPage);
    setSearchColm('');
  }
  const onChangePage = (page, itemsPerPage) => {
    setItemsPerPage(itemsPerPage);
    setPage(page);
    let offset = Number((page - 1) * itemsPerPage);
    let limit = offset + Number(itemPerPage);
    setDisplayedMaterialList([...filteredMaterialList.slice(offset, limit)]);
  }

  const enableSearch = (e) => {
    setSearchColm(e.currentTarget.id);
  };

  return (
    <>
      <div className="admin-dashboard-wrapper">
        <div className="admin-dashboard-block">
          <div className="admin-dashboard-head" id="admin-dashboard-head">
            <div id="page-title">
              <h2>Material List</h2>
            </div>
            <form id="fetch-form" action="" onSubmit={onFetchSubmit}>
              <div id='main'>
                <label id="onDistChannelCheckAllChange">Check all</label>
                <Checkbox indeterminate={indeterminate} onChange={onDistChannelCheckAllChange} checked={checkAllDistChannel}></Checkbox>

                <div id="select-dist-channel">Select distribution channel :
                  <>
                    <CheckboxGroup id='distChannelCheckedList' options={distChannelOptions} value={distChannelCheckedList} onChange={onDistChannelChange} />
                  </>
                </div>
                <div id="select-division">Select division :
                  <>
                    <CheckboxGroup id='divisionCheckedList' options={divisionOptions} value={divisionCheckedList} onChange={onDivisionChange} />
                  </>
                </div>
              </div>
              <div id="btn">
                <button id="fetch-btn" type="submit" disabled={distChannelCheckedList.length === 0 || divisionCheckedList.length === 0}>Fetch</button>
              </div>
            </form>
          </div>
          {filteredMaterialList.length > 0 &&
            <div className="card-row-col row-colmn">
              <h4>{filteredMaterialList.length} records found</h4>
            </div>
          }

          <OptionalColumns columns={columnsOptions} selectedColumns={displayableColumns} onChangeSelection={setDisplayableColumns} />

          <div id="material-table" className="admin-dashboard-table">
            <Loader>
              <table>
                <thead>
                  <tr>
                    <th id="sku-code-head" className="width5" >
                      {searchColm === 'sku-code-search' ?
                        <SearchBox onReset={resetPage} onSearchChange={onSearch} />
                        :
                        <>PSKU Code
                          {materialList.length > 0 &&
                            <span id="sku-code-search" className="colm-search-icon" onClick={enableSearch} >
                              <SearchOutlined />
                            </span>
                          }
                        </>
                      }
                    </th>
                    <th id="product-hierarchy-code-head" className="width5" >
                      {searchColm === 'product-hierarchy-code-search' ?
                        <SearchBox onReset={resetPage} onSearchChange={onSearch} />
                        :
                        <>Product Hierarchy Code
                          {materialList.length > 0 &&
                            <span id="product-hierarchy-code-search" className="colm-search-icon" onClick={enableSearch} >
                              <SearchOutlined />
                            </span>
                          }
                        </>
                      }
                    </th>
                    <th id="sku-description-head" className="width5">
                      {searchColm === 'sku-description-search' ?
                        <SearchBox onReset={resetPage} onSearchChange={onSearch} />
                        :
                        <>SKU Description
                          {materialList.length > 0 &&
                            <span id="sku-description-search" className="colm-search-icon" onClick={enableSearch} >
                              <SearchOutlined />
                            </span>
                          }
                        </>}
                    </th>
                    {displayableColumns.includes("salesOrgCol") && <th className="width5">Sales Org. </th>}
                    {displayableColumns.includes("dcCol") && <th className="width5">Distribution Channel </th>}
                    {displayableColumns.includes("divCol") && <th className="width5">Division</th>}
                    {displayableColumns.includes("salesUnitCol") &&
                      <th className="width5">
                        {searchColm === 'sales-unit-filter' ?
                          <FilterSearch onReset={resetPage} optionsArray={salesUnitFilterArray} onSearchChange={onSearch} allowClear={resetPage} />
                          :
                          <>
                            Sales Unit
                            {materialList.length > 0 && <span id="sales-unit-filter" className="colm-search-icon" onClick={enableSearch}> <FilterOutlined /></span>}
                          </>
                        }

                      </th>
                    }
                    {displayableColumns.includes("uomCol") && <th className="width5">UOM</th>}
                    {displayableColumns.includes("buomCol") && <th className="width5">BUOM</th>}
                    {displayableColumns.includes("lobCol") && <th className="width5">LOB</th>}
                    {displayableColumns.includes("phCol") && <th className="width5">Product Hierarchy</th>}
                    {displayableColumns.includes("cfCol") && <th className="width5">Conversion Factor</th>}
                    {displayableColumns.includes("buomToCsCol") && <th className="width5">BUOM TO CS</th>}
                    {displayableColumns.includes("pakToCsCol") && <th className="width5">PAK TO CS</th>}
                    {displayableColumns.includes("tonToSuomCol") && <th className="width5">TON TO SUOM</th>}
                  </tr>
                </thead>
                <tbody>
                  {displayedMaterialList.map((item, index) => {
                    return (
                      <tr key={index} className='materials'>
                        <td>{item.SKU_Code}</td>
                        <td>{item.Product_hierarchy_code}</td>
                        <td>{item.SKU_Description}</td>
                        {displayableColumns.includes("salesOrgCol") && <td>{item.Sales_Org}</td>}
                        {displayableColumns.includes("dcCol") && <td>{item.Distribution_Channel}</td>}
                        {displayableColumns.includes("divCol") && <td>{item.Division}</td>}
                        {displayableColumns.includes("salesUnitCol") && <td>{item.Sales_Unit}</td>}
                        {displayableColumns.includes("uomCol") && <td>{item.UOM}</td>}
                        {displayableColumns.includes("buomCol") && <td>{item.BUOM}</td>}
                        {displayableColumns.includes("lobCol") && <td>{item.LOB}</td>}
                        {displayableColumns.includes("phCol") && <td>{item.Product_hierarchy}</td>}
                        {displayableColumns.includes("cfCol") && <td>{item.ConversionFactor}</td>}
                        {displayableColumns.includes("buomToCsCol") && <td>{item.BUOM_to_CS}</td>}
                        {displayableColumns.includes("pakToCsCol") && <td>{item.PAK_to_CS}</td>}
                        {displayableColumns.includes("tonToSuomCol") && <td>{item.TON_to_SUOM}</td>}
                      </tr>
                    )
                  })}
                  {displayedMaterialList.length === 0 &&
                    <tr style={{ textAlign: 'center' }}>
                      <td colSpan="10">No data available, fetch the data</td>
                    </tr>}
                </tbody>
              </table>
            </Loader>
          </div>
          <Panigantion
            data={displayedMaterialList ? displayedMaterialList : []}
            pageNo={page}
            itemsPerPage={itemPerPage}
            setItemsPerPage={setItemsPerPage}
            itemsCount={filteredMaterialList && filteredMaterialList.length}
            setModifiedData={onChangePage} />
        </div>
      </div>
    </>
  )
}
// const mapStateToProps = (props) => {}
const mapDispatchToProps = (dispatch) => {
  return {
    getMaintenanceRequests: () => dispatch(Actions.getMaintenanceRequests()),
    getSapMaterialList: (data) => dispatch(Actions.getSapMaterialList(data))
  }
}

export default connect(null, mapDispatchToProps)(SapMaterialDashboard);