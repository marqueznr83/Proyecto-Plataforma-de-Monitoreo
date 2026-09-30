const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'components', 'Navbar.jsx');
let content = fs.readFileSync(file, 'utf8');

// The block to remove:
// {isNoAC && (
//   <span className="bg-red-600 text-white font-mono px-2 py-0.5 rounded text-[11px] font-black shadow-inner flex items-center gap-1 ml-1">
//     ⏱️ {formattedShort}
//   </span>
// )}

const targetBlockRegex = /\{isNoAC && \(\s*<span className="bg-red-600 text-white font-mono px-2 py-0.5 rounded text-\[11px\] font-black shadow-inner flex items-center gap-1 ml-1">\s*⏱️ \{formattedShort\}\s*<\/span>\s*\)\}/g;

if (targetBlockRegex.test(content)) {
    content = content.replace(targetBlockRegex, '');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Done');
} else {
    console.log('Block not found');
}
