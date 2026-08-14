async function runClickSuppressionTestSuite() {
  console.log('==================================================');
  console.log('SIS AL AMEEN — CLICK SUPPRESSION TEST SUITE');
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

  // Simulated Cart State
  const cart = [];
  function onAddToCart(product) {
    cart.push(product);
  }

  // Simulated Drag & Click Guard State
  let isDragging = false;
  let didDrag = false;
  let suppressNextClick = false;
  let suppressTimeout = null;

  function triggerClickSuppression() {
    suppressNextClick = true;
    didDrag = true;
    if (suppressTimeout) clearTimeout(suppressTimeout);
    suppressTimeout = setTimeout(() => {
      suppressNextClick = false;
      didDrag = false;
    }, 250);
  }

  function shouldSuppressClick() {
    return isDragging || suppressNextClick || didDrag;
  }

  function handleCardClick(product) {
    if (shouldSuppressClick()) {
      return; // Intercepted & Suppressed
    }
    onAddToCart(product);
  }

  // TEST 1: Long Press Product A (Drag Starts)
  const productA = { id: '101', name: 'Product A', price: 100 };
  const productB = { id: '102', name: 'Product B', price: 200 };

  isDragging = true;
  didDrag = true;
  suppressNextClick = true;

  handleCardClick(productA);
  assert(cart.length === 0, 'TEST 1: Long Press Product A -> Drag starts -> ZERO cart additions');

  // TEST 2: Drag Product A over Product B
  handleCardClick(productB);
  assert(cart.length === 0, 'TEST 2: Hover/drag over Product B -> Product B is NOT added to cart');

  // TEST 3: Drop A inside valid location (Drag Ends)
  triggerClickSuppression();
  isDragging = false;

  // Browser fires delayed click on release
  handleCardClick(productA);
  assert(cart.length === 0, 'TEST 3: Valid Drop -> Delayed click suppressed -> Cart unchanged');

  // TEST 4: Drop A outside Grid (Cancel Drag)
  triggerClickSuppression();
  isDragging = false;
  handleCardClick(productA);
  assert(cart.length === 0, 'TEST 4: Outside Cancel -> Delayed click suppressed -> Cart unchanged');

  // TEST 5: Long Press + Drag + Release
  triggerClickSuppression();
  handleCardClick(productA);
  handleCardClick(productB);
  assert(cart.length === 0, 'TEST 5: PointerUp release window -> ZERO delayed clicks fire');

  // Wait 300ms for suppression window to expire
  await new Promise(r => setTimeout(r, 300));

  // TEST 6: Normal Short Click (< 500ms)
  isDragging = false;
  didDrag = false;
  suppressNextClick = false;
  handleCardClick(productA);
  assert(cart.length === 1 && cart[0].id === '101', 'TEST 6: Normal short click -> Add to cart executes 100% normally');

  // TEST 7: Touch Long Press + Drag
  isDragging = true;
  didDrag = true;
  suppressNextClick = true;
  handleCardClick(productA);
  triggerClickSuppression();
  isDragging = false;
  handleCardClick(productA);
  assert(cart.length === 1, 'TEST 7: Touch Long Press + Drag -> ZERO tap selections or extra items in cart');

  console.log('\n--------------------------------------------------');
  console.log(`TOTAL PASSED: ${passCount}`);
  console.log(`TOTAL FAILED: ${failCount}`);
  console.log('--------------------------------------------------\n');

  if (failCount > 0) process.exit(1);
}

runClickSuppressionTestSuite();
