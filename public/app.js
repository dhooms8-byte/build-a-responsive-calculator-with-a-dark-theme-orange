(function () {
  "use strict";

  const currentEl = document.getElementById("current");
  const historyEl = document.getElementById("history");
  const calcShell = document.getElementById("calcShell");
  const modeToggle = document.getElementById("modeToggle");
  const historyToggle = document.getElementById("historyToggle");
  const historyPanel = document.getElementById("historyPanel");
  const historyList = document.getElementById("historyList");
  const historyClear = document.getElementById("historyClear");
  const hintEl = document.getElementById("hint");
  const themeToggle = document.getElementById("themeToggle");

  let currentTheme = "dark";

  themeToggle.addEventListener("click", function () {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", currentTheme === "light" ? "light" : "dark");
    themeToggle.textContent = currentTheme === "light" ? "☀️" : "🌙";
  });

  let current = "0";
  let previous = null;
  let operation = null;
  let shouldReset = false;
  let justEvaluated = false;
  let sciMode = false;
  let isDegree = true;
  let pendingPow = false;

  const OP_SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷", "^": "^" };

  var historyEntries = [];

  /* ===== Number formatting ===== */

  function formatNumber(num) {
    if (num === "Error") return "Error";
    var n = typeof num === "number" ? num : parseFloat(num);
    if (!isFinite(n)) return "Error";
    if (n === 0) return "0";
    var abs = Math.abs(n);
    if (abs >= 1e15 || (abs < 1e-9 && abs > 0)) {
      return n.toExponential(6);
    }
    var str = n.toString();
    if (str.length > 14) {
      str = parseFloat(n.toPrecision(14)).toString();
    }
    return str;
  }

  function updateDisplay() {
    currentEl.textContent = formatNumber(current);
    if (previous !== null && operation) {
      historyEl.textContent = formatNumber(previous) + " " + OP_SYMBOLS[operation];
    } else if (justEvaluated) {
      historyEl.textContent = formatNumber(current) + " =";
    } else {
      historyEl.textContent = "";
    }
    var len = currentEl.textContent.length;
    if (len > 9) {
      var scale = Math.max(1.2, 2.6 - (len - 9) * 0.12);
      currentEl.style.fontSize = scale + "rem";
    } else {
      currentEl.style.fontSize = "";
    }
  }

  /* ===== Basic input ===== */

  function inputDigit(d) {
    if (current === "Error") clearAll();
    if (shouldReset || justEvaluated) {
      current = d;
      shouldReset = false;
      justEvaluated = false;
      historyEl.textContent = "";
    } else {
      if (current === "0") {
        current = d;
      } else {
        if (current.replace(/[-.]/g, "").length >= 14) return;
        current += d;
      }
    }
    updateDisplay();
  }

  function inputDecimal() {
    if (current === "Error") clearAll();
    if (shouldReset || justEvaluated) {
      current = "0.";
      shouldReset = false;
      justEvaluated = false;
    } else if (!current.includes(".")) {
      current += ".";
    }
    updateDisplay();
  }

  function clearAll() {
    current = "0";
    previous = null;
    operation = null;
    shouldReset = false;
    justEvaluated = false;
    pendingPow = false;
    clearActiveOp();
    updateDisplay();
  }

  function toggleSign() {
    if (current === "Error" || current === "0") return;
    current = current.startsWith("-") ? current.slice(1) : "-" + current;
    updateDisplay();
  }

  function percent() {
    if (current === "Error") return;
    current = formatNumber(String(parseFloat(current) / 100));
    updateDisplay();
  }

  function compute(a, b, op) {
    var x = parseFloat(a);
    var y = parseFloat(b);
    var result;
    switch (op) {
      case "+": result = x + y; break;
      case "-": result = x - y; break;
      case "*": result = x * y; break;
      case "/":
        if (y === 0) return "Error";
        result = x / y; break;
      case "^":
        result = Math.pow(x, y); break;
      default: return b;
    }
    return String(result);
  }

  function setOperation(op) {
    if (current === "Error") return;
    clearActiveOp();
    if (operation && previous !== null && !shouldReset) {
      var result = compute(previous, current, operation);
      previous = result;
      current = result;
    } else {
      previous = current;
    }
    operation = op;
    shouldReset = true;
    justEvaluated = false;
    var opBtn = document.querySelector('[data-op="' + op + '"]');
    if (opBtn) opBtn.classList.add("active-op");
    updateDisplay();
  }

  function evaluate() {
    if (current === "Error") return;
    if (operation === null || previous === null) return;
    var expr = formatNumber(previous) + " " + OP_SYMBOLS[operation] + " " + formatNumber(current);
    var result = compute(previous, current, operation);
    addHistoryEntry(expr, formatNumber(result));
    current = result;
    previous = null;
    operation = null;
    shouldReset = false;
    justEvaluated = true;
    clearActiveOp();
    currentEl.classList.remove("flash");
    void currentEl.offsetWidth;
    currentEl.classList.add("flash");
    updateDisplay();
  }

  function backspace() {
    if (current === "Error") { clearAll(); return; }
    if (shouldReset || justEvaluated) return;
    if (current.length === 1 || (current.length === 2 && current.startsWith("-"))) {
      current = "0";
    } else {
      current = current.slice(0, -1);
    }
    updateDisplay();
  }

  function clearActiveOp() {
    document.querySelectorAll(".key--op.active-op").forEach(function (el) {
      el.classList.remove("active-op");
    });
  }

  /* ===== Scientific functions ===== */

  function toRadians(x) { return isDegree ? (x * Math.PI) / 180 : x; }
  function toDegrees(x) { return isDegree ? (x * 180) / Math.PI : x; }

  function factorial(n) {
    if (n < 0 || n !== Math.floor(n)) return NaN;
    if (n > 170) return Infinity;
    var r = 1;
    for (var i = 2; i <= n; i++) r *= i;
    return r;
  }

  function applyUnary(fn, label) {
    if (current === "Error") return;
    var x = parseFloat(current);
    var result = fn(x);
    if (!isFinite(result)) { current = "Error"; }
    else { current = String(result); }
    shouldReset = true;
    justEvaluated = false;
    updateDisplay();
  }

  function sciFunction(fn) {
    if (current === "Error") return;
    var x = parseFloat(current);
    var result;

    switch (fn) {
      case "sin":   result = Math.sin(toRadians(x)); break;
      case "cos":   result = Math.cos(toRadians(x)); break;
      case "tan":   result = Math.tan(toRadians(x)); break;
      case "asin":  result = toDegrees(Math.asin(x)); break;
      case "acos":  result = toDegrees(Math.acos(x)); break;
      case "atan":  result = toDegrees(Math.atan(x)); break;
      case "log":   result = Math.log10(x); break;
      case "ln":    result = Math.log(x); break;
      case "sqrt":  result = Math.sqrt(x); break;
      case "square": result = x * x; break;
      case "cube":  result = x * x * x; break;
      case "inv":   result = 1 / x; break;
      case "fact":  result = factorial(x); break;
      case "exp":   result = Math.exp(x); break;
      case "tenx":  result = Math.pow(10, x); break;
      case "abs":   result = Math.abs(x); break;
      case "pi":    result = Math.PI; shouldReset = true; break;
      case "e":     result = Math.E; shouldReset = true; break;
      case "deg":
        isDegree = !isDegree;
        var degBtn = document.querySelector('[data-sci="deg"]');
        if (degBtn) degBtn.textContent = isDegree ? "DEG" : "RAD";
        return;
      case "pow":
        if (pendingPow) return;
        pendingPow = true;
        previous = current;
        operation = "^";
        shouldReset = true;
        justEvaluated = false;
        var opBtn = document.querySelector('[data-sci="pow"]');
        if (opBtn) opBtn.classList.add("active-op");
        updateDisplay();
        return;
      default: return;
    }

    if (!isFinite(result)) {
      current = "Error";
    } else {
      current = String(result);
    }
    shouldReset = true;
    justEvaluated = false;
    updateDisplay();
  }

  /* ===== History ===== */

  function addHistoryEntry(expr, result) {
    historyEntries.unshift({ expr: expr, result: result });
    if (historyEntries.length > 50) historyEntries.pop();
    renderHistory();
  }

  function renderHistory() {
    if (historyEntries.length === 0) {
      historyList.innerHTML = '<div class="history-empty">No calculations yet</div>';
      return;
    }
    historyList.innerHTML = "";
    historyEntries.forEach(function (entry) {
      var item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML =
        '<div class="history-item-expr">' + entry.expr + '</div>' +
        '<div class="history-item-result"><span class="eq">=</span>' + entry.result + '</div>';
      item.addEventListener("click", function () {
        current = entry.result;
        shouldReset = true;
        justEvaluated = false;
        updateDisplay();
      });
      historyList.appendChild(item);
    });
  }

  /* ===== Mode toggles ===== */

  modeToggle.addEventListener("click", function () {
    sciMode = !sciMode;
    calcShell.classList.toggle("sci-mode", sciMode);
    modeToggle.classList.toggle("active", sciMode);
    hintEl.textContent = sciMode
      ? "Scientific mode · DEG/RAD toggle · Click history to reuse"
      : "Keyboard ready · Esc clears · Backspace deletes";
  });

  historyToggle.addEventListener("click", function () {
    var visible = historyPanel.classList.toggle("visible");
    historyToggle.classList.toggle("active", visible);
  });

  historyClear.addEventListener("click", function () {
    historyEntries = [];
    renderHistory();
  });

  /* ===== Button click handlers ===== */

  document.querySelectorAll(".key").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (this.dataset.digit) {
        inputDigit(this.dataset.digit);
      } else if (this.dataset.op) {
        setOperation(this.dataset.op);
      } else if (this.dataset.sci) {
        sciFunction(this.dataset.sci);
      } else if (this.dataset.action) {
        switch (this.dataset.action) {
          case "clear": clearAll(); break;
          case "sign": toggleSign(); break;
          case "percent": percent(); break;
          case "decimal": inputDecimal(); break;
          case "equals": evaluate(); break;
        }
      }
    });
  });

  /* ===== Keyboard support ===== */

  function flashKey(selector) {
    var el = document.querySelector(selector);
    if (el) {
      el.classList.add("pressed");
      setTimeout(function () { el.classList.remove("pressed"); }, 120);
    }
  }

  document.addEventListener("keydown", function (e) {
    var k = e.key;

    if (k >= "0" && k <= "9") {
      inputDigit(k);
      flashKey('[data-digit="' + k + '"]');
      e.preventDefault();
    } else if (k === ".") {
      inputDecimal();
      flashKey('[data-action="decimal"]');
      e.preventDefault();
    } else if (k === "+" || k === "-" || k === "*" || k === "/") {
      setOperation(k);
      flashKey('[data-op="' + k + '"]');
      e.preventDefault();
    } else if (k === "Enter" || k === "=") {
      evaluate();
      flashKey('[data-action="equals"]');
      e.preventDefault();
    } else if (k === "Escape" || k === "c" || k === "C") {
      clearAll();
      flashKey('[data-action="clear"]');
      e.preventDefault();
    } else if (k === "Backspace") {
      backspace();
      e.preventDefault();
    } else if (k === "%") {
      percent();
      flashKey('[data-action="percent"]');
      e.preventDefault();
    } else if (k === "^") {
      sciFunction("pow");
      flashKey('[data-sci="pow"]');
      e.preventDefault();
    } else if (k === "s" || k === "S") {
      sciFunction("sin");
      flashKey('[data-sci="sin"]');
      e.preventDefault();
    } else if (k === "o" || k === "O") {
      sciFunction("cos");
      flashKey('[data-sci="cos"]');
      e.preventDefault();
    } else if (k === "t" || k === "T") {
      sciFunction("tan");
      flashKey('[data-sci="tan"]');
      e.preventDefault();
    } else if (k === "l" || k === "L") {
      sciFunction("log");
      flashKey('[data-sci="log"]');
      e.preventDefault();
    } else if (k === "n" || k === "N") {
      sciFunction("ln");
      flashKey('[data-sci="ln"]');
      e.preventDefault();
    } else if (k === "r" || k === "R") {
      sciFunction("sqrt");
      flashKey('[data-sci="sqrt"]');
      e.preventDefault();
    } else if (k === "p" || k === "P") {
      sciFunction("pi");
      flashKey('[data-sci="pi"]');
      e.preventDefault();
    } else if (k === "e" || k === "E") {
      sciFunction("e");
      flashKey('[data-sci="e"]');
      e.preventDefault();
    } else if (k === "!") {
      sciFunction("fact");
      flashKey('[data-sci="fact"]');
      e.preventDefault();
    } else if (k === "h" || k === "H") {
      historyToggle.click();
      e.preventDefault();
    } else if (k === "m" || k === "M") {
      modeToggle.click();
      e.preventDefault();
    }
  });

  updateDisplay();
})();
