const fs = require('fs');
let c = fs.readFileSync('components/KPICards.jsx', 'utf8');
c = c.replace(/className=\\{/g, 'className={');
c = c.replace(/tracking-tight\/g, 'tracking-tight}');
c = c.replace(/scale-110\/g, 'scale-110}');
fs.writeFileSync('components/KPICards.jsx', c);
