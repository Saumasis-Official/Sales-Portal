
const bcrypt = require('bcrypt-nodejs');
const jwt = require('jsonwebtoken');
const {url} = global['configuration']
const {uploadpath} = global['configuration']
const path = require('path');
const fs = require('fs');
const helper = {
  generateSaltValue(password) {
    const salt = bcrypt.genSaltSync(); // enter number of rounds, default: 10
    const hash = bcrypt.hashSync(password, salt);
    return hash;
  },
  comparePassword(userPassword, password ) {
    if (!userPassword.length ||  !( password && password.length > 0) ) {
      return false;
    }
    return bcrypt.compareSync(userPassword, password);
  },
  authRedirectUrl( path ) {
		return `${url.FE}/validate-token/${path}`;
	},
	
  buildUserToken(data) {
    return {
        login_id: data.id,
		type: data.type,
		name: data.name,
		hasPassword: data.password ? true : false
    }
  },
  resource( path ) {
		return `${url.API}${path}`;
	},
  getFileExtension( file ) {
		let extensions = file.split('.');
		if ( extensions.length === 1 ) {
			return 'jpg';
		} else {
			return extensions.pop();
		}
	},
	avatarURL( filename ) {
		if ( filename.includes('://') ) {
			return filename;
		}
		return this.resource(`/${uploadpath.uploaddir}/${uploadpath.profiledir}/${filename}`);
	},
	userDocumentURL( filename ) {
		if ( filename.includes('://') ) {
			return filename;
		}
		return this.resource(`/${uploadpath.uploaddir}/${uploadpath.documentdir}/${filename}`);
	},
	getPaymentMethodName( method ) {
		if ( method == 1 ) { return 'PayPal'; }
		else if ( method == 2 ) { return 'PayPal'; }
		else if ( method == 3 ) { return 'Instamojo'; }
		else { return 'Not Specified'; }
	},
	getCurrency(currency) {
		let allCurrency = {
			1: 'USD',
			2: 'INR',
		};

		if( allCurrency[currency] ) {
			return allCurrency[currency];
		} else {
			return allCurrency[1];
		}

	},
};

export default helper;


