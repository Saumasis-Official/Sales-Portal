'use strict';

import _ from 'lodash';
// import ReviewTransformer from './ReviewTransformer';


let UserTransformer = {
  xx : (users) =>{
    if ( Array.isArray(users) ) {
			let output = [];
			users.forEach(( user ) => {
				output.push( UserTransformer._transformUsers(user) );
			});
			return output;
		}
		else {
			return UserTransformer._transformUsers(users);
		}
  },
  transform: (users) => {
    if (Array.isArray(users)) {
      let output = [];
      users.forEach((user) => {
        output.push(UserTransformer._transform(user));
      });
      return output;
    }
    else {
      return UserTransformer._transform(users);
    }
  },
  calculateUsers: (users: any | null) => {
    if (Array.isArray(users)) {
      return {
        Users : users.length ? users.length : 100,
        vehicles : (users['vehicle'] ) ? users['vehicle'].length : 1000,
        cities :100
      }
    }
  },

  _transform: (user) => {
    if (!user) { return {}; }
    return {
      id: user._d,
      status: user.status,
      name: user.name,
      email: user.email,
      password: (user.password) ? true : false,
      mobile: user.mobile || '',
      type: user.type || 1,
    };
  },
  transformUsers: ( users ) => {
		if ( Array.isArray(users) ) {
			let output = [];
			users.forEach(( user ) => {
				output.push( UserTransformer._transformUsers(user) );
			});
			return output;
		}
		else {
			return UserTransformer._transformUsers(users);
		}
	},
	_transformUsers: ( user ) => {
		if ( ! user ) { return {}; }
    const obj:any = {};

		return Object.assign({}, {
      id: user._d,
      status: user.status,
      name: user.name,
      email: user.email,
      type: user.type || 1,
		}, obj);
  }
}

export default UserTransformer;

