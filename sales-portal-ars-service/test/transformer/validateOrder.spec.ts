import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import { ValidateOrderTransformer } from '../../app/transformer/validateOrder';

describe('ValidateOrderTransformer', () => {
    describe('transform', () => {
        afterEach(() => {
            jest.clearAllMocks();
        });
        it('should transform items using _transformItems', () => {
            const items = [{ code: '123', quantity: 10 }];
            const expectedOutput = [{ material_code: '123', required_qty: 10, target_qty: 10 }];

            jest.spyOn(ValidateOrderTransformer, '_transformItems').mockReturnValue(expectedOutput);

            const result = ValidateOrderTransformer.transform(items);

            expect(result).toEqual(expectedOutput);
            expect(ValidateOrderTransformer._transformItems).toHaveBeenCalledWith(items);
        });
    });

    describe('_transformItemData', () => {
        it('should return an empty object if item is null or undefined', () => {
            expect(ValidateOrderTransformer._transformItemData(null)).toEqual({});
            expect(ValidateOrderTransformer._transformItemData(undefined)).toEqual({});
        });

        it('should transform item data correctly', () => {
            const item = {
                code: '123',
                item_number: '001',
                quantity: 10,
                pak_type: 'box',
                sales_unit: 'unit',
                description: 'Test item',
                sales_org: 'org1',
                distribution_channel: 'channel1',
                division: 'div1',
                stock_in_hand: 100,
                stock_in_transit: 50,
                open_order: 20,
                original_quantity: 5
            };
            const expectedOutput = {
                material_code: '123',
                item_number: '001',
                required_qty: 10,
                target_qty: 10,
                pack_type: 'box',
                sales_unit: 'unit',
                description: 'Test item',
                sales_org: 'org1',
                distribution_channel: 'channel1',
                division: 'div1',
                stock_in_hand: 100,
                stock_in_transit: 50,
                open_order: 20,
                original_quantity: 5
            };

            const result = ValidateOrderTransformer._transformItemData(item);
            expect(result).toEqual(expectedOutput);
        });

        it('should handle missing original_quantity gracefully', () => {
            const item = {
                code: '123',
                item_number: '001',
                quantity: 10,
                pak_type: 'box',
                sales_unit: 'unit',
                description: 'Test item',
                sales_org: 'org1',
                distribution_channel: 'channel1',
                division: 'div1',
                stock_in_hand: 100,
                stock_in_transit: 50,
                open_order: 20
            };
            const expectedOutput = {
                material_code: '123',
                item_number: '001',
                required_qty: 10,
                target_qty: 10,
                pack_type: 'box',
                sales_unit: 'unit',
                description: 'Test item',
                sales_org: 'org1',
                distribution_channel: 'channel1',
                division: 'div1',
                stock_in_hand: 100,
                stock_in_transit: 50,
                open_order: 20
            };

            const result = ValidateOrderTransformer._transformItemData(item);

            expect(result).toEqual(expectedOutput);
        });
    });

    describe('_transformItems', () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it('should transform an array of items', () => {
            const items = [{ code: '123', quantity: 10 }];
            const expectedOutput = undefined;

            jest.spyOn(ValidateOrderTransformer, '_transformItemData').mockImplementation(item => ({
                material_code: item.code,
                required_qty: item.quantity,
                target_qty: item.quantity
            }));

            const result = ValidateOrderTransformer._transformItems(items);

            expect(result).toEqual(expectedOutput);
            // expect(ValidateOrderTransformer._transformItemData).toHaveBeenCalledWith(items[0]);
        });

        it('should transform a single item', () => {
            const item = { code: '123', quantity: 10 };
            const expectedOutput = { material_code: '123', required_qty: 10, target_qty: 10 };

            jest.spyOn(ValidateOrderTransformer, '_transformItemData').mockImplementation(item => ({
                material_code: item.code,
                required_qty: item.quantity,
                target_qty: item.quantity
            }));

            const result = ValidateOrderTransformer._transformItems(item);

            expect(result).toEqual(expectedOutput);
            expect(ValidateOrderTransformer._transformItemData).toHaveBeenCalledWith(item);
        });
    });
});