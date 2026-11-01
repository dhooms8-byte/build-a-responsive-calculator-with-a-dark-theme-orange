(function () {
  "use strict";

  const currentEl = document.getElementById("current");
  const historyEl = document.getElementById("history");

  let current = "0";
  let previous = null;
  let operation = null;
  let shouldReset = false;
  let justEvaluated = false;

  const OP_SYMBOLS = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  function formatNumber(num) {
    if (num === "Error") return "Error";
    const n = parseFloat(num);
    if (!isFinite(n)) return "Error";
    if (n === 0) return "0";
    const abs = Math.abs(n);
    if (abs >= 1e15 || (abs < 1e-9 && abs > 0)) {
      return n.toExponential(6);
    }
    let str = n.toString();
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
    const len = currentEl.textContent.length;
    if (len > 9) {
      const scale = Math.max(1.2, 2.6 - (len - 9) * 0.12);
      currentEl.style.fontSize = scale + "rem";
    } else {
      currentEl.style.fontSize = "";
    }
  }

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
    const x = parseFloat(a);
    const y = parseFloat(b);
    let result;
    switch (op) {
      case "+": result = x + y; break;
      case "-": result = x - y; break;
      case "*": result = x * y; break;
      case "/":
        if (y === 0) return "Error";
        result = x / y; break;
      default: return b;
    }
    return String(result);
  }

  function setOperation(op) {
    if (current === "Error") return;
    clearActiveOp();
    if (operation && previous !== null && !shouldReset) {
      const result = compute(previous, current, operation);
      previous = result;
      current = result;
    } else {
      previous = current;
    }
    operation = op;
    shouldReset = true;
    justEvaluated = false;
    const opBtn = document.querySelector('[data-op="' + op + '"]');
    if (opBtn) opBtn.classList.add("active-op");
    updateDisplay();
  }

  function evaluate() {
    if (current === "Error") return;
    if (operation === null || previous === null) return;
    const result = compute(previous, current, operation);
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

  function flashKey(selector) {
    const el = document.querySelector(selector);
    if (el) {
      el.classList.add("pressed");
      setTimeout(function () { el.classList.remove("pressed"); }, 120);
    }
  }

  document.querySelectorAll(".key").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (this.dataset.digit) {
        inputDigit(this.dataset.digit);
      } else if (this.dataset.op) {
        setOperation(this.dataset.op);
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

  document.addEventListener("keydown", function (e) {
    const k = e.key;
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
    }
  });

  updateDisplay();
})();
