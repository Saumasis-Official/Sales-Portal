import React, { useState } from "react";
import { Select } from "antd";
import { CloseCircleOutlined } from '@ant-design/icons';
import "../FilterSearch/filterSearch.css"
const FilterSearch = (props) => {
    const { optionsArray, onReset, onSearchChange } = props;
    const [searchValue, setSearchValue] = useState();
    const onSearchHandler = (e) => {
        setSearchValue(e);
        onSearchChange(e);
    }
    return (
        <div id="container">
            <div id="select-fld">
                <Select
                    className="select-fld-select"
                    defaultOpen
                    name="col-filter"
                    placeholder="Search and select..."
                    optionFilterProp="children"
                    onChange={onSearchHandler}
                    value={searchValue}
                    getPopupContainer={trigger => trigger.parentNode}
                    options={optionsArray?.map((item, index) => {
                        return (optionsArray[index] === '') ?
                            { label: "any", value: optionsArray[index] }
                            :
                            { label: optionsArray[index], value: optionsArray[index] }
                    })}
                    filterOption={(input, option) => {
                        (option.children).toUpperCase().includes(input.toUpperCase())
                    }}
                />
            </div>
            <div
                id="close-btn"
                onClick={onReset}><CloseCircleOutlined />
            </div>
        </div>
    );
}
export default FilterSearch;