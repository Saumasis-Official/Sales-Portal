import React from 'react';
import { Checkbox, Popover, Button, Row, Col } from 'antd';
import {
  FilterOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import '../services/admin/DashboardButton.css';

class DropdownCheckbox extends React.Component {
  state = {
    icon: {},
    selectedItems: [],
    open: false,
  };

  componentDidMount = () => {
    if (this.props.value && this.props.value.length) {
      this.setState(
        {
          selectedItems: [...this.props.value],
        },
        () => this.checkIconFilled(),
      );
    }
  };

  onChange = selection => {
    this.setState({ selectedItems: [...selection] }, () => {
      this.checkIconFilled();
    });

    return this.props.onChange(selection);
  };

  checkIconFilled = () => {
    if (this.state.selectedItems.length) {
      this.setState({ icon: { theme: "filled" } });
    } else {
      this.setState({ icon: {} });
    }
  };

  onSave = () => {
    this.setState({ open: false });
    this.props.isOpen(false);
    return this.props.onSave(this.state.selectedItems);
    };

  onReset = () => {
    this.setState({selectedItems: []},
        () => this.checkIconFilled(),);
  }
  onOpen = () => {
        this.props.isOpen(true);
        this.setState({ open: true });
        
    };
  handleOpenChange = (newOpen) => {
    this.setState({ open: newOpen });
    
    };

    
  checkboxRender = () => {
    const _this = this;

    const groups = this.props.options
      .map(function (e, i) {
        return i % 10 === 0
          ? _this.props.options.slice(i, i + 10)
          : null;
      })
      .filter(function (e) {
        return e;
      });

    const list = this.props.options;

    return (
      <div className='checkbox-body'>
        
        {/* <Checkbox.Group
          onChange={this.onChange}
          value={this.state.selectedItems}
        >
          <Row>
            {groups.map((group, i) => {
              return (
                <Col
                  key={'checkbox-group-' + i}
                  span={Math.floor(24 / groups.length)}
                >
                  {group.map((label, i) => {
                    return (
                      <Checkbox
                        key={label}
                        value={label}
                        // style={{ display: 'block', margin: '0' }}
                      >
                        {label}
                      </Checkbox>
                    );
                  })}
                </Col>
              );
            })}
          </Row>
        </Checkbox.Group> */}
        <Checkbox.Group
          onChange={this.onChange}
          value={this.state.selectedItems}
          style={{ width: '100%' }}
        >
          <Row 
          style={{maxWidth: `${Math.ceil(list.length/10)*100}px`}}
          >
            {list.map((item, index) => {
              return (
                <Col
                  key={'checkbox-group-' + index}
                  span={Math.floor(24 / Math.ceil(list.length/10))}
                //   style={{maxWidth:'100px'}}
                >
                  
                      <Checkbox
                        key={item}
                        value={item}
                        // style={{ display: 'block', margin: '0' }}
                      >
                        {item}
                      </Checkbox>
                    
                </Col>
              );
            })}
          </Row>
        </Checkbox.Group>
        <div className="checkbox-btns">
            <button className='rst-btn'onClick={this.onReset} disabled={this.state.selectedItems.length === 0}>
                Reset
            </button>
            <button className='ok-btn' onClick={this.onSave}>
                Ok
            </button>
            
        </div>
      </div>
    );
  };

  render() {
    const CheckboxRender = this.checkboxRender;
    return (
      <Popover
        content={<CheckboxRender/>}
        onOpenChange={this.handleOpenChange}
        trigger="click"
        placement="bottomLeft"
        visible = {this.state.open}
      >
        <Button disabled={this.props.disabled} style={{ backgroundColor: '#1268b3', color: '#fff' }} onClick={this.onOpen}>
          {this.props.name} <FilterOutlined />
        </Button>
      </Popover>
    );
  }
}

export default DropdownCheckbox;
