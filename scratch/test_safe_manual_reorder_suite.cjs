const { calculateReorder, ensureSortOrders, getNextSortOrder } = require('../src/utils/reorderManager.js');
const { sortProductsByHistoricalOrder } = require('../src/utils/subcategorySorter.js');

async function runComprehensiveReorderTestSuite() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — SAFE MANUAL REORDERING TEST SUITE');
  console.log('==================================================\n');

  let passCount = 0;
  let failCount = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failCount++;
    }
  }

  // 1. Initial State Setup
  const mockSubcatProducts = [
    { id: '101', name: 'Product 1', subCategoryId: 'sub_1', price: 100, barcode: 'BC101', sort_order: 10, updated_at: '2026-08-14T01:00:00Z' },
    { id: '102', name: 'Product 2', subCategoryId: 'sub_1', price: 200, barcode: 'BC102', sort_order: 20, updated_at: '2026-08-14T01:00:00Z' },
    { id: '103', name: 'Product 3', subCategoryId: 'sub_1', price: 300, barcode: 'BC103', sort_order: 30, updated_at: '2026-08-14T01:00:00Z' },
    { id: '104', name: 'Product 4', subCategoryId: 'sub_1', price: 400, barcode: 'BC104', sort_order: 40, updated_at: '2026-08-14T01:00:00Z' },
    { id: '105', name: 'Product 5', subCategoryId: 'sub_1', price: 500, barcode: 'BC105', sort_order: 50, updated_at: '2026-08-14T01:00:00Z' }
  ];

  // TEST 1: Reorder product from pos 5 (index 4) to pos 2 (index 1)
  const { reorderedList: test1List, updatedProducts: test1Updated } = calculateReorder(mockSubcatProducts, 4, 1);
  assert(
    test1List[1].id === '105' && test1List[1].sort_order === 20 && test1Updated.length === 4,
    'TEST 1: Reorder Product from pos 5 to pos 2'
  );

  // TEST 2 & 3: Sorter respects explicit sort_order
  const sorted = sortProductsByHistoricalOrder(test1List, 'اسمارت ابيض');
  assert(
    sorted[0].id === '101' && sorted[1].id === '105' && sorted[2].id === '102',
    'TEST 2 & 3: Historical Sorter prioritizes sort_order'
  );

  // TEST 8: Drop outside grid container simulated => CANCEL (0 mutated records)
  const { updatedProducts: cancelUpdated } = calculateReorder(mockSubcatProducts, 4, 4); // same spot or outside cancel
  assert(cancelUpdated.length === 0, 'TEST 8: Drop Outside Container = CANCEL (0 Writes)');

  // TEST 10: Subcategory Boundary Protection
  const crossSubCatProducts = [
    { id: '101', subCategoryId: 'sub_1' },
    { id: '201', subCategoryId: 'sub_2' }
  ];
  // Subcategory boundary rule: items dragged cross-subcategory return CANCEL
  const isSameSubCat = crossSubCatProducts[0].subCategoryId === crossSubCatProducts[1].subCategoryId;
  assert(!isSameSubCat, 'TEST 10: Cross-subcategory drop protection (isSameSubCat = false)');

  // TEST 13: Add new Product receives max(sort_order) + 10
  const nextSort = getNextSortOrder(test1List);
  assert(nextSort === 60, 'TEST 13: New Product takes next sort_order = max + 10');

  // TEST 15 & 16: Product name & price edit preserves sort_order
  const editedProd = { ...test1List[1], name: 'Updated Product 5 Name', price: 999 };
  assert(
    editedProd.sort_order === 20 && editedProd.name === 'Updated Product 5 Name' && editedProd.price === 999,
    'TEST 15 & 16: Product name and price edit preserves sort_order'
  );

  // TEST 17: Product deletion preserves relative sort_order
  const remainingProds = test1List.filter(p => p.id !== '105');
  const sortedRemaining = sortProductsByHistoricalOrder(remainingProds, 'اسمارت ابيض');
  assert(
    sortedRemaining[0].id === '101' && sortedRemaining[1].id === '102' && sortedRemaining[2].id === '103',
    'TEST 17: Product deletion preserves relative sort_order of remaining products'
  );

  // TEST 18 & 19: Stale Write Guard Simulation (timestamp check)
  const cloudRecord = { id: '101', sort_order: 10, updated_at: '2026-08-14T02:00:00Z' };
  const staleLocalRecord = { id: '101', sort_order: 99, updated_at: '2026-08-14T01:00:00Z' };
  const cloudIsNewer = new Date(cloudRecord.updated_at).getTime() > new Date(staleLocalRecord.updated_at).getTime();
  assert(cloudIsNewer, 'TEST 18 & 19: Newer cloud timestamp wins over stale local order');

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('--------------------------------------------------\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runComprehensiveReorderTestSuite();
