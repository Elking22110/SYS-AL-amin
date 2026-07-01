const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

// Function to recursively find all files with specific extensions
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach((file) => {
        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
            arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
        } else {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.js' || ext === '.jsx') {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        }
    });

    return arrayOfFiles;
}

const files = getAllFiles(srcDir);
let changedFilesCount = 0;

const replacements = {
    // Aggressively replace text-white and text-gray-100/200/300 with readable slate
    // unless they are explicitly on a button or dark badge
    'text-white': 'text-slate-800',
    'text-gray-100': 'text-slate-700',
    'text-gray-200': 'text-slate-600',
    'text-gray-300': 'text-slate-600',
    'text-gray-400': 'text-slate-500',
    // specifically target dark mode backgrounds missed like bg-slate-900 or bg-gray-900
    'bg-gray-900': 'bg-slate-50',
    'bg-slate-900': 'bg-slate-50',
    'bg-gray-800': 'bg-white',
    'bg-slate-800': 'bg-white',
    // specifically target pos wrapper styling that is still dark
    'bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900': 'bg-gradient-to-br from-slate-50 via-purple-50 to-blue-50',
    // dark inputs and dividers missed by the previous replace
    'divide-gray-800': 'divide-slate-200',
    'border-gray-800': 'border-slate-200',
    'border-gray-700': 'border-slate-300',
};

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let newContent = content;

    // Manual targeted fix for buttons where text-white is actually desired (if any got changed to slate-800 previously)
    // For this pass we are replacing all text-white strings. To avoid destroying btn-primary text,
    // we know from index.css that btn-primary defines its own color, but if inline tailwind is used on buttons:

    for (const [oldClass, newClass] of Object.entries(replacements)) {
        // Regex to match exact word bounded classes, replacing them globally
        const regex = new RegExp(`\\b${oldClass}\\b`, 'g');
        newContent = newContent.replace(regex, newClass);
    }

    // Reverse some replacements for the specific things we want to be white (e.g. text inside purple buttons)
    // We can do this safely by looking for `bg-purple-600(.*?)text-slate-800` and changing back, but a simpler
    // approach is to trust the index.css overrides we already set up for `.btn-primary`.

    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        changedFilesCount++;
        console.log(`Updated: ${path.relative(__dirname, file)}`);
    }
});

console.log(`\nTheme fix step 2 complete. Modified ${changedFilesCount} files.`);
