import { SapService } from '../../app/service/sap.service';
import { SapModel } from '../../app/models/sap.model';
import logger from '../../app/lib/logger';

jest.mock('../../app/models/sap.model');
jest.mock('../../app/lib/logger');

describe('SapService', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('userIdExistOrNotOtpTable', () => {
        it('should call SapModel.userIdExistOrNotOtpTable with the correct login_id', async () => {
            const login_id = 'abc.xyz@tataconsumer.com';
            await SapService.userIdExistOrNotOtpTable(login_id);
            expect(SapModel.userIdExistOrNotOtpTable).toHaveBeenCalledWith(login_id);
        });
    });

    describe('otpExistOrNot', () => {
        it('should call SapModel.checkOtpExistOrNot with the correct otp and login_id', async () => {
            const otp = '123456';
            const login_id = 'abc.xyz@tataconsumer.com';
            await SapService.otpExistOrNot(otp, login_id);
            expect(SapModel.checkOtpExistOrNot).toHaveBeenCalledWith(otp, login_id);
        });
    });

    describe('getTseAsmAdminDetails', () => {
        it('should call SapModel.getTseAsmAdminDetails with the correct userId', async () => {
            const userId = 'abc.xyz@tataconsumer.com';
            await SapService.getTseAsmAdminDetails(userId);
            expect(SapModel.getTseAsmAdminDetails).toHaveBeenCalledWith(userId);
        });
    });

    describe('soNumberWithDistributorId', () => {
        it('should call SapModel.soNumberWithDistributorId with the correct soNumber and distId', async () => {
            const soNumber = '1234567';
            const distId = '132452';
            await SapService.soNumberWithDistributorId(soNumber, distId);
            expect(SapModel.soNumberWithDistributorId).toHaveBeenCalledWith(soNumber, distId);
        });
    });

    describe('getOrderByDeliveryNumber', () => {
        it('should call SapModel.getOrderByDeliveryNumber with the correct deliveryNumber and login_id', async () => {
            const deliveryNumber = '9875612345';
            const login_id = 'abc.xyz@tataconsumer.com';
            await SapService.getOrderByDeliveryNumber(deliveryNumber, login_id);
            expect(SapModel.getOrderByDeliveryNumber).toHaveBeenCalledWith(deliveryNumber, login_id);
        });
    });

    describe('getOrderByInvoiceNumber', () => {
        it('should call SapModel.getOrderByInvoiceNumber with the correct invoiceNumber and login_id', async () => {
            const invoiceNumber = '125567';
            const login_id = 'abc.xyz@tataconsumer.com';
            await SapService.getOrderByInvoiceNumber(invoiceNumber, login_id);
            expect(SapModel.getOrderByInvoiceNumber).toHaveBeenCalledWith(invoiceNumber, login_id);
        });
    });

    describe('getAppLevelSettingsByKeys', () => {
        it('should call SapModel.getAppLevelSettingsByKeys with the correct keys', async () => {
            const keys = ['key1', 'key2'];
            const keysString = "'key1','key2'";
            await SapService.getAppLevelSettingsByKeys(keys);
            expect(SapModel.getAppLevelSettingsByKeys).toHaveBeenCalledWith(keysString);
        });
    });

    describe('getPDPDayReferenceDateByDistributorId', () => {
        it('should call SapModel.getPDPDayReferenceDateByDistributorId with the correct login_id', async () => {
            const login_id = 'abc.xyz@tataconsumer.com';
            await SapService.getPDPDayReferenceDateByDistributorId(login_id);
            expect(SapModel.getPDPDayReferenceDateByDistributorId).toHaveBeenCalledWith(login_id);
        });
    });


 
});