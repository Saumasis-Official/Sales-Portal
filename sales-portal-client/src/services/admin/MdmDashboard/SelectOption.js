import React, { useEffect } from 'react';
import { Select, Space } from 'antd';
import './MdmMasterDashboard';
const { Option } = Select;


function SelectOption(props) {
  const { mandatory, values } = props;
  const [dropDownOpenFlag, setDropDownOpenFlag] =
    React.useState(false);
  const [selectedValue, setSelectedValue] = React.useState();
  const handleChangeSelect = () => {
    if (!dropDownOpenFlag) {
      switch (props.for) {
        case 'Customer Name':
          props.setKams(selectedValue);
          break;
        case 'Customer Code':
          props.setCustomerCode(selectedValue);
          break;
        case 'Site Code':
          props.setSiteCode(selectedValue);
          break;
        case 'Region':
          props.setRegion(selectedValue);
          break;
        case 'Depot Code':
          props.setDepotCode(selectedValue);
          break;
        case 'Vendor Code':
          props.setVendorCode(selectedValue);
          break;
        case 'Status':
          props.setStatus(selectedValue);
          break;
        case 'Article Code':
          props.setArticleCode(selectedValue);
          break;
        case 'Article Description':
          props.setArticleDescription(selectedValue);
          break;

        default:
          break;
      }
    }
  };
  useEffect(() => {
    handleChangeSelect();
  }, [props.disable, selectedValue, dropDownOpenFlag]);
  useEffect(() => {
    values === '' && setSelectedValue();
  }, [values]);
  return (
    <React.Fragment>
      <div
        class="input-container"
        style={{ display: 'inline-block' }}
      >
        <Select
          className="Select-Option notch-input"
          mode={props.mode ? props.mode : 'multiple'}
          style={{ width: '90%' }}
          bordered={false}
          placeholder="Select a value"
          direction="x"
          value={selectedValue}
          onChange={(e) => setSelectedValue(e)}
          onDropdownVisibleChange={(e) => setDropDownOpenFlag(e)}
          optionLabelProp="label"
          disabled={props.disable ? props.disable : false}
        >
          {props?.value
            ?.filter((obj, index, arr) => {
              return (
                arr
                  .map((mapObj) => mapObj[props.for])
                  .indexOf(obj[props.for]) === index
              );
            })
            .map((Options) => {
              if (Options[props.for] != null) {
                return (
                  <Option
                    value={Options[props.for]}
                    label={Options[props.for]}
                  >
                    <Space>{Options[props.for]}</Space>
                  </Option>
                );
              }
            })}
        </Select>
        <label for="myField" class="notch-label">
          {props.for}
          {mandatory && <b className="mandatory-mark">*</b>}
        </label>
      </div>
    </React.Fragment>
  );
}

export default SelectOption;
