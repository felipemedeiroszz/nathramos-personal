import ts from "typescript";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { resolve, dirname } from "node:path";
const realRequire = createRequire(import.meta.url);
export function loadTs(path, mocks = {}) {
  const source = readFileSync(path, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const module = { exports: {} };
  const require = (name) => {
    if (Object.hasOwn(mocks, name)) return mocks[name];
    if (name.startsWith("@/")) {
      const root = "src/" + name.slice(2);
      const target = [root + ".ts", root + ".tsx", root + "/index.ts"].find(
        existsSync,
      );
      if (target) return loadTs(target, mocks);
    }
    if (name.startsWith(".")) {
      const root = resolve(dirname(path), name);
      const target = [root + ".ts", root + ".tsx", root + "/index.ts"].find(
        existsSync,
      );
      if (target) return loadTs(target, mocks);
    }
    return realRequire(name);
  };
  const fn = vm.runInThisContext(
    `(function(require,module,exports){${compiled}\n})`,
    { filename: path },
  );
  fn(require, module, module.exports);
  return module.exports;
}
