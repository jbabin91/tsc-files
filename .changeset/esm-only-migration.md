---
'@jbabin91/tsc-files': minor
---

**BREAKING**: Migrate to ESM-only package

Remove CommonJS build output to simplify package structure and reduce published size. Since we require Node.js 22+, all users support native ESM, making the dual package unnecessary.

**Breaking Changes:**

- Removed CJS exports - `require()` will no longer work
- All imports must use ESM syntax: `import { checkFiles } from '@jbabin91/tsc-files'`

**Benefits:**

- 📦 Package size: 107 KB → 57.7 KB (46% smaller)
- 📁 Files published: 15 → 8 (47% fewer)
- ⚡ Build time: ~50ms faster
- 🎯 Simpler package structure and maintenance

**Migration:**
If you're using CommonJS, update your imports:

```javascript
// Before (CJS - no longer supported)
const { checkFiles } = require('@jbabin91/tsc-files');

// After (ESM)
import { checkFiles } from '@jbabin91/tsc-files';
```

**Impact:** Minimal since Node.js 22+ requirement means all users already support ESM.
