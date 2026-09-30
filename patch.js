const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'components', 'KPICards.jsx');
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/isNoAC \? ?? Tiempo sin luz: \$\{formattedShort\}/g, 'isNoAC ? "?? Corte de luz activo"');
fs.writeFileSync(file, content, 'utf8');
console.log('Done');
