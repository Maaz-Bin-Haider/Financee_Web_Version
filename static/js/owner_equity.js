// ============================================================
// Owner Equity — section script
// Record owner withdrawals & capital injections against an
// equity account (no party, no faked cash).
// ============================================================

const OE_API = {
  list:     "/owner-equity/api/transactions/",
  accounts: "/owner-equity/api/equity-accounts/",
  add:      "/owner-equity/api/add/",
  del:      "/owner-equity/api/delete/",
};

function oeCsrf() {
  return document.cookie.match(/csrftoken=([^;]+)/)?.[1] || "";
}

function oeFmt(n) {
  return (parseFloat(n) || 0).toLocaleString("en-PK", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });
}

function oeSelect() {
  document.querySelectorAll(".report-btn").forEach((b) => b.classList.remove("active"));
  document.getElementById("btn-oe")?.classList.add("active");
}

async function oeLoadAccounts() {
  try {
    const r = await fetch(OE_API.accounts, { headers: { "X-Requested-With": "XMLHttpRequest" } });
    if (!r.ok) return;
    const d = await r.json();
    const sel = document.getElementById("oe-account");
    if (!sel) return;
    sel.innerHTML = "";
    (d.accounts || []).forEach((name) => {
      const o = document.createElement("option");
      o.value = name; o.textContent = name;
      if (name === "Owner's Capital") o.selected = true;
      sel.appendChild(o);
    });
  } catch (e) { /* ignore */ }
}

async function oeLoadList() {
  try {
    const r = await fetch(OE_API.list, { headers: { "X-Requested-With": "XMLHttpRequest" } });
    if (!r.ok) return;
    const d = await r.json();

    document.getElementById("oe-total-inj").textContent = oeFmt(d.total_injections);
    document.getElementById("oe-total-wd").textContent  = oeFmt(d.total_withdrawals);
    document.getElementById("oe-net").textContent       = oeFmt(d.net_contributed);

    const tb = document.getElementById("oe-tbody");
    const rows = d.transactions || [];
    if (!rows.length) {
      tb.innerHTML = `<tr><td colspan="6" class="oe-empty">No entries yet</td></tr>`;
      return;
    }
    tb.innerHTML = rows.map((t) => {
      const isWd = t.direction === "withdrawal";
      const badge = isWd
        ? `<span class="oe-badge oe-out">Withdrawal</span>`
        : `<span class="oe-badge oe-in">Injection</span>`;
      return `<tr>
        <td>${t.txn_date || ""}</td>
        <td>${badge}</td>
        <td>${t.account || ""}</td>
        <td class="oe-amt ${isWd ? "oe-amt-out" : "oe-amt-in"}">${isWd ? "−" : "+"}${oeFmt(t.amount)}</td>
        <td>${t.description ? t.description : "—"}</td>
        <td><button class="oe-del" title="Delete" onclick="oeDelete(${t.txn_id})"><i class="fa-solid fa-trash"></i></button></td>
      </tr>`;
    }).join("");
  } catch (e) { /* ignore */ }
}

async function oeSave() {
  const direction = document.getElementById("oe-direction").value;
  const account   = document.getElementById("oe-account").value;
  const amount    = parseFloat(document.getElementById("oe-amount").value);
  const date      = document.getElementById("oe-date").value;
  const desc      = document.getElementById("oe-desc").value;

  if (isNaN(amount) || amount <= 0) {
    Swal.fire("Invalid amount", "Enter an amount greater than 0.", "warning");
    return;
  }

  const btn = document.getElementById("oe-save-btn");
  btn.disabled = true;
  try {
    const r = await fetch(OE_API.add, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": oeCsrf() },
      body: JSON.stringify({
        direction, equity_account: account, amount,
        txn_date: date, description: desc,
      }),
    });
    const d = await r.json();
    if (!r.ok || d.status !== "success") {
      Swal.fire("Error", d.message || "Could not save.", "error");
    } else {
      document.getElementById("oe-amount").value = "";
      document.getElementById("oe-desc").value = "";
      await oeLoadList();
      Swal.fire({ icon: "success", title: "Recorded", timer: 1100, showConfirmButton: false });
    }
  } catch (e) {
    Swal.fire("Error", "Request failed. " + e.message, "error");
  } finally {
    btn.disabled = false;
  }
}

async function oeDelete(txnId) {
  const ok = await Swal.fire({
    title: "Delete this entry?",
    text: "Its journal entry will be removed too.",
    icon: "warning", showCancelButton: true, confirmButtonText: "Delete",
    confirmButtonColor: "#dc2626",
  });
  if (!ok.isConfirmed) return;
  try {
    const r = await fetch(OE_API.del, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": oeCsrf() },
      body: JSON.stringify({ txn_id: txnId }),
    });
    const d = await r.json();
    if (!r.ok || d.status !== "success") {
      Swal.fire("Error", d.message || "Could not delete.", "error");
    } else {
      await oeLoadList();
    }
  } catch (e) {
    Swal.fire("Error", "Request failed. " + e.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const dt = document.getElementById("oe-date");
  if (dt) dt.value = new Date().toISOString().slice(0, 10);
  document.getElementById("oe-save-btn")?.addEventListener("click", oeSave);
  oeLoadAccounts();
  oeLoadList();
});
