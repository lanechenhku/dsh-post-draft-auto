// 极简 React 替身：只够渲染本插件的面板
// 支持 createElement / useState / useEffect(带 deps) / useCallback，并对失控重渲染设上限（防止无头浏览器卡死）。
function createElement(type, props) {
  const children = [];
  for (let i = 2; i < arguments.length; i += 1) {
    const c = arguments[i];
    if (c === null || c === undefined || c === false) continue;
    if (Array.isArray(c)) {
      for (const item of c) if (item !== null && item !== undefined && item !== false) children.push(item);
    } else children.push(c);
  }
  return { type, props: Object.assign({}, props || {}), children };
}

let hookIndex = 0;
let hookStore = [];
let pendingEffects = [];
let rerender = null;
let renderCount = 0;

function useState(initial) {
  const index = hookIndex++;
  if (!(index in hookStore)) hookStore[index] = { value: initial };
  const cell = hookStore[index];
  const set = (next) => {
    const value = typeof next === "function" ? next(cell.value) : next;
    if (value === cell.value) return;
    cell.value = value;
    if (typeof rerender === "function") rerender();
  };
  return [cell.value, set];
}

function depsChanged(a, b) {
  if (a === undefined || b === undefined) return true;
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return true;
  return false;
}

function useEffect(fn, deps) {
  const index = hookIndex++;
  const cell = hookStore[index] || (hookStore[index] = { ran: false, deps: undefined });
  if (!cell.ran || depsChanged(cell.deps, deps)) {
    cell.ran = true;
    cell.deps = deps;
    pendingEffects.push(fn);
  }
}

function useCallback(fn) {
  const index = hookIndex++;
  const cell = hookStore[index] || (hookStore[index] = { fn });
  return cell.fn;
}

const React = { createElement, useState, useEffect, useCallback };

function applyStyle(el, style) { if (style) { for (const k in style) el.style[k] = style[k]; } }

function renderNode(node) {
  if (node === null || node === undefined || node === false || node === true) return document.createTextNode("");
  if (typeof node === "string" || typeof node === "number") return document.createTextNode(String(node));
  if (Array.isArray(node)) {
    const frag = document.createDocumentFragment();
    for (const child of node) frag.appendChild(renderNode(child));
    return frag;
  }
  if (typeof node.type === "function") {
    return renderNode(node.type(Object.assign({}, node.props, { children: node.children })));
  }
  const el = document.createElement(node.type);
  applyStyle(el, node.props.style);
  if (node.props.title) el.title = node.props.title;
  if (node.props.type === "button") el.type = "button";
  if (node.props.disabled) el.disabled = true;
  if (typeof node.props.onClick === "function") el.addEventListener("click", node.props.onClick);
  for (const child of node.children) el.appendChild(renderNode(child));
  return el;
}

function mount(root, element) {
  const draw = () => {
    renderCount += 1;
    if (renderCount > 40) {
      console.error("mini-react: too many renders, stop");
      return;
    }
    hookIndex = 0;
    pendingEffects = [];
    root.replaceChildren(renderNode(element));
    const effects = pendingEffects.slice();
    pendingEffects = [];
    for (const fn of effects) {
      try { fn(); } catch (e) { console.error("effect failed", e); }
    }
  };
  rerender = draw;
  hookIndex = 0;
  hookStore = [];
  renderCount = 0;
  draw();
}