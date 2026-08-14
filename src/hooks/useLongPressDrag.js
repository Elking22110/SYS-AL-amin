import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * Helper to discover the nearest scrollable parent element.
 */
function getScrollableParent(node) {
  if (!node) return window;
  let parent = node.parentElement;
  while (parent && parent !== document.body && parent !== document.documentElement) {
    const style = window.getComputedStyle(parent);
    const overflowY = style.overflowY;
    const isScrollable = (overflowY === 'auto' || overflowY === 'scroll') && parent.scrollHeight > parent.clientHeight;
    if (isScrollable) return parent;
    parent = parent.parentElement;
  }
  return window;
}

/**
 * Custom React Hook for Long-Press Drag & Drop Reordering
 * High-Precision Multi-Column Target Detection, GPU translate3d Overlay,
 * RAF Auto-Scroll Engine, Exact Grab Offset, Midpoint Hysteresis, and Click Suppression.
 */
export function useLongPressDrag({
  items = [],
  onReorder = async () => {},
  longPressDelay = 600
}) {
  const [dragState, setDragState] = useState({
    isDragging: false,
    draggedIndex: null,
    targetIndex: null,
    pointerPos: { x: 0, y: 0 },
    grabOffset: { x: 0, y: 0 },
    cardDimensions: { width: 180, height: 110 },
    isOverValid: false
  });

  const timerRef = useRef(null);
  const rafRef = useRef(null);
  const autoScrollRafRef = useRef(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const pointerOffsetRef = useRef({ x: 0, y: 0 });
  const cardDimensionsRef = useRef({ width: 180, height: 110 });
  const activeItemRef = useRef(null);
  const activeIndexRef = useRef(null);
  const activeTargetElRef = useRef(null);
  const containerRef = useRef(null);
  const lastTargetIndexRef = useRef(null);
  const lastPointerPosRef = useRef({ x: 0, y: 0 });

  // Click Suppression Refs
  const didDragRef = useRef(false);
  const suppressNextClickRef = useRef(false);
  const clearSuppressTimeoutRef = useRef(null);

  const shouldSuppressClick = useCallback(() => {
    return dragState.isDragging || suppressNextClickRef.current || didDragRef.current;
  }, [dragState.isDragging]);

  const triggerClickSuppression = useCallback(() => {
    suppressNextClickRef.current = true;
    didDragRef.current = true;
    if (clearSuppressTimeoutRef.current) clearTimeout(clearSuppressTimeoutRef.current);
    clearSuppressTimeoutRef.current = setTimeout(() => {
      suppressNextClickRef.current = false;
      didDragRef.current = false;
    }, 250);
  }, []);

  const cancelDrag = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }
    if (activeTargetElRef.current && activeTargetElRef.current.releasePointerCapture) {
      try {
        activeTargetElRef.current.releasePointerCapture(activeTargetElRef.current.__pointerId);
      } catch (_) {}
    }
    activeTargetElRef.current = null;

    setDragState({
      isDragging: false,
      draggedIndex: null,
      targetIndex: null,
      pointerPos: { x: 0, y: 0 },
      grabOffset: { x: 0, y: 0 },
      cardDimensions: { width: 180, height: 110 },
      isOverValid: false
    });
    activeItemRef.current = null;
    activeIndexRef.current = null;
    lastTargetIndexRef.current = null;
  }, []);

  /**
   * High-Precision Multi-Column & Single-Column Target Detection
   * Evaluates live DOMRects of all candidate cards in the SAME subcategory (excluding dragged item)
   */
  /**
   * High-Precision Row-First / Column-Second Grid Target Detection
   * Eliminates 2D Euclidean target oscillation across rows.
   * Grouping strategy:
   * 1. Query visible candidate cards in the SAME subcategory (excluding dragged item)
   * 2. Group candidate cards into visual rows based on top alignment (within 15px)
   * 3. Determine the EXACT visual row under/closest to clientY
   * 4. Determine the EXACT column/card target within that row under clientX
   */
  /**
   * High-Precision Direct-Hit First -> Row/Column Fallback Target Detection Engine
   * 1. Direct Hit Test via document.elementFromPoint(clientX, clientY)
   * 2. If pointer is directly over a valid Product Card: DIRECT HIT WINNER!
   * 3. If pointer is in a gap/padding/container: Row-First / Column-Second Fallback
   */
  /**
   * High-Precision Direct-Hit First -> Row/Column Fallback Target Detection Engine
   * 1. Direct Hit Test via document.elementsFromPoint(clientX, clientY)
   * 2. If pointer is directly over a valid Product Card: DIRECT HIT WINNER!
   * 3. If pointer is in a gap/padding/container: Row-First / Column-Second Fallback
   */
  const evaluateTargetAtPosition = useCallback((clientX, clientY) => {
    const elementUnderPointer = document.elementFromPoint(clientX, clientY);
    const container = containerRef.current || (elementUnderPointer && elementUnderPointer.closest('[data-reorder-container]'));

    if (!container) {
      setDragState(prev => ({
        ...prev,
        pointerPos: { x: clientX, y: clientY },
        isOverValid: false,
        targetIndex: null
      }));
      return null;
    }

    const draggedSubCat = activeItemRef.current?.sub_category_id || activeItemRef.current?.subCategoryId;
    const draggedIdx = activeIndexRef.current;

    // ─── STAGE 1: DIRECT PHYSICAL CARD HIT TEST (HIGHEST PRIORITY) ───
    const elementsStack = document.elementsFromPoint ? document.elementsFromPoint(clientX, clientY) : [elementUnderPointer];
    let directCardEl = null;
    let directIdx = null;

    for (const el of elementsStack) {
      if (!el) continue;
      const cardCandidate = el.closest('[data-reorder-index]');
      if (cardCandidate && container.contains(cardCandidate)) {
        const idxAttr = cardCandidate.getAttribute('data-reorder-index');
        if (idxAttr !== null) {
          const idx = parseInt(idxAttr, 10);
          if (!isNaN(idx) && idx !== draggedIdx) { // Must NOT be the dragged card itself!
            directCardEl = cardCandidate;
            directIdx = idx;
            break;
          }
        }
      }
    }

    if (directCardEl && directIdx !== null) {
      const targetItem = items[directIdx];
      const targetSubCat = targetItem?.sub_category_id || targetItem?.subCategoryId;
      const sameSubcategory = !draggedSubCat || !targetSubCat || String(draggedSubCat) === String(targetSubCat);

      if (sameSubcategory) {
        const rect = directCardEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const positionSide = clientX < centerX ? 'BEFORE' : 'AFTER';

        lastTargetIndexRef.current = directIdx;
        setDragState(prev => ({
          ...prev,
          pointerPos: { x: clientX, y: clientY },
          isOverValid: true,
          targetIndex: directIdx,
          targetProductName: targetItem?.name || '',
          targetProductId: targetItem?.id || '',
          targetPositionSide: positionSide,
          hitStage: 'DIRECT_HIT'
        }));

        return directIdx;
      }
    }

    // ─── STAGE 2: GAP FALLBACK (ROW-FIRST / COLUMN-SECOND GEOMETRY) ───
    const allCardEls = Array.from(container.querySelectorAll('[data-reorder-index]'));
    const candidateCards = [];

    for (const cardEl of allCardEls) {
      const idxAttr = cardEl.getAttribute('data-reorder-index');
      if (idxAttr === null) continue;
      const cardIdx = parseInt(idxAttr, 10);
      if (isNaN(cardIdx)) continue;
      if (cardIdx === draggedIdx) continue; // Exclude dragged item

      const targetItem = items[cardIdx];
      const targetSubCat = targetItem?.sub_category_id || targetItem?.subCategoryId;
      const sameSubcategory = !draggedSubCat || !targetSubCat || String(draggedSubCat) === String(targetSubCat);

      if (!sameSubcategory) continue;

      const rect = cardEl.getBoundingClientRect();
      candidateCards.push({
        element: cardEl,
        index: cardIdx,
        rect: rect,
        top: rect.top,
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2
      });
    }

    if (candidateCards.length === 0) {
      setDragState(prev => ({
        ...prev,
        pointerPos: { x: clientX, y: clientY },
        isOverValid: true,
        targetIndex: draggedIdx,
        targetProductName: items[draggedIdx]?.name || '',
        targetProductId: items[draggedIdx]?.id || '',
        targetPositionSide: 'BEFORE',
        hitStage: 'NONE'
      }));
      return draggedIdx;
    }

    // Group into visual rows
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

    for (const row of rows) {
      row.cards.sort((a, b) => a.left - b.left);
    }
    rows.sort((a, b) => a.top - b.top);

    // Select row
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

    // Select column
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

    const fallbackTargetIdx = selectedSlotCard.index;
    const fallbackItem = items[fallbackTargetIdx];
    const fallbackPositionSide = clientX < selectedSlotCard.centerX ? 'BEFORE' : 'AFTER';

    lastTargetIndexRef.current = fallbackTargetIdx;

    setDragState(prev => ({
      ...prev,
      pointerPos: { x: clientX, y: clientY },
      isOverValid: true,
      targetIndex: fallbackTargetIdx,
      targetProductName: fallbackItem?.name || '',
      targetProductId: fallbackItem?.id || '',
      targetPositionSide: fallbackPositionSide,
      hitStage: 'GAP_FALLBACK'
    }));

    return fallbackTargetIdx;
  }, [items]);

  // RAF Auto-Scroll Engine Loop
  const checkAndRunAutoScroll = useCallback(() => {
    if (!dragState.isDragging) return;

    const { x: clientX, y: clientY } = lastPointerPosRef.current;
    const scrollContainer = getScrollableParent(containerRef.current);

    let containerTop = 0;
    let containerBottom = window.innerHeight;

    if (scrollContainer !== window) {
      const rect = scrollContainer.getBoundingClientRect();
      containerTop = rect.top;
      containerBottom = rect.bottom;
    }

    const EDGE_THRESHOLD = 70; // Edge zone boundary in pixels
    const MAX_SPEED = 18;      // Max scroll speed per RAF frame

    let scrollDelta = 0;

    // Check Top Edge
    if (clientY - containerTop < EDGE_THRESHOLD && clientY - containerTop >= -20) {
      const dist = Math.max(0, clientY - containerTop);
      const ratio = (EDGE_THRESHOLD - dist) / EDGE_THRESHOLD;
      scrollDelta = -Math.max(2, Math.round(ratio * MAX_SPEED));
    }
    // Check Bottom Edge
    else if (containerBottom - clientY < EDGE_THRESHOLD && containerBottom - clientY >= -20) {
      const dist = Math.max(0, containerBottom - clientY);
      const ratio = (EDGE_THRESHOLD - dist) / EDGE_THRESHOLD;
      scrollDelta = Math.max(2, Math.round(ratio * MAX_SPEED));
    }

    if (scrollDelta !== 0) {
      if (scrollContainer === window) {
        window.scrollBy({ top: scrollDelta, behavior: 'instant' });
      } else {
        scrollContainer.scrollTop += scrollDelta;
      }

      // Re-evaluate target index under cursor after scrolling
      evaluateTargetAtPosition(clientX, clientY);

      autoScrollRafRef.current = requestAnimationFrame(checkAndRunAutoScroll);
    } else {
      if (autoScrollRafRef.current) {
        cancelAnimationFrame(autoScrollRafRef.current);
        autoScrollRafRef.current = null;
      }
    }
  }, [dragState.isDragging, evaluateTargetAtPosition]);

  const handlePointerDown = useCallback((e, index, item) => {
    if (e.button !== undefined && e.button !== 0) return;

    const target = e.target;
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('a') ||
      target.closest('.no-drag')
    ) {
      return;
    }

    const cardElement = target.closest('[data-reorder-index]');
    if (!cardElement) return;

    const rect = cardElement.getBoundingClientRect();
    pointerOffsetRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    cardDimensionsRef.current = {
      width: rect.width || 180,
      height: rect.height || 110
    };

    startPosRef.current = { x: e.clientX, y: e.clientY };
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    activeItemRef.current = item;
    activeIndexRef.current = index;
    activeTargetElRef.current = cardElement;
    cardElement.__pointerId = e.pointerId;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      didDragRef.current = true;
      suppressNextClickRef.current = true;

      if (cardElement.setPointerCapture && e.pointerId !== undefined) {
        try { cardElement.setPointerCapture(e.pointerId); } catch (_) {}
      }

      setDragState({
        isDragging: true,
        draggedIndex: index,
        targetIndex: index,
        pointerPos: { x: e.clientX, y: e.clientY },
        grabOffset: pointerOffsetRef.current,
        cardDimensions: cardDimensionsRef.current,
        isOverValid: true
      });
    }, longPressDelay);
  }, [longPressDelay]);

  const handlePointerMove = useCallback((e) => {
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);

    if (timerRef.current && !dragState.isDragging && (dx > 8 || dy > 8)) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      return;
    }

    if (!dragState.isDragging) return;

    if (e.cancelable) e.preventDefault();

    const clientX = e.clientX;
    const clientY = e.clientY;
    lastPointerPosRef.current = { x: clientX, y: clientY };

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      evaluateTargetAtPosition(clientX, clientY);

      if (!autoScrollRafRef.current) {
        checkAndRunAutoScroll();
      }
    });
  }, [dragState.isDragging, evaluateTargetAtPosition, checkAndRunAutoScroll]);

  const handlePointerUp = useCallback(async (e) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (autoScrollRafRef.current) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }

    if (!dragState.isDragging) return;

    triggerClickSuppression();

    const clientX = e?.clientX ?? lastPointerPosRef.current.x;
    const clientY = e?.clientY ?? lastPointerPosRef.current.y;

    // Freeze final pointer position and re-read live DOMRects to determine exact final target slot
    const finalTargetIdx = evaluateTargetAtPosition(clientX, clientY) ?? dragState.targetIndex;

    const fromIdx = activeIndexRef.current;
    const toIdx = finalTargetIdx;
    const isValid = dragState.isOverValid;

    cancelDrag();

    if (isValid && fromIdx !== null && toIdx !== null && fromIdx !== toIdx) {
      await onReorder(fromIdx, toIdx);
    } else {
      console.log('[Reorder] Drag cancelled (outside container or invalid drop). ZERO database writes.');
    }
  }, [dragState.isDragging, dragState.isOverValid, dragState.targetIndex, evaluateTargetAtPosition, onReorder, cancelDrag, triggerClickSuppression]);

  // Global window listeners for cancellation
  useEffect(() => {
    const handleGlobalCancel = () => {
      if (dragState.isDragging) {
        triggerClickSuppression();
      }
      cancelDrag();
    };
    window.addEventListener('pointercancel', handleGlobalCancel);
    window.addEventListener('touchcancel', handleGlobalCancel);
    window.addEventListener('blur', handleGlobalCancel);
    return () => {
      window.removeEventListener('pointercancel', handleGlobalCancel);
      window.removeEventListener('touchcancel', handleGlobalCancel);
      window.removeEventListener('blur', handleGlobalCancel);
    };
  }, [dragState.isDragging, cancelDrag, triggerClickSuppression]);

  return {
    dragState,
    containerRef,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    cancelDrag,
    shouldSuppressClick
  };
}

export default useLongPressDrag;
