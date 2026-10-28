import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import ts from "typescript";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url);
const playwright = require(
  process.env.PLAYWRIGHT_MODULE ||
    "C:/Users/luis.medeiros/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const compile = async (path) =>
  ts.transpileModule(await readFile(path, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.React,
    },
  }).outputText;
const hook = await compile("src/components/ui/useDialogFocus.ts"),
  modal = await compile("src/components/ui/Modal.tsx");
const browser = await playwright.chromium.launch({
  headless: true,
  channel: "chrome",
});
try {
  const page = await browser.newPage();
  await page.setContent(
    '<button id="outside">Outside</button><div id="app"></div>',
  );
  await page.addScriptTag({
    path: require
      .resolve("react/package.json")
      .replace("package.json", "umd/react.development.js"),
  });
  await page.addScriptTag({
    path: require
      .resolve("react-dom/package.json")
      .replace("package.json", "umd/react-dom.development.js"),
  });
  await page.addScriptTag({
    content: `window.hook={exports:{}};(function(require,module,exports){${hook}})(()=>React,window.hook,window.hook.exports);window.modal={exports:{}};(function(require,module,exports){${modal}})(name=>name==='react'?React:name==='./useDialogFocus'?window.hook.exports:name==='lucide-react'?{X:()=>null}:{cn:(...values)=>values.filter(Boolean).join(' ')},window.modal,window.modal.exports);`,
  });
  await page.addScriptTag({
    content: `const {Modal,ModalTitle}=window.modal.exports;function App(){const [open,setOpen]=React.useState(false),[nested,setNested]=React.useState(false);return React.createElement(React.Fragment,null,React.createElement('button',{id:'open',onClick:()=>setOpen(true)},'Open'),React.createElement(Modal,{isOpen:open,onClose:()=>setOpen(false)},React.createElement(ModalTitle,null,'Primary'),React.createElement('button',{id:'first',onClick:()=>setNested(true)},'Nested'),React.createElement('button',{id:'last'},'Last'),React.createElement(Modal,{isOpen:nested,onClose:()=>setNested(false)},React.createElement(ModalTitle,null,'Secondary'),React.createElement('button',{id:'inner'},'Inner'))))};ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(App));`,
  });
  await page.locator("#open").click();
  await page.locator("#first").waitFor();
  assert.equal(await page.evaluate(() => document.activeElement.id), "first");
  await page.keyboard.press("Shift+Tab");
  assert.equal(await page.evaluate(() => document.activeElement.id), "last");
  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement.id), "first");
  await page.locator("#first").click();
  await page.locator("#inner").waitFor();
  assert.equal(
    await page.evaluate(() => document.body.style.overflow),
    "hidden",
  );
  await page.keyboard.press("Escape");
  await page.locator("#inner").waitFor({ state: "detached" });
  assert.equal(await page.locator("[role=dialog]").count(), 1);
  assert.equal(
    await page.evaluate(() => document.body.style.overflow),
    "hidden",
  );
  await page.keyboard.press("Escape");
  await page.locator("[role=dialog]").waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement.id), "open");
  assert.equal(await page.evaluate(() => document.body.style.overflow), "");
  console.log(
    "PASS: foco inicial, ciclo Tab/Shift+Tab, Escape em modal aninhado, restauração de foco e rolagem.",
  );
  const asyncHook = await compile("src/hooks/useAsyncTransition.ts");
  await page.addScriptTag({
    content: `window.asyncHook={exports:{}};(function(require,module,exports){${asyncHook}})(()=>React,window.asyncHook,window.asyncHook.exports);`,
  });
  await page.addScriptTag({
    content: `function PendingApp(){const [pending,start]=window.asyncHook.exports.useAsyncTransition();const task=async()=>{window.submitCount=(window.submitCount||0)+1;await new Promise(resolve=>{window.finishPending=resolve})};return React.createElement('button',{id:'pending',disabled:pending,onClick:()=>{start(task);start(task)}},pending?'Saving':'Save')};ReactDOM.createRoot(document.getElementById('app')).render(React.createElement(PendingApp));`,
  });
  await page.locator("#pending").click();
  assert.equal(await page.locator("#pending").isDisabled(), true);
  assert.equal(await page.evaluate(() => window.submitCount), 1);
  await page.evaluate(() => window.finishPending());
  await page.waitForFunction(
    () => !document.getElementById("pending").disabled,
  );
  console.log(
    "PASS: envio permanece pendente até terminar e impede requisições duplicadas.",
  );
} finally {
  await browser.close();
}
