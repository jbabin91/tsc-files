---
"@jbabin91/tsc-files": patch
---

Stop writing the implied `moduleResolution: "classic"` into the temporary config; TypeScript 6 deprecates and 7 rejects it. Declare TypeScript 5 and 6 as the supported peer range: TypeScript 7 removed the JavaScript compiler API that dependency discovery uses.
