const { calculateReorder, ensureSortOrders, getNextSortOrder } = require('../src/utils/reorderManager.js');

function testReorderManager() {
  console.log('==================================================');
  console.log('TESTING REORDER MANAGER LOGIC');
  console.log('==================================================\n');

  const initialProducts = [
    { id: '1', name: 'Product A' },
    { id: '2', name: 'Product B' },
    { id: '3', name: 'Product C' },
    { id: '4', name: 'Product D' },
    { id: '5', name: 'Product E' }
  ];

  const withSortOrders = ensureSortOrders(initialProducts);
  console.log('1. Initialized Sort Orders:');
  console.table(withSortOrders.map(p => ({ id: p.id, name: p.name, sort_order: p.sort_order })));

  // Test 1: Move item at index 4 (Product E) to index 1 (between Product A and B)
  const { reorderedList, updatedProducts } = calculateReorder(withSortOrders, 4, 1);

  console.log('\n2. Reordered List (Moved E from pos 5 to pos 2):');
  console.table(reorderedList.map(p => ({ id: p.id, name: p.name, sort_order: p.sort_order })));

  console.log(`\n3. Updated Products Count: ${updatedProducts.length}`);

  // Test 2: Get next sort_order for new product
  const nextSort = getNextSortOrder(reorderedList);
  console.log(`\n4. Next Sort Order for New Product: ${nextSort} (Expected: 60)`);

  if (reorderedList[1].id === '5' && reorderedList[1].sort_order === 20 && nextSort === 60) {
    console.log('\n✅ REORDER MANAGER LOGIC PASSED!');
  } else {
    console.error('\n❌ Test failed!');
    process.exit(1);
  }
}

testReorderManager();
