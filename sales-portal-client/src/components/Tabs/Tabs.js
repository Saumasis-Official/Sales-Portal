import React, { useState, useEffect } from "react";
import './Tabs.css';
import PropTypes from 'prop-types';

function Tabs(props) {
    const { tabs, value, onChangeSelection } = props;

    const [options, setOptions] = useState([]);
    const [selected, setSelected] = useState("");

    useEffect(() => {
        setOptions(tabs);
        if (value) {
            setSelected(value);
        } else {
            setSelected(tabs?.find((tab) => tab.default)?.value);
        }
    }, [tabs, value]);

    function onChangeHandler(e) {
        setSelected(e);
        onChangeSelection(e)
    }

    return (
        <div className="tabs">
            {
                options?.map((option, index) => {
                    return (
                        <>
                            <input
                                className="check-colm-op"
                                type="radio"
                                id={option.value}
                                name={option.label}
                                // value={selected === option?.value}
                                onChange={() => onChangeHandler(option.value)}
                                checked={selected === option?.value} />
                            <label
                                className={`tab-op ${selected === option?.value ? 'active' : ''}`}
                                htmlFor={option.value}>
                                {option.label}
                            </label>
                        </>
                    )
                })
            }
        </div>
    );
};

Tabs.propTypes = {
    tabs: PropTypes.array,
    value: PropTypes.string,
    onChangeSelection: PropTypes.func,
};

export default Tabs;