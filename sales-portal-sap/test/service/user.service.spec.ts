import { UserService } from '../../app/service/user.service';
import { UserModel } from '../../app/models/user.model';
import logger from '../../app/lib/logger';
import otpEvents from '../../app/helper/otp';
import Email from '../../app/helper/email';
import commenHelper from '../../app/helper';


jest.mock('../../app/models/user.model');
jest.mock('../../app/lib/logger');
jest.mock('../../app/helper/otp');
jest.mock('../../app/helper/email');
jest.mock('../../app/helper');


describe('getAlert', () => {
                test('should return alert data for a given user_id', async () => {
                    const mockAlertData = { alert: 'test alert' };
                    (UserModel.getAlert as jest.Mock).mockResolvedValue(mockAlertData);
        
                    const result = await UserService.getAlert('user123');
                    expect(result).toEqual(mockAlertData);
                    expect(UserModel.getAlert).toHaveBeenCalledWith('user123');
                });
        
                test('should return null if an error occurs', async () => {
                    (UserModel.getAlert as jest.Mock).mockRejectedValue(new Error('Test error'));
        
                    const result = await UserService.getAlert('user123');
                    expect(result).toBeNull();
                    expect(logger.error).toHaveBeenCalled();
                });
            });
        
            describe('getTseAsmAdminDetails', () => {
                test('should return TSE ASM Admin details for a given userId', async () => {
                    const mockDetails = { details: 'test details' };
                    (UserModel.getTseAsmAdminDetails as jest.Mock).mockResolvedValue(mockDetails);
        
                    const result = await UserService.getTseAsmAdminDetails('user123');
                    expect(result).toEqual(mockDetails);
                    expect(UserModel.getTseAsmAdminDetails).toHaveBeenCalledWith('user123');
                });
        
                test('should return null if an error occurs', async () => {
                    (UserModel.getTseAsmAdminDetails as jest.Mock).mockRejectedValue(new Error('Test error'));
        
                    const result = await UserService.getTseAsmAdminDetails('user123');
                    expect(result).toBeNull();
                    expect(logger.error).toHaveBeenCalled();
                });
            });
        
            describe('updateEmail', () => {
                test('should update email and send notifications', async () => {
                    const mockUpdateResponse = { command: 'UPDATE' };
                    (UserModel.updateEmail as jest.Mock).mockResolvedValue(mockUpdateResponse);
                    const otpData = [{ user_mobile_number: '1234567890', email: 'test@example.com' }];
                    const updatedBy = { first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com' };
        
                    const result = await UserService.updateEmail({}, {}, otpData, true, true, updatedBy);
                    expect(result).toBe(true);
                    expect(UserModel.updateEmail).toHaveBeenCalled();
                    expect(otpEvents.send_sms_tse_admin_update_email_mobile).toHaveBeenCalled();
                    expect(Email.send_email_tse_admin_update_email_mobile).toHaveBeenCalled();
                });
        
                test('should return false if update fails', async () => {
                    const mockUpdateResponse = { command: 'FAIL' };
                    (UserModel.updateEmail as jest.Mock).mockResolvedValue(mockUpdateResponse);
        
                    const result = await UserService.updateEmail({}, {}, [], false, false, null);
                    expect(result).toBe(false);
                });
            });
        
            describe('updateMobileEmail', () => {
                test('should update mobile email and send notifications', async () => {
                    const mockUpdateResponse = { command: 'UPDATE' };
                    (UserModel.updateMobileEmail as jest.Mock).mockResolvedValue(mockUpdateResponse);
                    const otpData = [{ user_email: 'test@example.com' }];
                    const updatedBy = { first_name: 'John', last_name: 'Doe', email: 'john.doe@example.com' };
        
                    const result = await UserService.updateMobileEmail('column', {}, {}, otpData, true, true, updatedBy);
                    expect(result).toBe(true);
                    expect(UserModel.updateMobileEmail).toHaveBeenCalled();
                    expect(otpEvents.send_sms_tse_admin_update_email_mobile).toHaveBeenCalled();
                    expect(Email.send_email_tse_admin_update_email_mobile).toHaveBeenCalled();
                });
        
                test('should return false if update fails', async () => {
                    const mockUpdateResponse = { command: 'FAIL' };
                    (UserModel.updateMobileEmail as jest.Mock).mockResolvedValue(mockUpdateResponse);
        
                    const result = await UserService.updateMobileEmail('column', {}, {}, [], false, false, null);
                    expect(result).toBe(false);
                });
            });
        
            describe('emailIdexistOrNot', () => {
                test('should return email existence status', async () => {
                    const mockResponse = true;
                    (UserModel.emailidexistOrNot as jest.Mock).mockResolvedValue(mockResponse);
        
                    const result = await UserService.emailIdexistOrNot('test@example.com');
                    expect(result).toBe(mockResponse);
                    expect(UserModel.emailidexistOrNot).toHaveBeenCalledWith('test@example.com');
                });
            });
        
            describe('sendOtpMailMobile', () => {
                test('should send OTP via SMS', async () => {
                    const mockResponse = { success: true };
                    (UserModel.insertEmailMobileOtp as jest.Mock).mockResolvedValue(mockResponse);
                    (commenHelper.otp as jest.Mock).mockReturnValue('123456');
        
                    const result = await UserService.sendOtpMailMobile('sms', '1234567890', 'login123', 'John Doe', 'remark');
                    expect(result).toBe(mockResponse);
                    expect(otpEvents.send_update_otp).toHaveBeenCalled();
                });
        
                test('should send OTP via Email', async () => {
                    const mockResponse = { success: true };
                    (UserModel.insertEmailMobileOtp as jest.Mock).mockResolvedValue(mockResponse);
                    (commenHelper.otp as jest.Mock).mockReturnValue('123456');
                    (commenHelper.encrypt as jest.Mock).mockReturnValue('encryptedLoginId');
        
                    const result = await UserService.sendOtpMailMobile('email', 'test@example.com', 'login123', 'John Doe', 'remark');
                    expect(result).toBe(mockResponse);
                    expect(Email.update_email).toHaveBeenCalled();
                });
            });
        
            describe('otpExistOrNot', () => {
                test('should return OTP existence status', async () => {
                    const mockResponse = true;
                    (UserModel.checkOtpExistOrNot as jest.Mock).mockResolvedValue(mockResponse);
        
                    const result = await UserService.otpExistOrNot('123456', 'login123');
                    expect(result).toBe(mockResponse);
                    expect(UserModel.checkOtpExistOrNot).toHaveBeenCalledWith('123456', 'login123');
                });
            });
        
            describe('userIdExistOrNotOtpTable', () => {
                test('should return user ID existence status in OTP table', async () => {
                    const mockResponse = true;
                    (UserModel.userIdExistOrNotOtpTable as jest.Mock).mockResolvedValue(mockResponse);
        
                    const result = await UserService.userIdExistOrNotOtpTable('login123');
                    expect(result).toBe(mockResponse);
                    expect(UserModel.userIdExistOrNotOtpTable).toHaveBeenCalledWith('login123');
                });
            });
        

            
         
            describe('fetchReservedCredit', () => {
                test('should fetch reserved credit for a given distributor ID', async () => {
                    const mockResponse = { credit: 100 };
                    (UserModel.fetchReservedCredit as jest.Mock).mockResolvedValue(mockResponse);
        
                    const result = await UserService.fetchReservedCredit('distributor123');
                    expect(result).toEqual(mockResponse);
                    expect(UserModel.fetchReservedCredit).toHaveBeenCalledWith('distributor123');
                });
        
                test('should return null if an error occurs', async () => {
                    (UserModel.fetchReservedCredit as jest.Mock).mockRejectedValue(new Error('Test error'));
        
                    const result = await UserService.fetchReservedCredit('distributor123');
                    expect(result).toBeNull();
                    expect(logger.error).toHaveBeenCalled();
                });
            });
        
            describe('insertReservedCredit', () => {
                test('should insert reserved credit', async () => {
                    const mockResponse = { success: true };
                    (UserModel.insertReservedCredit as jest.Mock).mockResolvedValue(mockResponse);
        
                    const result = await UserService.insertReservedCredit('dbCode123', 100, 'createdBy123');
                    expect(result).toBe(mockResponse);
                    expect(UserModel.insertReservedCredit).toHaveBeenCalledWith('dbCode123', 100, 'createdBy123');
                });
        
                test('should return null if an error occurs', async () => {
                    (UserModel.insertReservedCredit as jest.Mock).mockRejectedValue(new Error('Test error'));
        
                    const result = await UserService.insertReservedCredit('dbCode123', 100, 'createdBy123');
                    expect(result).toBeNull();
                    expect(logger.error).toHaveBeenCalled();
                });
            });
        
        
            describe('getSessionInvalidateStatus', () => {
                test('should return session invalidate status', async () => {
                    const mockResponse = true;
                    (UserModel.getInvalidateSessionStatus as jest.Mock).mockResolvedValue(mockResponse);
        
                    const result = await UserService.getSessionInvalidateStatus('login123', 'uuid123');
                    expect(result).toBe(mockResponse);
                    expect(UserModel.getInvalidateSessionStatus).toHaveBeenCalledWith('login123', 'uuid123');
                });
            });
        
            describe('getPromiseTimeFlag', () => {
                test('should return promise time flag', async () => {
                    const mockResponse = true;
                    (UserModel.getPromiseTimeFlag as jest.Mock).mockResolvedValue(mockResponse);
        
                    const result = await UserService.getPromiseTimeFlag('distributor123');
                    expect(result).toBe(mockResponse);
                    expect(UserModel.getPromiseTimeFlag).toHaveBeenCalledWith('distributor123');
                });
            });
