import React from 'react';
import Enzyme, { shallow, render, mount } from 'enzyme';
import adapter from '@wojtekmaj/enzyme-adapter-react-17'
Enzyme.configure({ adapter: new adapter() });

/* Globals only for tests */
global.React = React;
global.shallow = shallow;
global.render = render;
global.mount = mount;   
