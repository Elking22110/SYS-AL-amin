const fs = require('fs');
const path = require('path');

const mainFile = 'd:\\My Work\\pos-main\\src\\main.jsx';
let mainCode = fs.readFileSync(mainFile, 'utf8');

if (!mainCode.includes('import "./utils/localStorageProxy";') && !mainCode.includes("import './utils/localStorageProxy';")) {
    mainCode = mainCode.replace(
        'import "./index.css";',
        'import "./index.css";\nimport "./utils/localStorageProxy"; // Inject sync proxy'
    );
    fs.writeFileSync(mainFile, mainCode);
    console.log('main.jsx updated with localStorageProxy import.');
} else {
    console.log('localStorageProxy is already imported in main.jsx.');
}
