import React from "react";
import { useState } from "react";
import { CloseCircleOutlined } from '@ant-design/icons';
import '../SearchBox/style.css';

const SearchBox = (props) => {
    const { onReset, onSearchChange, value } = props;
    const [showSearch, setShowSearch] = useState(value ?? '');
    const searchChange = (e) => {
        setShowSearch(e.currentTarget.value);
        onSearchChange(e.currentTarget.value);
    }
    return (
        <div id="col-search">
            <input id="search"
                placeholder="Type here..."
                type="text"
                value={showSearch}
                onChange={searchChange}
                autoFocus />
            <div id="reset" onClick={onReset}><CloseCircleOutlined /></div>
        </div>
    )

}

export default SearchBox;