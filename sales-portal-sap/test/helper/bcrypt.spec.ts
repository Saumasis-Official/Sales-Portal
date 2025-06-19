import helper from '../../app/helper/bcrypt';
import bcrypt from 'bcrypt-nodejs';

describe('bcrypt helper functions', () => {
    describe('generateSaltValue', () => {
        it('should generate a hashed password', () => {
            const password = 'ABC@123';
            const hash = helper.generateSaltValue(password);
            expect(hash).toBeDefined();
            expect(bcrypt.compareSync(password, hash)).toBe(true);
        });
    });

    describe('comparePassword', () => {
        it('should return true for matching passwords', () => {
            const password = 'ABC@123';
            const hash = helper.generateSaltValue(password);
            const result = helper.comparePassword(password, hash);
            expect(result).toBe(true);
        });

        it('should return false for non-matching passwords', () => {
            const password = 'ABC@123';
            const hash = helper.generateSaltValue(password);
            const result = helper.comparePassword('wrongPassword', hash);
            expect(result).toBe(false);
        });

        it('should return false if userPassword is empty', () => {
            const result = helper.comparePassword('', 'someHash');
            expect(result).toBe(false);
        });

        it('should return false if password is empty', () => {
            const result = helper.comparePassword('somePassword', '');
            expect(result).toBe(false);
        });
    });

    describe('authRedirectUrl', () => {
        it('should return the correct URL', () => {
            const path = 'somePath';
            const result = helper.authRedirectUrl(path);
            expect(result).toBe(`${global['configuration'].url.FE}/#/auth/validate-token/${path}`);
        });
    });

    describe('buildUserToken', () => {
        it('should return the correct user token object', () => {
            const data = { distributor_id: 123, password: 'ABC@123' };
            const result = helper.buildUserToken(data);
            expect(result).toEqual({ distributor_id: 123, hasPassword: true });
        });

        it('should return hasPassword as false if no password is provided', () => {
            const data = { distributor_id: 123 };
            const result = helper.buildUserToken(data);
            expect(result).toEqual({ distributor_id: 123, hasPassword: false });
        });
    });

    describe('resource', () => {
        it('should return the correct resource URL', () => {
            const path = '/somePath';
            const result = helper.resource(path);
            expect(result).toBe(`${global['configuration'].url.API}${path}`);
        });
    });

    describe('getFileExtension', () => {
        it('should return the correct file extension', () => {
            const file = 'test.jpg';
            const result = helper.getFileExtension(file);
            expect(result).toBe('jpg');
        });

        it('should return jpg if no extension is found', () => {
            const file = 'test';
            const result = helper.getFileExtension(file);
            expect(result).toBe('jpg');
        });
    });




});