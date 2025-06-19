import React, { useEffect } from 'react'
import { useState } from 'react'
import './OptionalColumns.css'

function OptionalColumns(props) {

  const { columns, onChangeSelection, selectedColumns } = props

  const [options, setOptions] = useState([])
  const [selected, setSelected] = useState([])

  useEffect(() => {
    const mapCol = columns?.map(item => {
      return { ...item, checked: !!item.default }
    })
    setOptions(mapCol);
    const selectedCol = selectedColumns.length > 0 ? selectedColumns : mapCol?.filter(item => item.checked === true).map(item => item.value);
    setSelected(selectedCol);
    onChangeSelection(selectedCol)
  }, []);

  useEffect(() => {
    setSelected(selectedColumns);
  }, [selectedColumns]);


  function onChangeHandler(e) {
    let selectedValues = [];
    if (selected.includes(e)) {
      selectedValues = selected.filter(item => item !== e);
    }
    else {
      selectedValues = [...selected, e];
    }
    onChangeSelection(selectedValues)
  }

  return (
    <div id="select-colm" className="row-colmn">
      {
        options?.map((option, index) => {
          return (
            <>
              <input
                className="check-colm-op"
                type="checkbox"
                id={option.value}
                name={option.label}
                value={selected.includes(option.value)}
                onChange={() => onChangeHandler(option.value)}
                checked={!!selected?.includes(option.value)} />
              <label
                className='colm-op'
                for={option.value}>
                {option.label}
              </label>
            </>
          )
        })
      }

    </div>

  )
}

export default OptionalColumns;