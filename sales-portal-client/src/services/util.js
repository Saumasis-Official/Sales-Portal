export const formatPrice = (x, currency) => {
  switch (currency) {
    case 'BRL':
      return x.toFixed(2).replace('.', ',');
    default:
      return x.toFixed(2);
  }
};
   
export const productsAPI =
  'http://ms-tcpl.com/order/v1/get_materials';
