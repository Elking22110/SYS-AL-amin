const { calculateReorder } = require('../src/utils/reorderManager.js');
const { sortProductsByHistoricalOrder } = require('../src/utils/subcategorySorter.js');

async function testReorderCommitAndPersistence() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — REORDER COMMIT & PERSISTENCE TEST');
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

  // Initial products array
  const initialProducts = [
    { id: '101', name: 'Product A', sub_category_id: 'sub1', sort_order: 10 },
    { id: '102', name: 'Product B', sub_category_id: 'sub1', sort_order: 20 },
    { id: '103', name: 'Product C', sub_category_id: 'sub1', sort_order: 30 },
    { id: '104', name: 'Product D', sub_category_id: 'sub1', sort_order: 40 },
    { id: '105', name: 'Product E', sub_category_id: 'sub1', sort_order: 50 }
  ];

  // TEST 1: Move E (index 4) to index 1 (between A and B)
  const { reorderedList: step1List, updatedProducts: step1Updated } = calculateReorder(initialProducts, 4, 1);
  const step1Names = step1List.map(p => p.name);

  assert(
    JSON.stringify(step1Names) === JSON.stringify(['Product A', 'Product E', 'Product B', 'Product C', 'Product D']),
    'TEST 1: Spliced array places Product E at index 1 -> [A, E, B, C, D]'
  );

  assert(
    step1Updated.length === 5,
    'TEST 2: All 5 affected items in subcategory returned in updatedProducts with fresh sort_order'
  );

  const step1SortOrders = step1List.map(p => p.sort_order);
  assert(
    JSON.stringify(step1SortOrders) === JSON.stringify([10, 20, 30, 40, 50]),
    'TEST 3: sort_order updated sequentially (10, 20, 30, 40, 50)'
  );

  // TEST 4: Historical sorter rehydration test
  const rehydratedStep1 = sortProductsByHistoricalOrder(step1List, 'اسمارت ابيض');
  const rehydratedNames = rehydratedStep1.map(p => p.name);
  assert(
    JSON.stringify(rehydratedNames) === JSON.stringify(['Product A', 'Product E', 'Product B', 'Product C', 'Product D']),
    'TEST 4: Sorter rehydrates exact order [A, E, B, C, D] using sort_order'
  );

  // TEST 5: Move B (now at index 2 in [A, E, B, C, D]) to the end (index 4)
  const { reorderedList: step2List, updatedProducts: step2Updated } = calculateReorder(step1List, 2, 4);
  const step2Names = step2List.map(p => p.name);

  assert(
    JSON.stringify(step2Names) === JSON.stringify(['Product A', 'Product E', 'Product C', 'Product D', 'Product B']),
    'TEST 5: Drag B to end -> Spliced array order = [A, E, C, D, B]'
  );

  const rehydratedStep2 = sortProductsByHistoricalOrder(step2List, 'اسمارت ابيض');
  const rehydratedStep2Names = rehydratedStep2.map(p => p.name);
  assert(
    JSON.stringify(rehydratedStep2Names) === JSON.stringify(['Product A', 'Product E', 'Product C', 'Product D', 'Product B']),
    'TEST 6: Sorter rehydrates exact order [A, E, C, D, B] after moving B to end'
  );

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('--------------------------------------------------\n');

  if (failCount > 0) process.exit(1);
}

testReorderCommitAndPersistence();
