import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './Selectbox.css';
import { Select } from 'antd';

class SelectBox extends Component {
  static propTypes = {
    options: PropTypes.array.isRequired,
    classes: PropTypes.string,
    mode: PropTypes.string,
    label: PropTypes.string.isRequired,
    value: PropTypes.string,
    allowClear: PropTypes.bool,
    mandatory: PropTypes.bool,
    showSearch: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
  };
  static defaultProps = {
    classes: '',
    mode: 'single',
    allowClear: true,
    mandatory: false,
    showSearch: true,
  };

  state = {
    selected: this.props.value || null
  };

  componentDidMount() {
    if (this.props.value) {
      this.setState({ selected: this.props.value });
    }
  }

  createOptions = options =>
    options.map(o => (
      <option value={o.value} key={o.value}>
        {o.label}
      </option>
    ));

  onChange = value => {
    this.setState({ selected: value });
    this.props.onChange(value);
  };

  render() {
    const { classes, options, mode, label, allowClear, mandatory, showSearch } = this.props;

    return (
      <div className="select-box-container">
        <Select
          className={`select-box-option notch-select ${classes}`}
          mode={mode}
          bordered={false}
          placeholder="Select a value"
          direction="x"
          value={this.state.selected}
          options={options}
          optionLabelProp="label"
          showSearch={showSearch}
          filterOption={(input, option) =>
            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
          }
          size="small"
          allowClear={allowClear}
          onChange={this.onChange}
        />
        <label className="select-box-notch-label">{label}{mandatory && <b className="mandatory-mark">*</b>}</label>
      </div>
    );
  }
}

export default SelectBox;
