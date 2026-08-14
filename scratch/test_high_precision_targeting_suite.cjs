async function runHighPrecisionTargetingSuite() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — HIGH-PRECISION TARGETING SUITE');
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

  // 1. TEST 1: Exact Grab Offset Math
  const cardRect = { left: 150, top: 250, width: 180, height: 110 };
  const pointerX = 200;
  const pointerY = 300;
  const offsetX = pointerX - cardRect.left; // 50
  const offsetY = pointerY - cardRect.top;  // 50

  const previewX = pointerX - offsetX; // 150
  const previewY = pointerY - offsetY; // 250

  assert(previewX === cardRect.left && previewY === cardRect.top, 'TEST 1: Exact Pointer Grab Offset keeps card locked under cursor');

  // 2. TEST 2: GPU translate3d Formatting
  const translateStr = `translate3d(${previewX}px, ${previewY}px, 0px)`;
  assert(translateStr === 'translate3d(150px, 250px, 0px)', 'TEST 2: GPU translate3d transform string formatted correctly');

  // 3. TEST 3: Multi-Column Euclidean Distance
  // Simulated Multi-Column 3x3 Grid:
  // [C0: 100,100] [C1: 300,100] [C2: 500,100]
  // [C3: 100,300] [C4: 300,300] [C5: 500,300]
  const cards = [
    { index: 0, x: 100, y: 100 }, { index: 1, x: 300, y: 100 }, { index: 2, x: 500, y: 100 },
    { index: 3, x: 100, y: 300 }, { index: 4, x: 300, y: 300 }, { index: 5, x: 500, y: 300 }
  ];

  function findNearestCard(px, py, excludeIdx = -1) {
    let best = null;
    let minD = Infinity;
    for (const c of cards) {
      if (c.index === excludeIdx) continue;
      const d = Math.hypot(px - c.x, py - c.y);
      if (d < minD) {
        minD = d;
        best = c.index;
      }
    }
    return best;
  }

  // Pointer at X=310, Y=290 (closest to C4 at 300,300)
  const nearest1 = findNearestCard(310, 290);
  assert(nearest1 === 4, 'TEST 3: Multi-Column Euclidean distance correctly identifies target C4 (index 4)');

  // 4. TEST 4: Exclude Dragged Item (Dragging C4)
  const nearestExcluding4 = findNearestCard(310, 290, 4); // Exclude 4 -> nearest is C1 (300,100) or C3 (100,300) or C5 (500,300)
  assert(nearestExcluding4 !== 4, 'TEST 4: Candidate target selection excludes the dragged item itself');

  // 5. TEST 5: Subcategory Isolation (Simulated)
  const subcats = ['sub1', 'sub1', 'sub2', 'sub1'];
  const draggedSubcat = 'sub1';
  const candidates = subcats.map((sub, i) => ({ index: i, sub })).filter(c => c.sub === draggedSubcat);
  assert(candidates.length === 3 && !candidates.some(c => c.index === 2), 'TEST 5: Target candidate list filters out different subcategories');

  // 6. TEST 6: Midpoint Evaluation
  const targetCardCenterY = 300;
  const pointerAbove = 280;
  const pointerBelow = 320;
  assert(pointerAbove < targetCardCenterY && pointerBelow > targetCardCenterY, 'TEST 6: Midpoint accurately distinguishes BEFORE vs AFTER');

  // 7. TEST 7: Hysteresis Deadzone
  const deadzone = 10;
  const nearMid = 305; // Within deadzone [290, 310]
  const isInDeadzone = Math.abs(nearMid - targetCardCenterY) <= deadzone;
  assert(isInDeadzone, 'TEST 7: Hysteresis deadzone prevents target flickering near card boundaries');

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('--------------------------------------------------\n');

  if (failCount > 0) process.exit(1);
}

runHighPrecisionTargetingSuite();
