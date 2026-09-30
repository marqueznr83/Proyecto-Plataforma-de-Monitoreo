import sys
path = r'components\KPICards.jsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace('className=\{', 'className={${card.textColor}')
c = c.replace('tracking-tight\ud83e\udd8a', 'tracking-tight}') # wait, let me just fix the exact line
with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
