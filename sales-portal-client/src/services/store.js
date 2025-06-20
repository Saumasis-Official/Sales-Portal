import { compose, createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import rootReducer from './reducers';

export default initialState => {
  const store = createStore(  
    rootReducer,
    initialState,
    compose( applyMiddleware(thunk), window.devToolsExtension ? window.devToolsExtension() : f => f )
  );

  store.subscribe(() => {});

  return store;   
};
