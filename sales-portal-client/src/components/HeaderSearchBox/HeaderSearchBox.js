import React, { useState, useEffect } from 'react'
import { CloseOutlined } from '@ant-design/icons';
import { Input } from 'antd';

const HeaderSearchBox = (props) => {
  const { onClose, propKey, onFilterChange, searchedValue,placeholder } = props;
  const [value, setValue] = useState("");

  useEffect(() => {
    searchedValue && setValue(searchedValue)
  }, [searchedValue]);
  const searchOnClose = () => {
    setValue("")
    onClose(propKey);
  }
  const onSearchChange = (e) => {
    setValue(e.target.value)
    const clearTimeout = setTimeout(() => {
      onFilterChange(e, propKey)
    }, 1000)
    return () => { clearTimeout(clearTimeout) }
  }
  return (
    <Input
      placeholder={placeholder ? placeholder : "Search"}
      autoFocus
      value={value}
      style={{ width: 150, height: 40 }}
      onChange={(e) => onSearchChange(e)}
      suffix={
        <CloseOutlined
          onClick={searchOnClose}
          style={{
            height: 15,
            color: 'rgba(0,0,0,.45)'
          }}
        />
      }
    />
  )
}

export default HeaderSearchBox
