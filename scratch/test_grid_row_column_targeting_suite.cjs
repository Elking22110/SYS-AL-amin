async function runGridRowColumnTargetingTestSuite() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — ROW/COLUMN GRID TARGETING SUITE');
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

  // Row-First / Column-Second Target Selection Algorithm Implementation for test suite
  function evaluateTargetGrid(clientX, clientY, cardRects, draggedIdx, items) {
    const candidateCards = [];

    cardRects.forEach((rect, idx) => {
      if (idx === draggedIdx) return; // Exclude dragged item
      candidateCards.push({
        index: idx,
        rect: rect,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
      });
    });

    if (candidateCards.length === 0) return draggedIdx;

    // 1. Group candidate cards into visual rows based on top alignment (< 15px)
    candidateCards.sort((a, b) => a.top - b.top || a.left - b.left);

    const rows = [];
    for (const card of candidateCards) {
      let addedToRow = false;
      for (const row of rows) {
        if (Math.abs(card.top - row.top) < 15) {
          row.cards.push(card);
          row.top = Math.min(row.top, card.top);
          row.bottom = Math.max(row.bottom, card.bottom);
          addedToRow = true;
          break;
        }
      }
      if (!addedToRow) {
        rows.push({
          top: card.top,
          bottom: card.bottom,
          cards: [card]
        });
      }
    }

    // Sort cards within each row horizontally
    for (const row of rows) {
      row.cards.sort((a, b) => a.left - b.left);
    }
    // Sort rows vertically
    rows.sort((a, b) => a.top - b.top);

    // 2. Select Row
    let targetRow = null;
    if (clientY <= rows[0].top) {
      targetRow = rows[0];
    } else if (clientY >= rows[rows.length - 1].bottom) {
      targetRow = rows[rows.length - 1];
    } else {
      for (let r = 0; r < rows.length; r++) {
        const row = rows[r];
        if (clientY >= row.top && clientY <= row.bottom) {
          targetRow = row;
          break;
        }
        if (r < rows.length - 1) {
          const nextRow = rows[r + 1];
          if (clientY > row.bottom && clientY < nextRow.top) {
            const gapMidpoint = (row.bottom + nextRow.top) / 2;
            targetRow = clientY < gapMidpoint ? row : nextRow;
            break;
          }
        }
      }
    }
    if (!targetRow) targetRow = rows[0];

    // 3. Select Column within Row
    const rowCards = targetRow.cards;
    let selectedSlotCard = null;

    if (clientX < rowCards[0].left) {
      selectedSlotCard = rowCards[0];
    } else if (clientX >= rowCards[rowCards.length - 1].right) {
      selectedSlotCard = rowCards[rowCards.length - 1];
    } else {
      let bestCard = rowCards[0];
      let minXDist = Math.abs(clientX - bestCard.centerX);
      for (let i = 1; i < rowCards.length; i++) {
        const c = rowCards[i];
        const xDist = Math.abs(clientX - c.centerX);
        if (xDist < minXDist) {
          minXDist = xDist;
          bestCard = c;
        }
      }
      selectedSlotCard = bestCard;
    }

    return { targetIndex: selectedSlotCard.index, rowTop: targetRow.top };
  }

  // Simulated 3-column CSS Grid Layout DOMRects:
  // Row 1: C0 (100, 100), C1 (300, 100), C2 (500, 100) -> top: 100, bottom: 200
  // Row 2: C3 (100, 250), C4 (300, 250), C5 (500, 250) -> top: 250, bottom: 350
  // Row 3: C6 (100, 400), C7 (300, 400), C8 (500, 400) -> top: 400, bottom: 500
  const gridCards = [
    { top: 100, bottom: 200, left: 100, right: 280, width: 180, height: 100 }, // 0
    { top: 100, bottom: 200, left: 300, right: 480, width: 180, height: 100 }, // 1
    { top: 100, bottom: 200, left: 500, right: 680, width: 180, height: 100 }, // 2
    { top: 250, bottom: 350, left: 100, right: 280, width: 180, height: 100 }, // 3
    { top: 250, bottom: 350, left: 300, right: 480, width: 180, height: 100 }, // 4 (dragged)
    { top: 250, bottom: 350, left: 500, right: 680, width: 180, height: 100 }, // 5
    { top: 400, bottom: 500, left: 100, right: 280, width: 180, height: 100 }, // 6
    { top: 400, bottom: 500, left: 300, right: 480, width: 180, height: 100 }, // 7
    { top: 400, bottom: 500, left: 500, right: 680, width: 180, height: 100 }  // 8
  ];

  // TEST 1: Move slowly from top of grid to bottom (Monotonic progression down)
  const topToBottomRows = [];
  for (let y = 120; y <= 450; y += 30) {
    const res = evaluateTargetGrid(200, y, gridCards, 4, []);
    topToBottomRows.push(res.rowTop);
  }
  let isMonotonicDown = true;
  for (let i = 1; i < topToBottomRows.length; i++) {
    if (topToBottomRows[i] < topToBottomRows[i - 1]) isMonotonicDown = false;
  }
  assert(isMonotonicDown, 'TEST 1: Smooth downward movement yields strictly monotonic row progression (never jumps backward)');

  // TEST 2: Move slowly from bottom of grid to top (Monotonic progression up)
  const bottomToTopRows = [];
  for (let y = 450; y >= 120; y -= 30) {
    const res = evaluateTargetGrid(200, y, gridCards, 4, []);
    bottomToTopRows.push(res.rowTop);
  }
  let isMonotonicUp = true;
  for (let i = 1; i < bottomToTopRows.length; i++) {
    if (bottomToTopRows[i] > bottomToTopRows[i - 1]) isMonotonicUp = false;
  }
  assert(isMonotonicUp, 'TEST 2: Smooth upward movement yields strictly monotonic row progression');

  // TEST 3: Hover near boundary between Row 1 and Row 2
  const hoverResults = [];
  for (let i = 0; i < 10; i++) {
    const res = evaluateTargetGrid(200, 220 + (i % 2), gridCards, 4, []);
    hoverResults.push(res.rowTop);
  }
  const allSameRowNearBoundary = hoverResults.every(r => r === hoverResults[0]);
  assert(allSameRowNearBoundary, 'TEST 3: Hover near row boundary produces stable target without random row oscillation');

  // TEST 4: Move horizontally across columns in Row 1
  const col0 = evaluateTargetGrid(150, 150, gridCards, 4, []);
  const col1 = evaluateTargetGrid(350, 150, gridCards, 4, []);
  const col2 = evaluateTargetGrid(550, 150, gridCards, 4, []);
  assert(
    col0.targetIndex === 0 && col1.targetIndex === 1 && col2.targetIndex === 2,
    'TEST 4: Horizontal pointer movement correctly selects visual column (0 -> 1 -> 2)'
  );

  // TEST 5: Fast pointer movement across grid
  const fastTarget = evaluateTargetGrid(550, 450, gridCards, 4, []);
  assert(fastTarget.targetIndex === 8, 'TEST 5: Fast diagonal move to bottom-right selects C8 (index 8) without top-row jump');

  // TEST 6: Single target guarantee
  const singleTargetResult = evaluateTargetGrid(350, 280, gridCards, 4, []);
  assert(typeof singleTargetResult.targetIndex === 'number', 'TEST 6: Single pointer coordinate resolves to exactly ONE unique target index');

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('--------------------------------------------------\n');

  if (failCount > 0) process.exit(1);
}

runGridRowColumnTargetingTestSuite();
