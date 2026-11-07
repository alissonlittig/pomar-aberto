import { rmSync, mkdirSync, cpSync } from 'node:fs';
rmSync('dist', { recursive: true, force: true });
mkdirSync('dist', { recursive: true });
for (const f of ['index.html', 'styles.css', 'favicon.svg', 'src']) cpSync(f, `dist/${f}`, { recursive: true });
console.log('built -> dist');
