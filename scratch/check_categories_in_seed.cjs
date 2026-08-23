'use strict';
const fs = require('fs');
const path = require('path');

const seedPath = path.join(__dirname, '../public/products_seed.json');
const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
const categories = seedData.categories || [];

console.log(`Categories count in products_seed.json: ${categories.length}`);
