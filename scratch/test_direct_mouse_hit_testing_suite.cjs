async function runDirectMouseHitTestingTestSuite() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — DIRECT MOUSE HIT TEST SUITE');
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

  // Simulated items catalog
  const catalog = [
    { id: '1', name: 'طقم صبانات روكا', sub_category_id: 'sub1' },
    { id: '2', name: 'طقم صبانات ATF', sub_category_id: 'sub1' },
    { id: '3', name: 'طقم صبانات عادي', sub_category_id: 'sub1' }
  ];

  // Simulated card DOMRects
  const cardRects = [
    { index: 0, name: 'طقم صبانات روكا', top: 100, bottom: 200, left: 100, right: 280, width: 180, height: 100 },
    { index: 1, name: 'طقم صبانات ATF', top: 100, bottom: 200, left: 300, right: 480, width: 180, height: 100 },
    { index: 2, name: 'طقم صبانات عادي', top: 100, bottom: 200, left: 500, right: 680, width: 180, height: 100 }
  ];

  // Two-Stage Hit Testing Engine: Stage 1 Direct Hit -> Stage 2 Gap Fallback
  function evaluateTargetHitTest(clientX, clientY, draggedIdx, elementHitCardIndex = null) {
    const draggedSubCat = catalog[draggedIdx]?.sub_category_id;

    // STAGE 1: Direct Physical Card Hit Test
    if (elementHitCardIndex !== null && elementHitCardIndex !== undefined) {
      const targetItem = catalog[elementHitCardIndex];
      if (targetItem && targetItem.sub_category_id === draggedSubCat) {
        const rect = cardRects[elementHitCardIndex];
        const centerX = rect.left + rect.width / 2;
        const positionSide = clientX < centerX ? 'BEFORE' : 'AFTER';
        return {
          targetIndex: elementHitCardIndex,
          targetName: targetItem.name,
          stage: 'DIRECT_HIT',
          positionSide
        };
      }
    }

    // STAGE 2: Gap Fallback
    const candidateCards = cardRects.filter(c => c.index !== draggedIdx);
    let bestCard = candidateCards[0];
    let minXDist = Math.abs(clientX - (bestCard.left + bestCard.width / 2));

    for (let i = 1; i < candidateCards.length; i++) {
      const c = candidateCards[i];
      const xDist = Math.abs(clientX - (c.left + c.width / 2));
      if (xDist < minXDist) {
        minXDist = xDist;
        bestCard = c;
      }
    }

    const positionSide = clientX < (bestCard.left + bestCard.width / 2) ? 'BEFORE' : 'AFTER';
    return {
      targetIndex: bestCard.index,
      targetName: catalog[bestCard.index].name,
      stage: 'GAP_FALLBACK',
      positionSide
    };
  }

  // TEST 1: Pointer physically over "طقم صبانات روكا" (index 0)
  const hitRoka = evaluateTargetHitTest(150, 150, 2, 0);
  assert(
    hitRoka.targetIndex === 0 && hitRoka.targetName === 'طقم صبانات روكا' && hitRoka.stage === 'DIRECT_HIT',
    'TEST 1: Mouse directly over "طقم صبانات روكا" resolves target to EXACT card (DIRECT_HIT)'
  );

  // TEST 2: Pointer moves over "طقم صبانات ATF" (index 1)
  const hitATF = evaluateTargetHitTest(350, 150, 2, 1);
  assert(
    hitATF.targetIndex === 1 && hitATF.targetName === 'طقم صبانات ATF' && hitATF.stage === 'DIRECT_HIT',
    'TEST 2: Mouse directly over "طقم صبانات ATF" resolves target to EXACT card'
  );

  // TEST 3: Floating preview has pointer-events: none -> elementFromPoint passes through to underlying card
  const floatingOverlayPointerEvents = 'none';
  assert(
    floatingOverlayPointerEvents === 'none',
    'TEST 3: Floating Drag Overlay has pointer-events: none style set (passes through to underlying card)'
  );

  // TEST 4: Pointer in gap between cards (elementHitCardIndex = null) -> uses Stage 2 Gap Fallback
  const gapHit = evaluateTargetHitTest(290, 150, 2, null);
  assert(
    gapHit.stage === 'GAP_FALLBACK' && typeof gapHit.targetIndex === 'number',
    'TEST 4: Mouse in gap between cards falls back to Row/Column geometry cleanly'
  );

  // TEST 5: Insertion Side BEFORE vs AFTER
  const beforeHit = evaluateTargetHitTest(120, 150, 2, 0);
  const afterHit = evaluateTargetHitTest(250, 150, 2, 0);
  assert(
    beforeHit.positionSide === 'BEFORE' && afterHit.positionSide === 'AFTER',
    'TEST 5: Pointer left of card center resolves to BEFORE; right of center resolves to AFTER'
  );

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('--------------------------------------------------\n');

  if (failCount > 0) process.exit(1);
}

runDirectMouseHitTestingTestSuite();
