import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import store from './services/store';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter, Route } from 'react-router-dom';
ReactDOM.render(
	<Provider store={store()}>
    <BrowserRouter>
      
	  <Route component={App}/>  
		
	</BrowserRouter>
	</Provider>,
	document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
