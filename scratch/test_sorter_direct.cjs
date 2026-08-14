const { sortProductsByHistoricalOrder } = require('../src/utils/subcategorySorter.js');

const testItems = [
  { id: '101', name: 'Product A', sub_category_id: 'بوصه 4', sort_order: 10 },
  { id: '102', name: 'Product B', sub_category_id: 'بوصه 4', sort_order: 30 },
  { id: '103', name: 'Product C', sub_category_id: 'بوصه 4', sort_order: 40 },
  { id: '104', name: 'Product D', sub_category_id: 'بوصه 4', sort_order: 50 },
  { id: '105', name: 'Product E', sub_category_id: 'بوصه 4', sort_order: 20 }
];

const sorted = sortProductsByHistoricalOrder(testItems, 'اسمارت ابيض');
console.log('Sorted:', sorted.map(p => ({ name: p.name, sort_order: p.sort_order })));
