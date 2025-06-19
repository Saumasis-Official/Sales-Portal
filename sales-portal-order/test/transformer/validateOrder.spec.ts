import { ValidateOrderTransformer } from '../../app/transformer/validateOrder';

describe('ValidateOrderTransformer', () => {
  describe('transform', () => {
    it('should transform an array of items', () => {
      const items = [
        {
          code: 'ABC123',
          item_number: '123',
          quantity: 10,
          pak_type: 'Box',
          sales_unit: 'EA',
          description: 'Product 1',
          sales_org: 'ORG1',
          distribution_channel: 'Channel1',
          division: 'Division1',
          stock_in_hand: 100,
          stock_in_transit: 50,
          open_order: 20,
        },
        {
          code: 'DEF456',
          item_number: '456',
          quantity: 5,
          pak_type: 'Pack',
          sales_unit: 'EA',
          description: 'Product 2',
          sales_org: 'ORG2',
          distribution_channel: 'Channel2',
          division: 'Division2',
          stock_in_hand: 200,
          stock_in_transit: 100,
          open_order: 10,
        },
      ];

      const transformedItems = ValidateOrderTransformer.transform(items);

      expect(transformedItems).toEqual([
        {
          original_quantity: undefined,
          material_code: 'ABC123',
          item_number: '123',
          required_qty: 10,
          target_qty: 10,
          pack_type: 'Box',
          sales_unit: 'EA',
          description: 'Product 1',
          sales_org: 'ORG1',
          distribution_channel: 'Channel1',
          division: 'Division1',
          stock_in_hand: 100,
          stock_in_transit: 50,
          open_order: 20,
        },
        {
          original_quantity: undefined,
          material_code: 'DEF456',
          item_number: '456',
          required_qty: 5,
          target_qty: 5,
          pack_type: 'Pack',
          sales_unit: 'EA',
          description: 'Product 2',
          sales_org: 'ORG2',
          distribution_channel: 'Channel2',
          division: 'Division2',
          stock_in_hand: 200,
          stock_in_transit: 100,
          open_order: 10,
        },
      ]);
    });

    it('should transform a single item', () => {
      const item = {
        code: 'ABC123',
        item_number: '123',
        quantity: 10,
        pak_type: 'Box',
        sales_unit: 'EA',
        description: 'Product 1',
        sales_org: 'ORG1',
        distribution_channel: 'Channel1',
        division: 'Division1',
        stock_in_hand: 100,
        stock_in_transit: 50,
        open_order: 20,
      };

      const transformedItem = ValidateOrderTransformer.transform(item);

      expect(transformedItem).toEqual({
        original_quantity: undefined,
        material_code: 'ABC123',
        item_number: '123',
        required_qty: 10,
        target_qty: 10,
        pack_type: 'Box',
        sales_unit: 'EA',
        description: 'Product 1',
        sales_org: 'ORG1',
        distribution_channel: 'Channel1',
        division: 'Division1',
        stock_in_hand: 100,
        stock_in_transit: 50,
        open_order: 20,
      });
    });
  });
});