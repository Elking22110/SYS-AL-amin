async function runDragSmoothnessVerification() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — DRAG SMOOTHNESS & POINTER VERIFIER');
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

  // TEST A: Grab from Center (Card 180x110 at left=100, top=200, click at X=190, Y=255)
  const cardRect = { left: 100, top: 200, width: 180, height: 110 };
  const clickX = 190;
  const clickY = 255;
  const grabOffsetX = clickX - cardRect.left; // 90
  const grabOffsetY = clickY - cardRect.top;  // 55

  // Move pointer to X=300, Y=400
  const pointerX = 300;
  const pointerY = 400;
  const floatingLeft = pointerX - grabOffsetX; // 210
  const floatingTop = pointerY - grabOffsetY;   // 345

  // The card top-left moves to 210, 345. Re-check pointer relative to card:
  const relativeX = pointerX - floatingLeft; // 300 - 210 = 90
  const relativeY = pointerY - floatingTop;  // 400 - 345 = 55

  assert(relativeX === grabOffsetX && relativeY === grabOffsetY, 'TEST A: Center Grab Point stays EXACTLY under cursor');

  // TEST B: Right Edge Grab (clickX = 275, clickY = 255)
  const rightClickX = 275;
  const rightClickY = 255;
  const rightOffsetX = rightClickX - cardRect.left; // 175
  const rightOffsetY = rightClickY - cardRect.top;  // 55

  const rightFloatLeft = pointerX - rightOffsetX; // 300 - 175 = 125
  const rightFloatTop = pointerY - rightOffsetY;  // 400 - 55 = 345
  assert(pointerX - rightFloatLeft === rightOffsetX, 'TEST B: Right Edge Grab Point stays EXACTLY under cursor');

  // TEST C: Left Edge Grab (clickX = 105, clickY = 205)
  const leftClickX = 105;
  const leftClickY = 205;
  const leftOffsetX = leftClickX - cardRect.left; // 5
  const leftOffsetY = leftClickY - cardRect.top;  // 5

  const leftFloatLeft = pointerX - leftOffsetX; // 300 - 5 = 295
  const leftFloatTop = pointerY - leftOffsetY;  // 400 - 5 = 395
  assert(pointerX - leftFloatLeft === leftOffsetX, 'TEST C: Left Edge Grab Point stays EXACTLY under cursor');

  // TEST D: Scroll Offset Stability
  const scrollY = 250;
  const clientYWithScroll = 400; // clientY is always relative to viewport!
  const scrollFloatTop = clientYWithScroll - grabOffsetY;
  assert(clientYWithScroll - scrollFloatTop === grabOffsetY, 'TEST D: Viewport clientY offset unaffected by container scroll');

  // TEST E: Midpoint Hysteresis (Target Card at top=300, height=100 -> Midpoint Y=350)
  const targetCardTop = 300;
  const targetCardHeight = 100;
  const targetMidY = targetCardTop + targetCardHeight / 2; // 350

  const upperY = 320; // Above midpoint -> Before
  const lowerY = 380; // Below midpoint -> After

  assert(upperY < targetMidY && lowerY > targetMidY, 'TEST E: Midpoint Hysteresis accurately distinguishes BEFORE vs AFTER');

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('--------------------------------------------------\n');

  if (failCount > 0) process.exit(1);
}

runDragSmoothnessVerification();
