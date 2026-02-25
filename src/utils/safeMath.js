/**
 * Utility functions for precise financial calculations.
 * JavaScript floating-point math can lead to precision errors (e.g., 0.1 + 0.2 = 0.30000000000000004).
 * This utility converts all amounts to integers (cents/piastras) before calculating,
 * ensuring absolute precision for accounting and tax calculations.
 */

export const safeMath = {
    // Convert float to precise integer (multiply by 100)
    toCents(amount) {
        if (!amount || isNaN(amount)) return 0;
        return Math.round(Number(amount) * 100);
    },

    // Convert integer back to standard float amount (divide by 100)
    fromCents(cents) {
        if (!cents || isNaN(cents)) return 0;
        return Number((Number(cents) / 100).toFixed(2));
    },

    // Safe Addition
    add(a, b) {
        const sumCents = this.toCents(a) + this.toCents(b);
        return this.fromCents(sumCents);
    },

    // Safe Subtraction
    subtract(a, b) {
        const diffCents = this.toCents(a) - this.toCents(b);
        return this.fromCents(diffCents);
    },

    // Safe Multiplication (e.g., Price * Quantity)
    multiply(amount, multiplier) {
        // Multiplier (quantity) does not need to be converted to cents
        const resultCents = Math.round(this.toCents(amount) * Number(multiplier));
        return this.fromCents(resultCents);
    },

    // Calculate Percentage (e.g., Tax or Discount %)
    calculatePercentage(amount, percentageStr) {
        const percentage = Number(percentageStr) || 0;
        if (percentage === 0) return 0;

        // Convert base amount to cents
        const amountCents = this.toCents(amount);

        // Calculate percentage and round to nearest cent
        const percentageCents = Math.round((amountCents * percentage) / 100);

        return this.fromCents(percentageCents);
    },

    // Calculate the total of an array of items [ { price, quantity } ]
    calculateSubtotal(items) {
        if (!Array.isArray(items)) return 0;

        let totalCents = 0;
        for (const item of items) {
            const priceCents = this.toCents(item.price);
            const qty = Number(item.quantity) || 0;
            totalCents += Math.round(priceCents * qty);
        }

        return this.fromCents(totalCents);
    }
};

export default safeMath;
