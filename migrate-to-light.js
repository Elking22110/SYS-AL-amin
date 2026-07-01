import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const directoryPath = path.join(__dirname, 'src');

const classMappings = {
    // Backgrounds
    'bg-gray-900': 'bg-slate-50',
    'bg-gray-800': 'bg-white',
    'bg-gray-800/50': 'bg-white/90',
    'bg-slate-900': 'bg-slate-50',
    'bg-slate-800': 'bg-white',

    // Text colors
    'text-white': 'text-slate-800',
    'text-gray-100': 'text-slate-800',
    'text-gray-200': 'text-slate-700',
    'text-gray-300': 'text-slate-600',
    'text-gray-400': 'text-slate-500',

    // Borders
    'border-gray-800': 'border-slate-200',
    'border-gray-700': 'border-slate-300',
    'border-gray-600': 'border-slate-400',
    'border-white/10': 'border-slate-200',
    'border-white/20': 'border-slate-300',

    // Hover & Focus (Backgrounds)
    'hover:bg-gray-800': 'hover:bg-slate-100',
    'hover:bg-gray-700': 'hover:bg-slate-200',
    'hover:bg-gray-700/50': 'hover:bg-slate-200/50',
    'hover:bg-gray-800/50': 'hover:bg-slate-100/50',
    'focus:bg-gray-800': 'focus:bg-slate-100',
    'focus:bg-gray-800/50': 'focus:bg-slate-100/50',

    // Ring/Outline
    'focus:ring-gray-700': 'focus:ring-slate-300',

    // Dividers
    'divide-gray-800': 'divide-slate-200',
    'divide-gray-700': 'divide-slate-300',

    // Placeholders
    'placeholder-gray-500': 'placeholder-slate-400',
    'placeholder-gray-400': 'placeholder-slate-400',
};

function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}

function replaceClasses(content) {
    let newContent = content;
    for (const [darkClass, lightClass] of Object.entries(classMappings)) {
        // Use regex with word boundaries to avoid replacing substrings (e.g., hover:bg-gray-800 doesn't replace inside focus:hover:bg-gray-800 if not intended, though exact match is better)
        // We look for exact class matches separated by quotes, spaces, backticks, or newlines
        const regex = new RegExp(`(?<=['"\`\\s])(${escapeRegex(darkClass)})(?=['"\`\\s])`, 'g');
        newContent = newContent.replace(regex, lightClass);
    }
    return newContent;
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            processDirectory(filePath);
        } else if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
            const content = fs.readFileSync(filePath, 'utf8');
            const newContent = replaceClasses(content);

            if (content !== newContent) {
                fs.writeFileSync(filePath, newContent, 'utf8');
                console.log(`Updated: ${filePath}`);
            }
        }
    });
}

console.log('Starting dark to light migration...');
processDirectory(directoryPath);
console.log('Migration complete!');
