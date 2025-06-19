import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './index.css';

const Toggle = (props) => {
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
        <label class="switch">
            <div
                className={`inner-wrap toggle-btn clearfix ${containerClass || ''} ${displayError && error ? 'error' : ''}`}

            >

                <input
                    id={id}
                    ref={getRef}
                    name={name}
                    disabled={disabled}
                    type='checkbox'
                    value={value}
                    className={`input-element ${value ? 'filled' : ''} ${className}`}
                    onChange={e => onChange(e, name)}
                    onBlur={e => handleInputBlur(e, name)}
                    placeholder={placeholder}
                    checked={checked}
                    {...rest}
                />
                <i className="custom-toggle"></i>
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
        </label>
    );

}


Toggle.propTypes = {
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

Toggle.defaultProps = {
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

export default Toggle;