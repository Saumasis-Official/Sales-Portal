import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './index.css';

const Radio = (props) => {
    const {
        id,
        containerClass, value,
        error, onChange, type, label, required, name,
        hasInvalidSubmitOccurred, placeholder, checked,
        disabled, onBlur, getRef = "", className, labelClass, ...rest
    } = props;

    const [touched, setTouched] = useState(false);

    const handleInputBlur = (e, name) => {
        setTouched(true);
        if (onBlur) {
            onBlur(e, name);
        }
    };


    const displayError = touched || hasInvalidSubmitOccurred;

    return (
        <div
            className={`inner-wrap radio-btn clearfix ${containerClass || ''} ${displayError && error ? 'error' : ''}`}

        >

            <input
                id={id}
                ref={getRef}
                name={name}
                disabled={disabled}
                type='radio'
                value={value}
                className={`input-element ${value ? 'filled' : ''} ${className}`}
                onChange={e => onChange(e, name)}
                onBlur={e => handleInputBlur(e, name)}
                placeholder={placeholder}
                checked={checked}
                {...rest}
            />
            {
                label &&
                <label
                    htmlFor={id}
                    className={labelClass}
                >
                    {label}

                </label>
            }
        </div>
    );

}


Radio.propTypes = {
    id: PropTypes.string,
    value: PropTypes.string,
    error: PropTypes.string,
    onChange: PropTypes.func,
    type: PropTypes.string,
    label: PropTypes.string,
    required: PropTypes.bool,
    name: PropTypes.string,
    placeholder: PropTypes.string,
    disabled: PropTypes.bool,
    onBlur: PropTypes.func,
    hasInvalidSubmitOccurred: PropTypes.bool,
    getRef: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.func,
    ]),
    className: PropTypes.string,
    labelClass: PropTypes.string,
    containerClass: PropTypes.string
};

Radio.defaultProps = {
    disabled: false,
    id: '',
    value: '',
    error: '',
    onChange: () => { },
    type: '',
    label: '',
    required: false,
    name: '',
    mask: '',
    placeholder: '',
    containerClass: '',
    onBlur: () => { },
    hasInvalidSubmitOccurred: false,
    getRef: () => { },
    className: '',
    labelClass: '',
};

export default Radio;