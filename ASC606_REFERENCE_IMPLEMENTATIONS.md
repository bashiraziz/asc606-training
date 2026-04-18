# Reference implementations

This file contains the complete, working HTML/JavaScript source for both interactive
tools — the ASC 606 worksheet and the month-end close tracker. These were built and
validated in a design session before this Docusaurus project was started.

**How to use this file:**
- These are the behavioral and UX spec for the two React components
- Do not copy them verbatim — they are single-file HTML widgets; the React components
  must be proper TypeScript with typed interfaces, CSS modules, and hooks
- Use them to understand: tab structure, field names, calculation logic, data flows,
  validation rules, and exact UX behavior
- Every calculation, every auto-population, every alert condition shown here must be
  reproduced faithfully in the React components

---

## 1. ASC 606 five-step worksheet

**Target component:** `src/components/Worksheet/index.tsx`

This is an 8-tab interactive form. Tabs: Contract info → Step 1 (contract) →
Step 2 (obligations) → Step 3 (price) → Step 4 (allocate) → Step 5 (recognize) →
Costs & disclosures → Summary & sign-off.

Key behaviors to replicate exactly:
- Progress bar tracks tab completion
- Step 2 POs flow into Step 4 allocation table and Step 5 recognition table automatically
- Step 3 transaction price flows into Step 4 as the amount to allocate
- Step 4 SSP % and allocated TP auto-calculate on every SSP input change
- Step 5 period amounts sum per-row and across all rows
- Step 1 evaluates all five criteria and shows pass/fail banner in real time
- "Load sample data" prefills a SaaS + onboarding example
- Summary tab shows metric cards, PO allocation table, and auto-generated alerts

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>ASC 606 Worksheet</title></head>
<body>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;font-size:14px;color:#1a1a1a;background:#f8f8f8;padding:1rem}
.app{max-width:860px;margin:0 auto;padding:1rem 0 2rem}
.banner{background:#1F3864;border-radius:10px;padding:1.25rem 1.5rem;margin-bottom:1.25rem}
.banner h1{color:#fff;font-size:18px;font-weight:500;margin-bottom:4px}
.banner p{color:#A8C4E5;font-size:13px}
.tabs{display:flex;gap:4px;margin-bottom:1rem;flex-wrap:wrap}
.tab{padding:7px 14px;border-radius:8px;border:1px solid #ccc;background:#fff;color:#666;cursor:pointer;font-size:13px}
.tab:hover{background:#f0f0f0}
.tab.active{background:#1F3864;color:#fff;border-color:#1F3864;font-weight:500}
.panel{display:none}.panel.active{display:block}
.card{background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:1.25rem;margin-bottom:1rem}
.sec-hdr{background:#2E75B6;color:#fff;font-size:13px;font-weight:500;padding:8px 12px;border-radius:8px;margin-bottom:12px}
.field-grid{display:grid;gap:10px;margin-bottom:12px}
.fg-2{grid-template-columns:1fr 1fr}
.fg-3{grid-template-columns:1fr 1fr 1fr}
.fg-4{grid-template-columns:1fr 1fr 1fr 1fr}
.field label{display:block;font-size:11px;font-weight:500;color:#666;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em}
.field input,.field select,.field textarea{width:100%;padding:7px 10px;border:1px solid #ccc;border-radius:8px;background:#fff;color:#1a1a1a;font-size:13px}
.field textarea{resize:vertical;min-height:60px}
.criteria-table{width:100%;border-collapse:collapse;font-size:13px;margin-bottom:12px}
.criteria-table th{background:#1F3864;color:#fff;padding:7px 10px;text-align:left;font-weight:500;font-size:12px}
.criteria-table td{padding:8px 10px;border-bottom:1px solid #eee;vertical-align:middle}
.criteria-table tr:nth-child(even) td{background:#f9f9f9}
.radio-group{display:flex;gap:12px}
.radio-group label{display:flex;align-items:center;gap:5px;font-size:13px;cursor:pointer}
.po-table{width:100%;border-collapse:collapse;font-size:12px;table-layout:fixed}
.po-table th{background:#1F3864;color:#fff;padding:7px 8px;text-align:left;font-weight:500}
.po-table td{padding:6px 8px;border-bottom:1px solid #eee;vertical-align:middle}
.po-table tr:nth-child(even) td{background:#f9f9f9}
.po-table input,.po-table select{width:100%;padding:4px 6px;border:1px solid #ccc;border-radius:5px;background:#fff;font-size:12px}
.money{font-family:monospace;font-size:13px}
.total-bar{background:#D6E4F7;border-radius:8px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;margin-top:8px}
.total-bar .lbl{font-size:12px;font-weight:500;color:#1F3864}
.total-bar .val{font-size:16px;font-weight:500;color:#1F3864;font-family:monospace}
.sum-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1rem}
.sum-card{background:#f5f5f5;border-radius:8px;padding:12px}
.sum-card .lbl{font-size:11px;color:#666;margin-bottom:4px}
.sum-card .val{font-size:20px;font-weight:500;font-family:monospace}
.sum-card .sub{font-size:11px;color:#999;margin-top:2px}
.alert{padding:10px 14px;border-radius:8px;font-size:13px;margin-bottom:10px;border:1px solid}
.alert-warn{background:#FAEEDA;color:#633806;border-color:#FAC775}
.alert-ok{background:#E1F5EE;color:#085041;border-color:#9FE1CB}
.checklist{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:12px}
.chk-item{display:flex;align-items:flex-start;gap:8px;font-size:13px;cursor:pointer;padding:6px 8px;border-radius:8px;border:1px solid #eee}
.chk-item input[type=checkbox]{accent-color:#2E75B6;margin-top:1px}
.chk-item.checked{background:#E1F5EE;border-color:#9FE1CB;color:#085041}
.sign-table{width:100%;border-collapse:collapse;font-size:13px}
.sign-table th{background:#1F3864;color:#fff;padding:7px 10px;font-weight:500;font-size:12px;text-align:left}
.sign-table td{padding:8px 10px;border-bottom:1px solid #eee}
.sign-table input{width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:5px;font-size:13px}
.nav-row{display:flex;justify-content:space-between;margin-top:1rem}
.btn{padding:8px 18px;border-radius:8px;border:1px solid #ccc;background:#fff;color:#1a1a1a;font-size:13px;cursor:pointer}
.btn:hover{background:#f0f0f0}
.btn-primary{background:#1F3864;color:#fff;border-color:#1F3864}
.btn-primary:hover{background:#2E75B6}
.progress{height:4px;background:#e0e0e0;border-radius:2px;margin-bottom:1rem;overflow:hidden}
.progress-bar{height:100%;background:#2E75B6;border-radius:2px;transition:width .3s}
.vc-row{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #eee}
.vc-row:last-child{border-bottom:none}
.vc-lbl{flex:0 0 180px;font-size:12px;font-weight:500;color:#666}
.vc-val{flex:1}
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:500}
.badge-ok{background:#E1F5EE;color:#085041}
.badge-err{background:#FCEBEB;color:#A32D2D}
.badge-info{background:#E6F1FB;color:#0C447C}
.badge-gray{background:#f0f0f0;color:#666}
.diff-tag{background:#D6E4F7;color:#0C447C;padding:2px 7px;border-radius:8px;font-size:11px;font-weight:500}
.footnote{font-size:11px;color:#999;margin-top:8px;font-style:italic}
</style>

<div class="app">
  <div class="banner">
    <h1>ASC 606 revenue recognition worksheet</h1>
    <p>Complete one worksheet per contract at inception — fields auto-calculate as you fill them in</p>
  </div>
  <div class="progress"><div class="progress-bar" id="prog" style="width:0%"></div></div>
  <div class="tabs">
    <div class="tab active" onclick="goTab(0)">Contract info</div>
    <div class="tab" onclick="goTab(1)">Step 1 — Contract</div>
    <div class="tab" onclick="goTab(2)">Step 2 — Obligations</div>
    <div class="tab" onclick="goTab(3)">Step 3 — Price</div>
    <div class="tab" onclick="goTab(4)">Step 4 — Allocate</div>
    <div class="tab" onclick="goTab(5)">Step 5 — Recognize</div>
    <div class="tab" onclick="goTab(6)">Costs &amp; disclosures</div>
    <div class="tab" onclick="goTab(7)">Summary &amp; sign-off</div>
  </div>

  <div class="panel active" id="tab0">
    <div class="card">
      <div class="sec-hdr">Contract identification</div>
      <div class="field-grid fg-4">
        <div class="field"><label>Contract #</label><input id="c_num" placeholder="e.g. C-2024-001"></div>
        <div class="field"><label>Contract date</label><input type="date" id="c_date"></div>
        <div class="field"><label>Entity / division</label><input id="c_entity" placeholder="Legal entity name"></div>
        <div class="field"><label>Prepared by</label><input id="c_preparer" placeholder="Your name"></div>
      </div>
      <div class="field-grid fg-4">
        <div class="field"><label>Customer name</label><input id="c_customer" placeholder="Customer legal name"></div>
        <div class="field"><label>Customer type</label>
          <select id="c_cust_type"><option>— select —</option><option>B2B</option><option>B2C</option><option>Government</option><option>Non-profit</option></select>
        </div>
        <div class="field"><label>Contract start</label><input type="date" id="c_start"></div>
        <div class="field"><label>Contract end</label><input type="date" id="c_end"></div>
      </div>
      <div class="field-grid fg-2">
        <div class="field"><label>Industry / sector</label>
          <select id="c_industry"><option>— select —</option><option>Software / SaaS</option><option>Construction / engineering</option><option>Manufacturing</option><option>Professional services</option><option>Healthcare</option><option>Retail / consumer</option><option>Financial services</option><option>Media / entertainment</option><option>Other</option></select>
        </div>
        <div class="field"><label>Next reassessment date</label><input type="date" id="c_review"></div>
      </div>
      <div class="field"><label>Contract description</label><textarea id="c_desc" rows="3" placeholder="Briefly describe the goods or services promised in this contract"></textarea></div>
    </div>
    <div class="nav-row"><div></div><button class="btn btn-primary" onclick="goTab(1)">Next: Step 1 &rarr;</button></div>
  </div>

  <div class="panel" id="tab1">
    <div class="card">
      <div class="sec-hdr">Step 1 — identify the contract &nbsp;<span class="diff-tag">ASC 606-10-25-1</span></div>
      <p style="font-size:13px;color:#666;margin-bottom:12px">All five criteria must be met before you can account for this as a revenue contract.</p>
      <table class="criteria-table">
        <thead><tr><th style="width:28%">Criterion</th><th style="width:34%">Question</th><th style="width:18%">Response</th><th>Evidence / notes</th></tr></thead>
        <tbody id="criteria-body"></tbody>
      </table>
      <div id="criteria-result"></div>
      <div class="field-grid fg-3" style="margin-top:12px">
        <div class="field"><label>Contract form</label>
          <select id="c_form"><option>— select —</option><option>Written</option><option>Oral</option><option>Implied by practice</option></select>
        </div>
        <div class="field"><label>Contract modifications?</label>
          <select id="c_mod"><option>— select —</option><option>None</option><option>Yes — new contract</option><option>Yes — modification of existing</option></select>
        </div>
        <div class="field"><label>Contract combinations?</label>
          <select id="c_combo"><option>— select —</option><option>No</option><option>Yes — combined</option></select>
        </div>
      </div>
      <div class="field"><label>Notes</label><textarea id="c_mod_notes" rows="2" placeholder="Document any modifications, combinations, or unmet criteria"></textarea></div>
    </div>
    <div class="nav-row"><button class="btn" onclick="goTab(0)">&larr; Back</button><button class="btn btn-primary" onclick="goTab(2)">Next: Step 2 &rarr;</button></div>
  </div>

  <div class="panel" id="tab2">
    <div class="card">
      <div class="sec-hdr">Step 2 — identify performance obligations &nbsp;<span class="diff-tag">ASC 606-10-25-14</span></div>
      <p style="font-size:13px;color:#666;margin-bottom:12px">A good/service is distinct if it is <em>capable of being distinct</em> AND <em>distinct within the contract</em>.</p>
      <div style="overflow-x:auto">
        <table class="po-table" id="po-table">
          <thead><tr>
            <th style="width:30px">#</th><th style="width:200px">Description</th>
            <th style="width:90px">Capable?</th><th style="width:90px">Distinct in contract?</th>
            <th style="width:80px">PO?</th><th style="width:110px">Timing</th>
          </tr></thead>
          <tbody id="po-body"></tbody>
        </table>
      </div>
      <button class="btn" onclick="addPO()" style="margin-top:8px;font-size:12px">+ add obligation</button>
      <div id="po-summary" style="margin-top:12px"></div>
      <div class="field-grid fg-2" style="margin-top:12px">
        <div class="field"><label>Series provision?</label>
          <select id="c_series"><option>No</option><option>Yes — single PO</option></select>
        </div>
        <div class="field"><label>Principal / agent?</label>
          <select id="c_pa"><option>Not required</option><option>Principal (gross)</option><option>Agent (net)</option></select>
        </div>
      </div>
      <div class="field"><label>Bundling notes</label><textarea id="po_notes" rows="2" placeholder="Explain any bundled goods/services"></textarea></div>
    </div>
    <div class="nav-row"><button class="btn" onclick="goTab(1)">&larr; Back</button><button class="btn btn-primary" onclick="goTab(3)">Next: Step 3 &rarr;</button></div>
  </div>

  <div class="panel" id="tab3">
    <div class="card">
      <div class="sec-hdr">Step 3 — determine the transaction price &nbsp;<span class="diff-tag">ASC 606-10-32-2</span></div>
      <div class="vc-row">
        <span class="vc-lbl">Base contract price ($)</span>
        <div class="vc-val"><input type="number" id="tp_base" placeholder="0.00" min="0" step="0.01" oninput="calcTP()" style="max-width:180px;padding:6px 10px;border:1px solid #ccc;border-radius:8px;font-size:14px;font-family:monospace"></div>
      </div>
      <div class="vc-row">
        <span class="vc-lbl">Variable consideration?</span>
        <div class="vc-val"><div class="radio-group">
          <label><input type="radio" name="vc_yn" value="no" checked onchange="toggleVC()"> None</label>
          <label><input type="radio" name="vc_yn" value="yes" onchange="toggleVC()"> Yes</label>
        </div></div>
      </div>
      <div id="vc-section" style="display:none">
        <div class="vc-row"><span class="vc-lbl">Estimation method</span>
          <div class="vc-val"><div class="radio-group">
            <label><input type="radio" name="vc_method" value="ev" checked> Expected value</label>
            <label><input type="radio" name="vc_method" value="mla"> Most likely amount</label>
          </div></div>
        </div>
        <div class="vc-row"><span class="vc-lbl">Estimated VC ($)</span>
          <div class="vc-val"><input type="number" id="vc_gross" placeholder="0.00" min="0" step="0.01" oninput="calcTP()" style="max-width:180px;padding:6px 10px;border:1px solid #ccc;border-radius:8px;font-size:13px;font-family:monospace"></div>
        </div>
        <div class="vc-row"><span class="vc-lbl">Constraint applied?</span>
          <div class="vc-val"><select id="vc_constraint" onchange="calcTP()" style="max-width:280px">
            <option value="none">No constraint — include full amount</option>
            <option value="partial">Partially constrained — enter included amount</option>
            <option value="full">Fully constrained — exclude entirely</option>
          </select></div>
        </div>
        <div class="vc-row" id="vc_inc_row" style="display:none"><span class="vc-lbl">Included VC ($)</span>
          <div class="vc-val"><input type="number" id="vc_included" placeholder="0.00" min="0" step="0.01" oninput="calcTP()" style="max-width:180px;padding:6px 10px;border:1px solid #ccc;border-radius:8px;font-size:13px;font-family:monospace"></div>
        </div>
      </div>
      <div class="vc-row"><span class="vc-lbl">Significant financing?</span>
        <div class="vc-val"><div class="radio-group">
          <label><input type="radio" name="sfc_yn" value="no" checked onchange="toggleSFC()"> No</label>
          <label><input type="radio" name="sfc_yn" value="yes" onchange="toggleSFC()"> Yes</label>
          <label><input type="radio" name="sfc_yn" value="expedient" onchange="toggleSFC()"> Expedient (&le;1yr)</label>
        </div></div>
      </div>
      <div id="sfc-section" style="display:none" class="vc-row"><span class="vc-lbl">Financing adj. ($)</span>
        <div class="vc-val"><input type="number" id="sfc_adj" placeholder="0.00" step="0.01" oninput="calcTP()" style="max-width:180px;padding:6px 10px;border:1px solid #ccc;border-radius:8px;font-size:13px;font-family:monospace"></div>
      </div>
      <div class="vc-row"><span class="vc-lbl">Non-cash consideration ($)</span>
        <div class="vc-val"><input type="number" id="ncc_val" placeholder="FV or 0" min="0" step="0.01" oninput="calcTP()" style="max-width:180px;padding:6px 10px;border:1px solid #ccc;border-radius:8px;font-size:13px;font-family:monospace"></div>
      </div>
      <div class="vc-row"><span class="vc-lbl">Consideration payable to customer ($)</span>
        <div class="vc-val"><input type="number" id="cpc_val" placeholder="Reduction or 0" min="0" step="0.01" oninput="calcTP()" style="max-width:180px;padding:6px 10px;border:1px solid #ccc;border-radius:8px;font-size:13px;font-family:monospace"></div>
      </div>
      <div class="total-bar" style="margin-top:14px">
        <span class="lbl">Total transaction price</span>
        <span class="val" id="tp_total">$0.00</span>
      </div>
      <div id="tp-breakdown" style="margin-top:8px;font-size:12px;color:#666"></div>
    </div>
    <div class="nav-row"><button class="btn" onclick="goTab(2)">&larr; Back</button><button class="btn btn-primary" onclick="goTab(4)">Next: Step 4 &rarr;</button></div>
  </div>

  <div class="panel" id="tab4">
    <div class="card">
      <div class="sec-hdr">Step 4 — allocate the transaction price &nbsp;<span class="diff-tag">ASC 606-10-32-28</span></div>
      <p style="font-size:13px;color:#666;margin-bottom:10px">Enter stand-alone selling prices. Allocation calculates automatically.</p>
      <div id="alloc-tp-reminder" style="margin-bottom:10px"></div>
      <div style="overflow-x:auto">
        <table class="po-table" id="alloc-table">
          <thead><tr>
            <th style="width:30px">#</th><th>Performance obligation</th>
            <th style="width:110px">SSP method</th><th style="width:100px">SSP ($)</th>
            <th style="width:70px">SSP %</th><th style="width:100px">Allocated TP ($)</th>
          </tr></thead>
          <tbody id="alloc-body"></tbody>
          <tfoot><tr style="background:#f5f5f5">
            <td colspan="3" style="padding:8px;font-weight:500;font-size:12px;color:#1F3864">Total</td>
            <td style="padding:8px;font-family:monospace;font-size:13px;font-weight:500;color:#1F3864" id="alloc-ssp-total">$0.00</td>
            <td style="padding:8px;font-family:monospace;font-size:13px;color:#1F3864" id="alloc-pct-total">100%</td>
            <td style="padding:8px;font-family:monospace;font-size:13px;font-weight:500;color:#1F3864" id="alloc-tp-total">$0.00</td>
          </tr></tfoot>
        </table>
      </div>
      <div id="alloc-warn" style="margin-top:8px"></div>
    </div>
    <div class="nav-row"><button class="btn" onclick="goTab(3)">&larr; Back</button><button class="btn btn-primary" onclick="goTab(5)">Next: Step 5 &rarr;</button></div>
  </div>

  <div class="panel" id="tab5">
    <div class="card">
      <div class="sec-hdr">Step 5 — recognize revenue &nbsp;<span class="diff-tag">ASC 606-10-25-23</span></div>
      <div id="recog-section"></div>
    </div>
    <div class="card">
      <div class="sec-hdr">Special arrangements checklist</div>
      <div class="checklist" id="special-chk"></div>
    </div>
    <div class="nav-row"><button class="btn" onclick="goTab(4)">&larr; Back</button><button class="btn btn-primary" onclick="goTab(6)">Next: Costs &rarr;</button></div>
  </div>

  <div class="panel" id="tab6">
    <div class="card">
      <div class="sec-hdr">Contract costs &nbsp;<span class="diff-tag">ASC 340-40</span></div>
      <table class="criteria-table" style="margin-bottom:8px">
        <thead><tr><th>Cost type</th><th>Example</th><th>Treatment</th><th>Amount ($)</th><th>Amort. (months)</th></tr></thead>
        <tbody>
          <tr>
            <td style="font-weight:500">Costs to obtain</td>
            <td style="color:#666;font-size:12px">Sales commissions</td>
            <td><select id="cost_obtain_t" style="font-size:12px;padding:4px 6px;border:1px solid #ccc;border-radius:5px"><option>Capitalize</option><option>Expense (&le;1 yr)</option><option>N/A</option></select></td>
            <td><input type="number" id="cost_obtain_amt" placeholder="0.00" min="0" step="0.01" oninput="calcCosts()" style="width:100%;padding:4px 6px;border:1px solid #ccc;border-radius:5px;font-family:monospace;font-size:12px"></td>
            <td><input type="number" id="cost_obtain_mo" placeholder="—" min="0" style="width:100%;padding:4px 6px;border:1px solid #ccc;border-radius:5px;font-size:12px"></td>
          </tr>
          <tr>
            <td style="font-weight:500">Costs to fulfill</td>
            <td style="color:#666;font-size:12px">Setup, mobilization</td>
            <td><select id="cost_fulfill_t" style="font-size:12px;padding:4px 6px;border:1px solid #ccc;border-radius:5px"><option>Capitalize</option><option>Expense</option><option>N/A</option></select></td>
            <td><input type="number" id="cost_fulfill_amt" placeholder="0.00" min="0" step="0.01" oninput="calcCosts()" style="width:100%;padding:4px 6px;border:1px solid #ccc;border-radius:5px;font-family:monospace;font-size:12px"></td>
            <td><input type="number" id="cost_fulfill_mo" placeholder="—" min="0" style="width:100%;padding:4px 6px;border:1px solid #ccc;border-radius:5px;font-size:12px"></td>
          </tr>
        </tbody>
      </table>
      <div id="costs-total"></div>
    </div>
    <div class="card">
      <div class="sec-hdr">Disclosure checklist &nbsp;<span class="diff-tag">ASC 606-10-50</span></div>
      <div class="checklist" id="disc-chk"></div>
    </div>
    <div class="nav-row"><button class="btn" onclick="goTab(5)">&larr; Back</button><button class="btn btn-primary" onclick="goTab(7)">Next: Summary &rarr;</button></div>
  </div>

  <div class="panel" id="tab7">
    <div class="card">
      <div class="sec-hdr">Worksheet summary</div>
      <div class="sum-grid" id="sum-grid"></div>
      <div id="sum-po-table"></div>
      <div id="sum-alerts" style="margin-top:12px"></div>
    </div>
    <div class="card">
      <div class="sec-hdr">Sign-off</div>
      <table class="sign-table">
        <thead><tr><th>Role</th><th>Name (print)</th><th>Date</th><th>Notes</th></tr></thead>
        <tbody id="signoff-body"></tbody>
      </table>
    </div>
    <div class="nav-row">
      <button class="btn" onclick="goTab(6)">&larr; Back</button>
      <button class="btn btn-primary" onclick="window.print()">Print / save PDF</button>
    </div>
    <p class="footnote" style="margin-top:12px">Retain this worksheet with the contract file. Update when a contract modification or triggering event occurs.</p>
  </div>
</div>

<script>
var currentTab=0,numPOs=0,poData=[];
var CRITERIA=[
  {id:'cr_a',label:'(a) Approval & commitment',q:"All parties approved and committed to perform?"},
  {id:'cr_b',label:'(b) Rights identified',q:"Each party's rights re: goods/services identified?"},
  {id:'cr_c',label:'(c) Payment terms',q:"Payment terms for the goods/services identified?"},
  {id:'cr_d',label:'(d) Commercial substance',q:"Risk, timing, or cash flows expected to change?"},
  {id:'cr_e',label:'(e) Collectibility',q:"Probable to collect substantially all consideration?"},
];
var SPECIAL=['Bill-and-hold — all 4 criteria met?','Consignment — revenue deferred to end-customer sale?','Right of return — liability and asset recorded?','Repurchase agreement — sale vs. financing reviewed?','Warranty — assurance-type (ASC 460) vs. service-type PO?','License — right-to-access (OT) vs. right-to-use (PT)?','Variable consideration reassessed at reporting date?','Remaining PO disclosure required or expedient elected?'];
var DISC=['Revenue disaggregation prepared','Contract asset/liability balances disclosed','Remaining PO disclosure prepared (or expedient elected)','Significant judgments documented','Variable consideration constraint documented','Capitalized contract cost disclosures prepared','Changes in estimates disclosed','Practical expedients elected noted in disclosures'];
var SIGNOFF=['Preparer','Reviewer','Manager / Controller','CFO (if material)'];
function fmt(n){return isNaN(n)?'$0.00':'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}
function pct(n){return isNaN(n)?'0.0%':n.toFixed(1)+'%'}
function goTab(i){
  document.querySelectorAll('.panel').forEach(function(p,j){p.classList.toggle('active',j===i)});
  document.querySelectorAll('.tab').forEach(function(t,j){t.classList.toggle('active',j===i)});
  currentTab=i;
  document.getElementById('prog').style.width=Math.round((i/7)*100)+'%';
  if(i===4)refreshAlloc();if(i===5)refreshRecog();if(i===7)refreshSummary();
}
function buildCriteria(){
  var tb=document.getElementById('criteria-body');tb.innerHTML='';
  CRITERIA.forEach(function(c){
    var tr=document.createElement('tr');
    tr.innerHTML='<td style="font-weight:500;font-size:12px">'+c.label+'</td><td style="font-size:12px;color:#666">'+c.q+'</td><td><div class="radio-group" style="gap:8px"><label><input type="radio" name="'+c.id+'" value="yes" onchange="evalCriteria()"> Yes</label><label><input type="radio" name="'+c.id+'" value="no" onchange="evalCriteria()"> No</label><label><input type="radio" name="'+c.id+'" value="na" onchange="evalCriteria()"> N/A</label></div></td><td><input placeholder="Evidence" style="width:100%;padding:4px 8px;border:1px solid #ccc;border-radius:5px;font-size:12px"></td>';
    tb.appendChild(tr);
  });
  evalCriteria();
}
function evalCriteria(){
  var allMet=true,anyAnswered=false;
  CRITERIA.forEach(function(c){var v=document.querySelector('input[name="'+c.id+'"]:checked');if(v)anyAnswered=true;if(!v||v.value==='no')allMet=false;});
  var el=document.getElementById('criteria-result');
  if(!anyAnswered){el.innerHTML='';return;}
  el.innerHTML=allMet?'<div class="alert alert-ok" style="margin-top:8px">All five criteria met — proceed with revenue recognition.</div>':'<div class="alert alert-warn" style="margin-top:8px">One or more criteria not met. Do not recognize revenue. Record consideration received as a liability.</div>';
}
function addPO(){
  numPOs++;var idx=numPOs;var tb=document.getElementById('po-body');var tr=document.createElement('tr');tr.id='po-row-'+idx;
  tr.innerHTML='<td style="text-align:center;color:#999;font-size:12px">'+idx+'</td><td><input id="po_desc_'+idx+'" placeholder="Description" oninput="syncPO('+idx+')" style="width:100%;padding:4px 6px;border:1px solid #ccc;border-radius:5px;font-size:12px"></td><td><select id="po_cap_'+idx+'" onchange="syncPO('+idx+')" style="width:100%;font-size:11px;padding:3px;border:1px solid #ccc;border-radius:4px"><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></select></td><td><select id="po_wit_'+idx+'" onchange="syncPO('+idx+')" style="width:100%;font-size:11px;padding:3px;border:1px solid #ccc;border-radius:4px"><option value="">—</option><option value="yes">Yes</option><option value="no">No</option></select></td><td style="text-align:center" id="po_is_'+idx+'"><span style="color:#999;font-size:12px">—</span></td><td><select id="po_timing_'+idx+'" onchange="syncPO('+idx+')" style="width:100%;font-size:11px;padding:3px;border:1px solid #ccc;border-radius:4px"><option value="">— select —</option><option value="ot">Over time</option><option value="pt">Point in time</option></select></td>';
  tb.appendChild(tr);syncPO(idx);
}
function syncPO(idx){
  var cap=document.getElementById('po_cap_'+idx).value,wit=document.getElementById('po_wit_'+idx).value,isPO=(cap==='yes'&&wit==='yes');
  var cell=document.getElementById('po_is_'+idx);
  if(cap===''||wit==='')cell.innerHTML='<span style="color:#999;font-size:12px">—</span>';
  else if(isPO)cell.innerHTML='<span class="badge badge-ok">Yes</span>';
  else cell.innerHTML='<span class="badge" style="background:#FCEBEB;color:#A32D2D">No</span>';
  rebuildPOData();if(currentTab===4)refreshAlloc();
}
function rebuildPOData(){
  poData=[];
  for(var i=1;i<=numPOs;i++){
    var d=document.getElementById('po_desc_'+i);if(!d)continue;
    var cap=document.getElementById('po_cap_'+i).value,wit=document.getElementById('po_wit_'+i).value,t=document.getElementById('po_timing_'+i);
    poData.push({idx:i,desc:d.value||('PO '+i),isPO:(cap==='yes'&&wit==='yes'),timing:t?t.value:''});
  }
  var v=poData.filter(function(p){return p.isPO;});
  var el=document.getElementById('po-summary');
  el.innerHTML=poData.length?'<div class="total-bar"><span class="lbl">Performance obligations identified</span><span class="val" style="font-size:18px">'+v.length+'</span></div>':'';
}
function getTP(){
  var base=parseFloat(document.getElementById('tp_base').value)||0;
  var vc_yn=document.querySelector('input[name="vc_yn"]:checked');var vc=0;
  if(vc_yn&&vc_yn.value==='yes'){var c=document.getElementById('vc_constraint').value;if(c==='none')vc=parseFloat(document.getElementById('vc_gross').value)||0;else if(c==='partial')vc=parseFloat(document.getElementById('vc_included').value)||0;}
  var sfc_yn=document.querySelector('input[name="sfc_yn"]:checked');var sfc=sfc_yn&&sfc_yn.value==='yes'?(parseFloat(document.getElementById('sfc_adj').value)||0):0;
  var ncc=parseFloat(document.getElementById('ncc_val').value)||0,cpc=parseFloat(document.getElementById('cpc_val').value)||0;
  return Math.max(0,base+vc+sfc+ncc-cpc);
}
function calcTP(){
  var cv=document.getElementById('vc_constraint').value;
  document.getElementById('vc_inc_row').style.display=cv==='partial'?'flex':'none';
  var tp=getTP();document.getElementById('tp_total').textContent=fmt(tp);
  var base=parseFloat(document.getElementById('tp_base').value)||0,parts=[];
  if(base>0)parts.push('Base: '+fmt(base));
  var vc_yn=document.querySelector('input[name="vc_yn"]:checked');
  if(vc_yn&&vc_yn.value==='yes'){var cv2=document.getElementById('vc_constraint').value,vi=cv2==='none'?(parseFloat(document.getElementById('vc_gross').value)||0):(cv2==='partial'?(parseFloat(document.getElementById('vc_included').value)||0):0);if(vi>0)parts.push('+ VC: '+fmt(vi));if(cv2==='full')parts.push('VC fully excluded');}
  var ncc=parseFloat(document.getElementById('ncc_val').value)||0,cpc=parseFloat(document.getElementById('cpc_val').value)||0;
  if(ncc>0)parts.push('+ Non-cash: '+fmt(ncc));if(cpc>0)parts.push('− Cust. payment: '+fmt(cpc));
  document.getElementById('tp-breakdown').innerHTML=parts.join(' | ');
  if(currentTab===4)refreshAlloc();
}
function toggleVC(){var yn=document.querySelector('input[name="vc_yn"]:checked').value;document.getElementById('vc-section').style.display=yn==='yes'?'block':'none';calcTP();}
function toggleSFC(){var yn=document.querySelector('input[name="sfc_yn"]:checked').value;document.getElementById('sfc-section').style.display=yn==='yes'?'flex':'none';calcTP();}
function refreshAlloc(){
  var tp=getTP(),validPOs=poData.filter(function(p){return p.isPO;});
  document.getElementById('alloc-tp-reminder').innerHTML='<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="font-size:13px;color:#666">Transaction price to allocate:</span><span style="font-family:monospace;font-size:16px;font-weight:500;color:#1F3864">'+fmt(tp)+'</span></div>';
  var tb=document.getElementById('alloc-body'),existing={};
  document.querySelectorAll('[data-ssp]').forEach(function(el){existing[el.getAttribute('data-po')]=el.value;});
  tb.innerHTML='';
  validPOs.forEach(function(po){
    var prev=existing[po.idx]||'';
    var tr=document.createElement('tr');
    tr.innerHTML='<td style="text-align:center;color:#999;font-size:12px">'+po.idx+'</td><td style="font-size:12px;font-weight:500">'+po.desc+'</td><td><select data-ssp-method="'+po.idx+'" style="width:100%;font-size:11px;padding:3px;border:1px solid #ccc;border-radius:4px"><option>Market</option><option>Cost + margin</option><option>Residual</option></select></td><td><input type="number" data-ssp="1" data-po="'+po.idx+'" value="'+prev+'" placeholder="0.00" min="0" step="0.01" oninput="calcAlloc()" style="width:100%;padding:4px 6px;border:1px solid #ccc;border-radius:5px;font-family:monospace;font-size:12px"></td><td style="font-family:monospace;font-size:12px;text-align:right;padding:6px 8px" id="alloc-pct-'+po.idx+'">—</td><td style="font-family:monospace;font-size:13px;font-weight:500;text-align:right;padding:6px 8px;color:#1F3864" id="alloc-amt-'+po.idx+'">—</td>';
    tb.appendChild(tr);
  });
  calcAlloc();
}
function calcAlloc(){
  var tp=getTP(),validPOs=poData.filter(function(p){return p.isPO;}),totalSSP=0;
  validPOs.forEach(function(po){var el=document.querySelector('[data-po="'+po.idx+'"]');totalSSP+=(el?parseFloat(el.value)||0:0);});
  var allocTotal=0;
  validPOs.forEach(function(po){
    var el=document.querySelector('[data-po="'+po.idx+'"]'),ssp=el?parseFloat(el.value)||0:0;
    var p=totalSSP>0?ssp/totalSSP:0,alloc=tp*p;allocTotal+=alloc;
    var pe=document.getElementById('alloc-pct-'+po.idx),ae=document.getElementById('alloc-amt-'+po.idx);
    if(pe)pe.textContent=pct(p*100);if(ae)ae.textContent=fmt(alloc);
  });
  document.getElementById('alloc-ssp-total').textContent=fmt(totalSSP);
  document.getElementById('alloc-tp-total').textContent=fmt(allocTotal);
  document.getElementById('alloc-warn').innerHTML=validPOs.length>0&&totalSSP===0?'<div class="alert alert-warn">Enter SSP for each PO to compute the allocation.</div>':'';
}
function refreshRecog(){
  var validPOs=poData.filter(function(p){return p.isPO;});
  var el=document.getElementById('recog-section');
  if(validPOs.length===0){el.innerHTML='<div class="alert alert-warn">No POs yet. Complete Step 2 first.</div>';buildSpecial();return;}
  var tp=getTP(),ssps=[],totalSSP=0;
  validPOs.forEach(function(po){var el2=document.querySelector('[data-po="'+po.idx+'"]'),ssp=el2?parseFloat(el2.value)||0:0;ssps.push(ssp);totalSSP+=ssp;});
  var html='<div style="overflow-x:auto"><table class="po-table"><thead><tr><th style="width:30px">#</th><th>PO</th><th style="width:90px">Alloc. TP</th><th style="width:90px">Timing</th><th style="width:110px">Method/trigger</th><th style="width:80px">P1 ($)</th><th style="width:80px">P2 ($)</th><th style="width:80px">P3 ($)</th><th style="width:80px">P4 ($)</th><th style="width:80px">Total ($)</th></tr></thead><tbody>';
  validPOs.forEach(function(po,i){
    var p=totalSSP>0?ssps[i]/totalSSP:0,alloc=tp*p,timing=po.timing==='ot'?'Over time':(po.timing==='pt'?'Point in time':'—');
    html+='<tr><td style="text-align:center;color:#999;font-size:12px">'+po.idx+'</td><td style="font-size:12px;font-weight:500">'+po.desc+'</td><td style="font-family:monospace;font-size:12px;text-align:right">'+fmt(alloc)+'</td><td style="font-size:11px;color:'+(po.timing==='ot'?'#0F6E56':'#1F3864')+';font-weight:500">'+timing+'</td><td><input id="recog_method_'+po.idx+'" placeholder="e.g. % complete" style="width:100%;padding:3px 5px;border:1px solid #ccc;border-radius:4px;font-size:11px"></td><td><input type="number" id="recog_p1_'+po.idx+'" placeholder="0" min="0" step="0.01" oninput="calcRecog('+po.idx+')" style="width:100%;padding:3px 5px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:12px"></td><td><input type="number" id="recog_p2_'+po.idx+'" placeholder="0" min="0" step="0.01" oninput="calcRecog('+po.idx+')" style="width:100%;padding:3px 5px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:12px"></td><td><input type="number" id="recog_p3_'+po.idx+'" placeholder="0" min="0" step="0.01" oninput="calcRecog('+po.idx+')" style="width:100%;padding:3px 5px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:12px"></td><td><input type="number" id="recog_p4_'+po.idx+'" placeholder="0" min="0" step="0.01" oninput="calcRecog('+po.idx+')" style="width:100%;padding:3px 5px;border:1px solid #ccc;border-radius:4px;font-family:monospace;font-size:12px"></td><td style="font-family:monospace;font-size:12px;font-weight:500;text-align:right;padding:6px 8px;color:#1F3864" id="recog_tot_'+po.idx+'">$0.00</td></tr>';
  });
  html+='</tbody><tfoot><tr style="background:#f5f5f5"><td colspan="5" style="padding:8px;font-weight:500;font-size:12px;color:#1F3864">Total recognized</td><td style="font-family:monospace;font-size:12px;font-weight:500;color:#1F3864;padding:6px 8px" id="recog_col1">$0.00</td><td style="font-family:monospace;font-size:12px;font-weight:500;color:#1F3864;padding:6px 8px" id="recog_col2">$0.00</td><td style="font-family:monospace;font-size:12px;font-weight:500;color:#1F3864;padding:6px 8px" id="recog_col3">$0.00</td><td style="font-family:monospace;font-size:12px;font-weight:500;color:#1F3864;padding:6px 8px" id="recog_col4">$0.00</td><td style="font-family:monospace;font-size:13px;font-weight:500;color:#1F3864;padding:6px 8px" id="recog_grand">$0.00</td></tr></tfoot></table></div>';
  el.innerHTML=html;buildSpecial();
}
function calcRecog(idx){
  var p1=parseFloat((document.getElementById('recog_p1_'+idx)||{}).value)||0,p2=parseFloat((document.getElementById('recog_p2_'+idx)||{}).value)||0,p3=parseFloat((document.getElementById('recog_p3_'+idx)||{}).value)||0,p4=parseFloat((document.getElementById('recog_p4_'+idx)||{}).value)||0;
  var tot=p1+p2+p3+p4;document.getElementById('recog_tot_'+idx).textContent=fmt(tot);
  var validPOs=poData.filter(function(p){return p.isPO;}),c1=0,c2=0,c3=0,c4=0,grand=0;
  validPOs.forEach(function(po){
    var a=parseFloat((document.getElementById('recog_p1_'+po.idx)||{}).value)||0,b=parseFloat((document.getElementById('recog_p2_'+po.idx)||{}).value)||0,c=parseFloat((document.getElementById('recog_p3_'+po.idx)||{}).value)||0,d=parseFloat((document.getElementById('recog_p4_'+po.idx)||{}).value)||0;
    c1+=a;c2+=b;c3+=c;c4+=d;grand+=a+b+c+d;
  });
  ['recog_col1','recog_col2','recog_col3','recog_col4','recog_grand'].forEach(function(id,i){var e=document.getElementById(id);if(e)e.textContent=fmt([c1,c2,c3,c4,grand][i]);});
}
function buildSpecial(){
  var el=document.getElementById('special-chk');el.innerHTML='';
  SPECIAL.forEach(function(s,i){
    var div=document.createElement('div');div.className='chk-item';div.id='spec-item-'+i;
    div.innerHTML='<input type="checkbox" id="spec_'+i+'" onchange="toggleChk(this,\'spec-item-'+i+'\')"><label for="spec_'+i+'">'+s+'</label>';
    el.appendChild(div);
  });
}
function buildDisc(){
  var el=document.getElementById('disc-chk');el.innerHTML='';
  DISC.forEach(function(s,i){
    var div=document.createElement('div');div.className='chk-item';div.id='disc-item-'+i;
    div.innerHTML='<input type="checkbox" id="disc_'+i+'" onchange="toggleChk(this,\'disc-item-'+i+'\')"><label for="disc_'+i+'">'+s+'</label>';
    el.appendChild(div);
  });
}
function toggleChk(cb,itemId){document.getElementById(itemId).classList.toggle('checked',cb.checked);}
function buildSignoff(){
  var tb=document.getElementById('signoff-body');tb.innerHTML='';
  SIGNOFF.forEach(function(r){
    var tr=document.createElement('tr');
    tr.innerHTML='<td style="font-weight:500;font-size:13px">'+r+'</td><td><input placeholder="Full name" style="width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:5px;font-size:13px"></td><td><input type="date" style="padding:5px 8px;border:1px solid #ccc;border-radius:5px;font-size:13px"></td><td><input placeholder="Optional" style="width:100%;padding:5px 8px;border:1px solid #ccc;border-radius:5px;font-size:13px"></td>';
    tb.appendChild(tr);
  });
}
function calcCosts(){
  var a=parseFloat(document.getElementById('cost_obtain_amt').value)||0,b=parseFloat(document.getElementById('cost_fulfill_amt').value)||0;
  var el=document.getElementById('costs-total');
  el.innerHTML=a+b>0?'<div class="total-bar"><span class="lbl">Total contract costs</span><span class="val">'+fmt(a+b)+'</span></div>':'';
}
function refreshSummary(){
  var tp=getTP(),validPOs=poData.filter(function(p){return p.isPO;}),otPOs=validPOs.filter(function(p){return p.timing==='ot';}).length,ptPOs=validPOs.filter(function(p){return p.timing==='pt';}).length,discChecked=document.querySelectorAll('#disc-chk input:checked').length;
  document.getElementById('sum-grid').innerHTML='<div class="sum-card"><div class="lbl">Transaction price</div><div class="val">'+fmt(tp)+'</div><div class="sub">Total per Step 3</div></div><div class="sum-card"><div class="lbl">Performance obligations</div><div class="val">'+validPOs.length+'</div><div class="sub">OT: '+otPOs+' &bull; PT: '+ptPOs+'</div></div><div class="sum-card"><div class="lbl">Disclosures checked</div><div class="val">'+discChecked+' / '+DISC.length+'</div><div class="sub">ASC 606-10-50</div></div>';
  var totalSSP=0,ssps={};
  validPOs.forEach(function(po){var el=document.querySelector('[data-po="'+po.idx+'"]'),ssp=el?parseFloat(el.value)||0:0;ssps[po.idx]=ssp;totalSSP+=ssp;});
  var po_html='<table class="po-table"><thead><tr><th>#</th><th>PO</th><th>Timing</th><th>Allocated TP</th></tr></thead><tbody>';
  validPOs.forEach(function(po){
    var p=totalSSP>0?ssps[po.idx]/totalSSP:0,alloc=tp*p,timing=po.timing==='ot'?'Over time':(po.timing==='pt'?'Point in time':'Not set');
    po_html+='<tr><td style="text-align:center;font-size:12px;color:#999">'+po.idx+'</td><td style="font-size:12px;font-weight:500">'+po.desc+'</td><td style="font-size:12px;font-weight:500">'+timing+'</td><td style="font-family:monospace;font-size:13px;text-align:right;padding:6px 8px;font-weight:500;color:#1F3864">'+fmt(alloc)+'</td></tr>';
  });
  po_html+='<tr style="background:#f5f5f5"><td colspan="3" style="padding:8px;font-weight:500;font-size:12px;color:#1F3864">Total</td><td style="font-family:monospace;font-size:14px;font-weight:500;color:#1F3864;text-align:right;padding:8px">'+fmt(tp)+'</td></tr></tbody></table>';
  document.getElementById('sum-po-table').innerHTML=po_html;
  var alerts='',allCrit=true;
  CRITERIA.forEach(function(c){var v=document.querySelector('input[name="'+c.id+'"]:checked');if(!v||v.value==='no')allCrit=false;});
  if(!allCrit)alerts+='<div class="alert alert-warn">Step 1: Not all contract criteria confirmed.</div>';
  if(validPOs.length===0)alerts+='<div class="alert alert-warn">Step 2: No performance obligations identified.</div>';
  if(tp===0)alerts+='<div class="alert alert-warn">Step 3: Transaction price is $0.</div>';
  if(discChecked<DISC.length)alerts+='<div class="alert alert-warn">Disclosures: '+(DISC.length-discChecked)+' item(s) unchecked.</div>';
  if(!alerts&&validPOs.length>0)alerts='<div class="alert alert-ok">Worksheet complete — ready for sign-off.</div>';
  document.getElementById('sum-alerts').innerHTML=alerts;
}
function init(){buildCriteria();buildDisc();buildSignoff();addPO();addPO();addPO();calcTP();}
init();
</script>
</body>
</html>
```

---

## 2. Month-end close tracker

**Target component:** `src/components/CloseTracker/index.tsx`

This is a 7-tab month-end close workflow. Tabs: Dashboard → Contract subledger →
Journal entries → Accruals & deferrals → Reconciliation → Period-end checklist →
Modification log.

Key behaviors to replicate exactly:
- Subledger rows flow into Dashboard metrics and summary table automatically
- Subledger OT rows auto-populate JE-01; PT rows auto-populate JE-02
- JE-05 auto-calculates monthly amortization from gross cost and months
- Every JE validates DR = CR and shows green/red balance indicator
- Accruals tracker computes unbilled balance (earned minus invoiced)
- Deferred tracker computes closing balance (opening + additions - released)
- Reconciliation compares subledger-derived balances vs. manually entered GL balances
- Period-end checklist: 27 items across 7 sections; items turn green when checked
- Progress bar and status badge track overall close completion
- "Load sample data" populates 5 sample contracts

```html
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Month-End Close Tracker</title></head>
<body>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;font-size:14px;color:#1a1a1a;background:#f8f8f8;padding:1rem}
.app{max-width:920px;margin:0 auto;padding:1rem 0 3rem}
.banner{background:#1F3864;border-radius:10px;padding:1.1rem 1.5rem;margin-bottom:1rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px}
.banner-left h1{color:#fff;font-size:17px;font-weight:500;margin-bottom:3px}
.banner-left p{color:#A8C4E5;font-size:12px}
.banner-right{display:flex;gap:8px;align-items:center}
.close-badge{background:#0F6E56;color:#E1F5EE;font-size:11px;font-weight:500;padding:4px 10px;border-radius:8px}
.period-sel{padding:5px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font-size:12px}
.tabs{display:flex;gap:3px;margin-bottom:1rem;flex-wrap:wrap}
.tab{padding:7px 13px;border-radius:8px;border:1px solid #ccc;background:#fff;color:#666;cursor:pointer;font-size:12px;white-space:nowrap}
.tab:hover{background:#f0f0f0}
.tab.active{background:#1F3864;color:#fff;border-color:#1F3864;font-weight:500}
.panel{display:none}.panel.active{display:block}
.card{background:#fff;border:1px solid #e0e0e0;border-radius:10px;padding:1.1rem;margin-bottom:1rem}
.sec-hdr{background:#2E75B6;color:#fff;font-size:12px;font-weight:500;padding:7px 11px;border-radius:8px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between}
.ref-tag{background:rgba(255,255,255,.18);color:#fff;font-size:10px;padding:2px 7px;border-radius:4px}
.metric-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:1rem}
.metric{background:#f5f5f5;border-radius:8px;padding:10px 12px}
.metric .lbl{font-size:11px;color:#666;margin-bottom:4px}
.metric .val{font-size:20px;font-weight:500;font-family:monospace}
.metric .sub{font-size:10px;color:#999;margin-top:2px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#1F3864;color:#fff;padding:7px 8px;text-align:left;font-weight:500;font-size:11px;white-space:nowrap}
td{padding:6px 8px;border-bottom:1px solid #eee;vertical-align:middle}
tr:nth-child(even) td{background:#f9f9f9}
input,select{padding:5px 8px;border:1px solid #ccc;border-radius:8px;background:#fff;color:#1a1a1a;font-size:12px}
input:focus,select:focus{outline:none;border-color:#2E75B6}
input[type=number]{font-family:monospace}
.btn{padding:7px 14px;border-radius:8px;border:1px solid #ccc;background:#fff;color:#1a1a1a;font-size:12px;cursor:pointer}
.btn:hover{background:#f0f0f0}
.btn-primary{background:#1F3864;color:#fff;border-color:#1F3864}
.btn-primary:hover{background:#2E75B6}
.btn-danger{background:#FCEBEB;color:#A32D2D;border-color:#F7C1C1}
.btn-sm{padding:4px 9px;font-size:11px}
.btn-success{background:#0F6E56;color:#fff;border-color:#0F6E56}
.badge{display:inline-flex;align-items:center;padding:2px 7px;border-radius:4px;font-size:10px;font-weight:500;white-space:nowrap}
.badge-ok{background:#E1F5EE;color:#085041}
.badge-warn{background:#FAEEDA;color:#633806}
.badge-err{background:#FCEBEB;color:#A32D2D}
.badge-info{background:#E6F1FB;color:#0C447C}
.badge-gray{background:#f0f0f0;color:#666}
.je-card{background:#fff;border:1px solid #e0e0e0;border-radius:10px;margin-bottom:12px;overflow:hidden}
.je-hdr{padding:10px 12px;background:#f5f5f5;display:flex;align-items:center;justify-content:space-between;cursor:pointer}
.je-hdr h3{font-size:13px;font-weight:500}
.je-body{padding:10px 12px;display:none}
.je-body.open{display:block}
.dr{color:#0C447C;font-weight:500}
.cr{color:#A32D2D;font-weight:500}
.je-total{display:flex;justify-content:flex-end;gap:24px;padding:6px 8px;background:#E6F1FB;border-radius:0 0 8px 8px;font-size:12px;font-weight:500;color:#0C447C;font-family:monospace}
.chk-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:10px}
.chk-item{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;border-radius:8px;border:1px solid #eee;cursor:pointer;font-size:12px;line-height:1.4}
.chk-item input[type=checkbox]{accent-color:#2E75B6;margin-top:1px;flex-shrink:0}
.chk-item.done{background:#E1F5EE;border-color:#9FE1CB;color:#085041}
.chk-section-hdr{font-size:12px;font-weight:500;color:#666;margin:10px 0 6px;text-transform:uppercase;letter-spacing:.04em}
.progress-wrap{height:6px;background:#e0e0e0;border-radius:3px;margin-bottom:1rem;overflow:hidden}
.progress-bar{height:100%;background:#2E75B6;border-radius:3px;transition:width .3s}
.alert{padding:9px 12px;border-radius:8px;font-size:12px;margin-bottom:8px;border:1px solid}
.alert-warn{background:#FAEEDA;color:#633806;border-color:#FAC775}
.alert-ok{background:#E1F5EE;color:#085041;border-color:#9FE1CB}
.alert-info{background:#E6F1FB;color:#0C447C;border-color:#B5D4F4}
.alert-err{background:#FCEBEB;color:#A32D2D;border-color:#F7C1C1}
.total-bar{background:#D6E4F7;border-radius:8px;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;margin-top:6px}
.total-bar .lbl{font-size:11px;font-weight:500;color:#1F3864}
.total-bar .val{font-size:15px;font-weight:500;color:#1F3864;font-family:monospace}
.fg3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px}
.field label{display:block;font-size:11px;font-weight:500;color:#666;margin-bottom:3px;text-transform:uppercase;letter-spacing:.04em}
.field input,.field select{width:100%}
.diff-ok{color:#085041;font-weight:500}
.diff-err{color:#A32D2D;font-weight:500}
</style>

<div class="app">
<div class="banner">
  <div class="banner-left">
    <h1>Month-end revenue close tracker</h1>
    <p>Accrual basis &bull; ASC 606 &bull; Subledger, journal entries, reconciliation &amp; checklist</p>
  </div>
  <div class="banner-right">
    <select class="period-sel" id="close-period">
      <option>January 2025</option><option>February 2025</option><option>March 2025</option>
      <option selected>April 2025</option><option>May 2025</option><option>June 2025</option>
      <option>July 2025</option><option>August 2025</option><option>September 2025</option>
      <option>October 2025</option><option>November 2025</option><option>December 2025</option>
    </select>
    <span class="close-badge" id="status-badge">Open</span>
  </div>
</div>
<div class="progress-wrap"><div class="progress-bar" id="main-prog" style="width:0%"></div></div>
<div class="tabs">
  <div class="tab active" onclick="gT(0)">Dashboard</div>
  <div class="tab" onclick="gT(1)">Contract subledger</div>
  <div class="tab" onclick="gT(2)">Journal entries</div>
  <div class="tab" onclick="gT(3)">Accruals &amp; deferrals</div>
  <div class="tab" onclick="gT(4)">Reconciliation</div>
  <div class="tab" onclick="gT(5)">Period-end checklist</div>
  <div class="tab" onclick="gT(6)">Mod log</div>
</div>

<div class="panel active" id="tab0">
  <div class="metric-grid" id="dash-metrics">
    <div class="metric"><div class="lbl">Revenue this period</div><div class="val" id="m-rev">$0.00</div><div class="sub">Accrual basis</div></div>
    <div class="metric"><div class="lbl">Over-time revenue</div><div class="val" id="m-ot">$0.00</div><div class="sub" id="m-ot-ct">0 contracts</div></div>
    <div class="metric"><div class="lbl">Point-in-time revenue</div><div class="val" id="m-pt">$0.00</div><div class="sub" id="m-pt-ct">0 contracts</div></div>
    <div class="metric"><div class="lbl">Deferred balance</div><div class="val" id="m-def">$0.00</div><div class="sub">Contract liability</div></div>
  </div>
  <div class="card">
    <div class="sec-hdr">Revenue by contract — current period<span class="ref-tag">subledger summary</span></div>
    <div style="overflow-x:auto"><table>
      <thead><tr><th>Contract</th><th>Customer</th><th>Type</th><th style="text-align:right">Alloc. TP</th><th style="text-align:right">Prior recog.</th><th style="text-align:right">This period</th><th style="text-align:right">Deferred</th><th>Status</th></tr></thead>
      <tbody id="dash-body"></tbody>
      <tfoot><tr style="background:#D6E4F7">
        <td colspan="3" style="font-weight:500;font-size:12px;color:#1F3864;padding:7px 8px">Total</td>
        <td style="text-align:right;font-family:monospace;font-weight:500;color:#1F3864;padding:7px 8px" id="d-tp">$0.00</td>
        <td style="text-align:right;font-family:monospace;font-weight:500;color:#1F3864;padding:7px 8px" id="d-prior">$0.00</td>
        <td style="text-align:right;font-family:monospace;font-weight:500;color:#1F3864;padding:7px 8px" id="d-cur">$0.00</td>
        <td style="text-align:right;font-family:monospace;font-weight:500;color:#1F3864;padding:7px 8px" id="d-def">$0.00</td>
        <td></td>
      </tr></tfoot>
    </table></div>
  </div>
  <div id="dash-alerts"></div>
</div>

<div class="panel" id="tab1">
  <div class="card">
    <div class="sec-hdr">Contract revenue subledger<span class="ref-tag">one row per performance obligation</span></div>
    <div style="overflow-x:auto">
    <table id="sub-table" style="table-layout:fixed;min-width:900px">
      <thead><tr>
        <th style="width:80px">Contract #</th><th style="width:120px">Customer</th>
        <th style="width:120px">PO description</th><th style="width:70px">Type</th>
        <th style="width:90px">Allocated TP ($)</th><th style="width:80px">Prior recog. ($)</th>
        <th style="width:80px">This period ($)</th><th style="width:80px">% complete</th>
        <th style="width:90px">Deferred bal. ($)</th><th style="width:70px">Acct code</th>
        <th style="width:60px">Action</th>
      </tr></thead>
      <tbody id="sub-body"></tbody>
    </table>
    </div>
    <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">
      <button class="btn btn-primary btn-sm" onclick="addSubRow()">+ add contract / PO</button>
      <button class="btn btn-sm" onclick="addSampleData()">load sample data</button>
    </div>
  </div>
  <div class="total-bar"><span class="lbl">Total revenue recognized — this period</span><span class="val" id="sub-period-total">$0.00</span></div>
</div>

<div class="panel" id="tab2">
  <div class="card">
    <div class="sec-hdr">Journal entry templates — revenue recognition (accrual basis)<span class="ref-tag">auto-populated from subledger</span></div>
    <p style="font-size:12px;color:#666;margin-bottom:12px">JE-01 and JE-02 auto-populate from the subledger. All entries validate DR = CR.</p>
  </div>
  <div class="je-card"><div class="je-hdr" onclick="toggleJE('je1-body')"><div style="display:flex;align-items:center;gap:8px"><span class="badge badge-info">JE-01</span><h3>Revenue recognition — over-time</h3></div><span style="font-size:11px;color:#666">click to expand</span></div>
  <div class="je-body" id="je1-body"><p style="font-size:12px;color:#666;margin-bottom:8px">Over-time POs from subledger. Debit A/R or unbilled revenue; credit revenue.</p>
  <table><thead><tr><th>Account</th><th style="width:80px">Acct code</th><th style="width:120px">Debit ($)</th><th style="width:120px">Credit ($)</th><th>Description</th></tr></thead><tbody id="je1-rows"></tbody></table>
  <div class="je-total" id="je1-totals">DR: $0.00 &nbsp;&nbsp; CR: $0.00</div><div id="je1-bal" style="margin-top:6px"></div></div></div>

  <div class="je-card"><div class="je-hdr" onclick="toggleJE('je2-body')"><div style="display:flex;align-items:center;gap:8px"><span class="badge badge-info">JE-02</span><h3>Revenue recognition — point-in-time</h3></div><span style="font-size:11px;color:#666">click to expand</span></div>
  <div class="je-body" id="je2-body"><p style="font-size:12px;color:#666;margin-bottom:8px">Point-in-time POs from subledger. Debit A/R; credit revenue on control transfer.</p>
  <table><thead><tr><th>Account</th><th style="width:80px">Acct code</th><th style="width:120px">Debit ($)</th><th style="width:120px">Credit ($)</th><th>Description</th></tr></thead><tbody id="je2-rows"></tbody></table>
  <div class="je-total" id="je2-totals">DR: $0.00 &nbsp;&nbsp; CR: $0.00</div><div id="je2-bal" style="margin-top:6px"></div></div></div>

  <div class="je-card"><div class="je-hdr" onclick="toggleJE('je3-body')"><div style="display:flex;align-items:center;gap:8px"><span class="badge badge-warn">JE-03</span><h3>Deferred revenue release</h3></div><span style="font-size:11px;color:#666">click to expand</span></div>
  <div class="je-body" id="je3-body"><p style="font-size:12px;color:#666;margin-bottom:8px">Release contract liability to revenue as POs are satisfied.</p>
  <table><thead><tr><th>Account</th><th style="width:80px">Acct code</th><th style="width:120px">Debit ($)</th><th style="width:120px">Credit ($)</th><th>Description</th></tr></thead>
  <tbody><tr><td class="dr">Deferred revenue (liability)</td><td><input placeholder="2150" style="width:70px"></td><td><input type="number" id="je3-dr" placeholder="0.00" oninput="calcJE3()" style="width:100px"></td><td style="color:#999">—</td><td style="font-size:11px;color:#666">Release of contract liability earned this period</td></tr>
  <tr><td class="cr">&nbsp;&nbsp;&nbsp;Revenue</td><td><input placeholder="4000" style="width:70px"></td><td style="color:#999">—</td><td><input type="number" id="je3-cr" placeholder="0.00" oninput="calcJE3()" style="width:100px"></td><td style="font-size:11px;color:#666">Revenue recognized from prior period advance</td></tr></tbody></table>
  <div class="je-total" id="je3-totals">DR: $0.00 &nbsp;&nbsp; CR: $0.00</div><div id="je3-bal" style="margin-top:6px"></div></div></div>

  <div class="je-card"><div class="je-hdr" onclick="toggleJE('je4-body')"><div style="display:flex;align-items:center;gap:8px"><span class="badge badge-warn">JE-04</span><h3>Unbilled revenue accrual — contract asset</h3></div><span style="font-size:11px;color:#666">click to expand</span></div>
  <div class="je-body" id="je4-body"><p style="font-size:12px;color:#666;margin-bottom:8px">Accrue revenue earned but not yet invoiced. Accrual basis — recognize when earned, not when billed.</p>
  <table><thead><tr><th>Account</th><th style="width:80px">Acct code</th><th style="width:120px">Debit ($)</th><th style="width:120px">Credit ($)</th><th>Description</th></tr></thead>
  <tbody><tr><td class="dr">Contract asset — unbilled revenue</td><td><input placeholder="1210" style="width:70px"></td><td><input type="number" id="je4-dr" placeholder="0.00" oninput="calcJE4()" style="width:100px"></td><td style="color:#999">—</td><td style="font-size:11px;color:#666">Revenue earned; invoice not yet issued</td></tr>
  <tr><td class="cr">&nbsp;&nbsp;&nbsp;Revenue</td><td><input placeholder="4000" style="width:70px"></td><td style="color:#999">—</td><td><input type="number" id="je4-cr" placeholder="0.00" oninput="calcJE4()" style="width:100px"></td><td style="font-size:11px;color:#666">Revenue accrued — earned not billed</td></tr></tbody></table>
  <div class="je-total" id="je4-totals">DR: $0.00 &nbsp;&nbsp; CR: $0.00</div><div id="je4-bal" style="margin-top:6px"></div>
  <div style="margin-top:8px;font-size:11px;color:#999">When invoice is issued: Dr A/R — Cr Contract asset (reclassify).</div></div></div>

  <div class="je-card"><div class="je-hdr" onclick="toggleJE('je5-body')"><div style="display:flex;align-items:center;gap:8px"><span class="badge badge-gray">JE-05</span><h3>Contract cost amortization (ASC 340-40)</h3></div><span style="font-size:11px;color:#666">click to expand</span></div>
  <div class="je-body" id="je5-body"><p style="font-size:12px;color:#666;margin-bottom:8px">Amortize capitalized contract costs. Enter gross cost and months — monthly amount auto-calculates.</p>
  <div class="fg3" style="margin-bottom:10px">
    <div class="field"><label>Gross cap. cost ($)</label><input type="number" id="je5-gross" placeholder="0.00" oninput="calcJE5()" style="width:100%"></div>
    <div class="field"><label>Amort. period (months)</label><input type="number" id="je5-months" placeholder="24" min="1" oninput="calcJE5()" style="width:100%"></div>
    <div class="field"><label>Monthly amort. ($)</label><input type="number" id="je5-mo" placeholder="auto" readonly style="width:100%;background:#f5f5f5"></div>
  </div>
  <table><thead><tr><th>Account</th><th style="width:80px">Acct code</th><th style="width:120px">Debit ($)</th><th style="width:120px">Credit ($)</th><th>Description</th></tr></thead>
  <tbody><tr><td class="dr">Contract cost amortization expense</td><td><input placeholder="7210" style="width:70px"></td><td><input type="number" id="je5-dr" placeholder="0.00" oninput="calcJE5b()" style="width:100px"></td><td style="color:#999">—</td><td style="font-size:11px;color:#666">Monthly amortization of capitalized contract cost</td></tr>
  <tr><td class="cr">&nbsp;&nbsp;&nbsp;Capitalized contract costs (asset)</td><td><input placeholder="1610" style="width:70px"></td><td style="color:#999">—</td><td><input type="number" id="je5-cr" placeholder="0.00" oninput="calcJE5b()" style="width:100px"></td><td style="font-size:11px;color:#666">Reduce capitalized asset by monthly amort.</td></tr></tbody></table>
  <div class="je-total" id="je5-totals">DR: $0.00 &nbsp;&nbsp; CR: $0.00</div><div id="je5-bal" style="margin-top:6px"></div></div></div>
</div>

<div class="panel" id="tab3">
  <div class="card">
    <div class="sec-hdr">Accrued revenue — earned not yet billed<span class="ref-tag">contract assets</span></div>
    <div style="overflow-x:auto"><table style="min-width:700px">
      <thead><tr><th>Contract / PO</th><th>Customer</th><th style="text-align:right">Earned ($)</th><th style="text-align:right">Invoiced ($)</th><th style="text-align:right">Unbilled ($)</th><th>Invoice date</th><th>Notes</th><th></th></tr></thead>
      <tbody id="accrual-body"></tbody>
    </table></div>
    <button class="btn btn-primary btn-sm" onclick="addAccrualRow()" style="margin-top:8px">+ add accrual</button>
    <div class="total-bar" style="margin-top:8px"><span class="lbl">Total unbilled contract assets</span><span class="val" id="accrual-total">$0.00</span></div>
  </div>
  <div class="card">
    <div class="sec-hdr">Deferred revenue — billed not yet earned<span class="ref-tag">contract liabilities</span></div>
    <div style="overflow-x:auto"><table style="min-width:700px">
      <thead><tr><th>Contract / PO</th><th>Customer</th><th style="text-align:right">Opening ($)</th><th style="text-align:right">Additions ($)</th><th style="text-align:right">Released ($)</th><th style="text-align:right">Closing ($)</th><th>Notes</th><th></th></tr></thead>
      <tbody id="defer-body"></tbody>
    </table></div>
    <button class="btn btn-primary btn-sm" onclick="addDeferRow()" style="margin-top:8px">+ add deferred item</button>
    <div class="total-bar" style="margin-top:8px"><span class="lbl">Total deferred revenue — period end</span><span class="val" id="defer-total">$0.00</span></div>
  </div>
</div>

<div class="panel" id="tab4">
  <div class="card">
    <div class="sec-hdr">Revenue reconciliation — GL vs. subledger<span class="ref-tag">must balance before close</span></div>
    <p style="font-size:12px;color:#666;margin-bottom:10px">Enter GL balances from your accounting system. Differences must be investigated.</p>
    <div class="fg3">
      <div class="field"><label>GL revenue balance ($)</label><input type="number" id="gl-rev" placeholder="0.00" oninput="calcRecon()" style="width:100%"></div>
      <div class="field"><label>GL deferred revenue ($)</label><input type="number" id="gl-def" placeholder="0.00" oninput="calcRecon()" style="width:100%"></div>
      <div class="field"><label>GL contract asset ($)</label><input type="number" id="gl-asset" placeholder="0.00" oninput="calcRecon()" style="width:100%"></div>
    </div>
  </div>
  <div class="card">
    <div class="sec-hdr">Reconciliation output</div>
    <table><thead><tr><th style="width:280px">Item</th><th style="text-align:right">Subledger ($)</th><th style="text-align:right">GL ($)</th><th style="text-align:right">Difference ($)</th><th>Status</th></tr></thead>
    <tbody id="recon-body"></tbody></table>
    <div id="recon-summary" style="margin-top:10px"></div>
  </div>
  <div class="card">
    <div class="sec-hdr">Difference investigation log</div>
    <table style="min-width:600px"><thead><tr><th>Item</th><th>Difference ($)</th><th>Root cause</th><th>Action</th><th>Owner</th><th>Status</th><th></th></tr></thead>
    <tbody id="diff-log-body"></tbody></table>
    <button class="btn btn-primary btn-sm" onclick="addDiffRow()" style="margin-top:8px">+ add investigation item</button>
  </div>
</div>

<div class="panel" id="tab5">
  <div class="card">
    <div class="sec-hdr">Period-end close checklist<span class="ref-tag" id="chk-progress-tag">0 / 0 complete</span></div>
    <div id="checklist-container"></div>
    <div id="checklist-summary" style="margin-top:10px"></div>
  </div>
</div>

<div class="panel" id="tab6">
  <div class="card">
    <div class="sec-hdr">Contract modification log<span class="ref-tag">ASC 606-10-25-10</span></div>
    <div style="overflow-x:auto"><table style="min-width:800px">
      <thead><tr><th>Contract #</th><th>Mod date</th><th>Description</th><th>Type</th><th style="text-align:right">TP change ($)</th><th>Treatment</th><th>Revenue impact</th><th>Approved by</th><th></th></tr></thead>
      <tbody id="mod-body"></tbody>
    </table></div>
    <button class="btn btn-primary btn-sm" onclick="addModRow()" style="margin-top:8px">+ log modification</button>
  </div>
  <div class="card">
    <div class="sec-hdr">Modification treatment guide</div>
    <table><thead><tr><th style="width:200px">Scenario</th><th>Treatment</th><th style="width:120px">Impact</th></tr></thead>
    <tbody>
      <tr><td style="font-weight:500;font-size:12px">Adds distinct goods at standalone price</td><td style="font-size:12px">New separate contract — no change to original</td><td><span class="badge badge-info">Prospective</span></td></tr>
      <tr><td style="font-weight:500;font-size:12px">Adds distinct goods NOT at standalone price</td><td style="font-size:12px">Terminate original; treat remaining as new contract</td><td><span class="badge badge-warn">Prospective</span></td></tr>
      <tr><td style="font-weight:500;font-size:12px">Does not add distinct goods</td><td style="font-size:12px">Modify existing; cumulative catch-up if single PO</td><td><span class="badge badge-err">Catch-up adj.</span></td></tr>
    </tbody></table>
  </div>
</div>
</div>

<script>
var fmt=function(n){return isNaN(n)||n===null?'$0.00':'$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})};
var f=function(id){return parseFloat(document.getElementById(id)&&document.getElementById(id).value)||0};
var currentTab=0;

function gT(i){
  document.querySelectorAll('.panel').forEach(function(p,j){p.classList.toggle('active',j===i)});
  document.querySelectorAll('.tab').forEach(function(t,j){t.classList.toggle('active',j===i)});
  currentTab=i;if(i===0)refreshDash();if(i===4)calcRecon();if(i===5)buildChecklist();updateProgress();
}
function updateProgress(){
  var checked=document.querySelectorAll('#checklist-container input[type=checkbox]:checked').length;
  var total=document.querySelectorAll('#checklist-container input[type=checkbox]').length||27;
  var pct=total>0?Math.round((checked/total)*100):0;
  document.getElementById('main-prog').style.width=pct+'%';
  var badge=document.getElementById('status-badge');
  if(pct===100){badge.textContent='Close complete';badge.style.background='#0F6E56';}
  else if(pct>60){badge.textContent='In progress';badge.style.background='#185FA5';}
  else{badge.textContent='Open';badge.style.background='#854F0B';}
}
function getSubRows(){
  var rows=[];
  document.querySelectorAll('#sub-body tr').forEach(function(tr){
    var inputs=tr.querySelectorAll('input,select');if(inputs.length<8)return;
    var tp=parseFloat(inputs[2].value)||0,prior=parseFloat(inputs[3].value)||0,cur=parseFloat(inputs[4].value)||0;
    rows.push({contract:inputs[0].value||'—',customer:inputs[1].value||'—',desc:inputs[5]?inputs[5].value||'—':'—',type:inputs[6]?inputs[6].value||'OT':'OT',tp:tp,prior:prior,cur:cur,def:Math.max(0,tp-prior-cur),acct:inputs[7]?inputs[7].value||'4000':'4000'});
  });return rows;
}
function calcSubTotals(){
  var rows=getSubRows(),tot=0;rows.forEach(function(r){tot+=r.cur;});
  document.getElementById('sub-period-total').textContent=fmt(tot);refreshDash();calcRecon();
}
function addSubRow(){
  var tb=document.getElementById('sub-body'),tr=document.createElement('tr');
  tr.innerHTML='<td><input placeholder="C-001" style="width:70px" oninput="calcSubTotals()"></td><td><input placeholder="Customer" style="width:110px" oninput="calcSubTotals()"></td><td><input type="number" placeholder="Alloc. TP" style="width:82px" oninput="calcSubTotals()"></td><td><input type="number" placeholder="Prior" style="width:72px" oninput="calcSubTotals()"></td><td><input type="number" placeholder="This period" style="width:72px" oninput="calcSubTotals()"></td><td><input placeholder="PO desc." style="width:112px" oninput="calcSubTotals()"></td><td><select style="width:60px" onchange="calcSubTotals()"><option>OT</option><option>PT</option></select></td><td><input placeholder="4000" style="width:60px"></td><td style="font-family:monospace;font-size:12px;text-align:right;color:#1F3864" class="def-cell">$0.00</td><td style="font-size:11px;text-align:center"><span class="badge badge-gray">pending</span></td><td><button class="btn btn-danger btn-sm" onclick="this.closest(\'tr\').remove();calcSubTotals()">x</button></td>';
  tb.appendChild(tr);
}
function addSampleData(){
  var samples=[['C-001','Acme Corp',48000,22000,2000,'SaaS platform','OT','4100'],['C-002','BuildCo',180000,90000,15000,'Construction mgmt','OT','4200'],['C-003','TechStart',12000,12000,0,'Software license','PT','4100'],['C-004','RetailCo',9600,4000,800,'PCS support','OT','4300'],['C-005','MedGroup',25000,0,25000,'Equipment delivery','PT','4200']];
  var tb=document.getElementById('sub-body');tb.innerHTML='';
  samples.forEach(function(s){
    var tr=document.createElement('tr'),def=Math.max(0,s[2]-s[3]-s[4]),status=s[4]>0?'<span class="badge badge-ok">active</span>':'<span class="badge badge-gray">pending</span>';
    if(s[3]>=s[2])status='<span class="badge badge-info">complete</span>';
    tr.innerHTML='<td><input value="'+s[0]+'" style="width:70px" oninput="calcSubTotals()"></td><td><input value="'+s[1]+'" style="width:110px" oninput="calcSubTotals()"></td><td><input type="number" value="'+s[2]+'" style="width:82px" oninput="calcSubTotals()"></td><td><input type="number" value="'+s[3]+'" style="width:72px" oninput="calcSubTotals()"></td><td><input type="number" value="'+s[4]+'" style="width:72px" oninput="calcSubTotals()"></td><td><input value="'+s[6]+'" style="width:112px" oninput="calcSubTotals()"></td><td><select style="width:60px" onchange="calcSubTotals()"><option'+(s[6]==='OT'?' selected':'')+'>OT</option><option'+(s[6]==='PT'?' selected':'')+'>PT</option></select></td><td><input value="'+s[7]+'" style="width:60px"></td><td style="font-family:monospace;font-size:12px;text-align:right;color:#1F3864">'+fmt(def)+'</td><td style="font-size:11px;text-align:center">'+status+'</td><td><button class="btn btn-danger btn-sm" onclick="this.closest(\'tr\').remove();calcSubTotals()">x</button></td>';
    tb.appendChild(tr);
  });
  calcSubTotals();buildJE1();buildJE2();
}
function refreshDash(){
  var rows=getSubRows(),totTP=0,totPrior=0,totCur=0,totDef=0;
  var tb=document.getElementById('dash-body');tb.innerHTML='';
  rows.forEach(function(r){
    totTP+=r.tp;totPrior+=r.prior;totCur+=r.cur;totDef+=r.def;
    var status=r.cur>0?'<span class="badge badge-ok">active</span>':'<span class="badge badge-gray">idle</span>';
    if(r.tp>0&&r.prior+r.cur>=r.tp)status='<span class="badge badge-info">complete</span>';
    var tr=document.createElement('tr');
    tr.innerHTML='<td style="font-weight:500;font-size:12px">'+r.contract+'</td><td style="font-size:12px">'+r.customer+'</td><td><span class="badge '+(r.type==='OT'?'badge-info':'badge-gray')+'">'+r.type+'</span></td><td style="text-align:right;font-family:monospace;font-size:12px">'+fmt(r.tp)+'</td><td style="text-align:right;font-family:monospace;font-size:12px">'+fmt(r.prior)+'</td><td style="text-align:right;font-family:monospace;font-size:12px;font-weight:500;color:#0C447C">'+fmt(r.cur)+'</td><td style="text-align:right;font-family:monospace;font-size:12px">'+fmt(r.def)+'</td><td>'+status+'</td>';
    tb.appendChild(tr);
  });
  document.getElementById('d-tp').textContent=fmt(totTP);document.getElementById('d-prior').textContent=fmt(totPrior);document.getElementById('d-cur').textContent=fmt(totCur);document.getElementById('d-def').textContent=fmt(totDef);
  var otRev=rows.filter(function(r){return r.type==='OT';}).reduce(function(s,r){return s+r.cur;},0);
  var ptRev=rows.filter(function(r){return r.type==='PT';}).reduce(function(s,r){return s+r.cur;},0);
  var otCt=rows.filter(function(r){return r.type==='OT';}).length,ptCt=rows.filter(function(r){return r.type==='PT';}).length;
  document.getElementById('m-rev').textContent=fmt(totCur);document.getElementById('m-ot').textContent=fmt(otRev);document.getElementById('m-ot-ct').textContent=otCt+' contracts';document.getElementById('m-pt').textContent=fmt(ptRev);document.getElementById('m-pt-ct').textContent=ptCt+' contracts';document.getElementById('m-def').textContent=fmt(totDef);
  var alerts='';
  if(rows.length===0)alerts+='<div class="alert alert-info">No contracts in subledger. Add contracts or load sample data.</div>';
  if(totDef>0)alerts+='<div class="alert alert-warn">'+fmt(totDef)+' deferred revenue requires release entries (JE-03).</div>';
  var over=rows.filter(function(r){return r.prior+r.cur>r.tp&&r.tp>0;});
  if(over.length>0)alerts+='<div class="alert alert-err">'+over.length+' contract(s) have revenue exceeding allocated TP.</div>';
  if(!alerts&&rows.length>0)alerts='<div class="alert alert-ok">All contracts within range. Run reconciliation before closing.</div>';
  document.getElementById('dash-alerts').innerHTML=alerts;
}
function buildJE1(){
  var rows=getSubRows().filter(function(r){return r.type==='OT'&&r.cur>0;});
  var tb=document.getElementById('je1-rows');tb.innerHTML='';var totDR=0,totCR=0;
  rows.forEach(function(r){totDR+=r.cur;totCR+=r.cur;tb.innerHTML+='<tr><td class="dr">Accounts receivable / unbilled revenue</td><td><input value="1200" style="width:70px"></td><td><input type="number" value="'+r.cur.toFixed(2)+'" style="width:100px" oninput="sumJE1()"></td><td style="color:#999">—</td><td style="font-size:11px;color:#666">'+r.contract+' (over time)</td></tr><tr><td class="cr">&nbsp;&nbsp;&nbsp;Revenue ('+r.acct+')</td><td><input value="'+r.acct+'" style="width:70px"></td><td style="color:#999">—</td><td><input type="number" value="'+r.cur.toFixed(2)+'" style="width:100px" oninput="sumJE1()"></td><td style="font-size:11px;color:#666">Revenue recognized</td></tr>';});
  if(rows.length===0)tb.innerHTML='<tr><td colspan="5" style="color:#999;font-size:12px;padding:10px 8px">No over-time POs with revenue this period.</td></tr>';
  document.getElementById('je1-totals').innerHTML='DR: '+fmt(totDR)+'&nbsp;&nbsp; CR: '+fmt(totCR);checkBal('je1-bal',totDR,totCR);
}
function sumJE1(){
  var dr=0,cr=0;
  document.querySelectorAll('#je1-rows tr:nth-child(odd) td:nth-child(3) input').forEach(function(i){dr+=parseFloat(i.value)||0;});
  document.querySelectorAll('#je1-rows tr:nth-child(even) td:nth-child(4) input').forEach(function(i){cr+=parseFloat(i.value)||0;});
  document.getElementById('je1-totals').innerHTML='DR: '+fmt(dr)+'&nbsp;&nbsp; CR: '+fmt(cr);checkBal('je1-bal',dr,cr);
}
function buildJE2(){
  var rows=getSubRows().filter(function(r){return r.type==='PT'&&r.cur>0;});
  var tb=document.getElementById('je2-rows');tb.innerHTML='';var totDR=0,totCR=0;
  rows.forEach(function(r){totDR+=r.cur;totCR+=r.cur;tb.innerHTML+='<tr><td class="dr">Accounts receivable</td><td><input value="1200" style="width:70px"></td><td><input type="number" value="'+r.cur.toFixed(2)+'" style="width:100px"></td><td style="color:#999">—</td><td style="font-size:11px;color:#666">'+r.contract+' (point in time)</td></tr><tr><td class="cr">&nbsp;&nbsp;&nbsp;Revenue ('+r.acct+')</td><td><input value="'+r.acct+'" style="width:70px"></td><td style="color:#999">—</td><td><input type="number" value="'+r.cur.toFixed(2)+'" style="width:100px"></td><td style="font-size:11px;color:#666">Control transferred</td></tr>';});
  if(rows.length===0)tb.innerHTML='<tr><td colspan="5" style="color:#999;font-size:12px;padding:10px 8px">No point-in-time POs with revenue this period.</td></tr>';
  document.getElementById('je2-totals').innerHTML='DR: '+fmt(totDR)+'&nbsp;&nbsp; CR: '+fmt(totCR);checkBal('je2-bal',totDR,totCR);
}
function calcJE3(){var dr=f('je3-dr'),cr=f('je3-cr');document.getElementById('je3-totals').innerHTML='DR: '+fmt(dr)+'&nbsp;&nbsp; CR: '+fmt(cr);checkBal('je3-bal',dr,cr);}
function calcJE4(){var dr=f('je4-dr'),cr=f('je4-cr');document.getElementById('je4-totals').innerHTML='DR: '+fmt(dr)+'&nbsp;&nbsp; CR: '+fmt(cr);checkBal('je4-bal',dr,cr);}
function calcJE5(){var gross=f('je5-gross'),months=f('je5-months'),mo=months>0?(gross/months):0;document.getElementById('je5-mo').value=mo.toFixed(2);document.getElementById('je5-dr').value=mo.toFixed(2);document.getElementById('je5-cr').value=mo.toFixed(2);calcJE5b();}
function calcJE5b(){var dr=f('je5-dr'),cr=f('je5-cr');document.getElementById('je5-totals').innerHTML='DR: '+fmt(dr)+'&nbsp;&nbsp; CR: '+fmt(cr);checkBal('je5-bal',dr,cr);}
function checkBal(elId,dr,cr){var el=document.getElementById(elId);if(dr===0&&cr===0){el.innerHTML='';return;}var diff=Math.abs(dr-cr);el.innerHTML=diff<0.005?'<div class="alert alert-ok" style="padding:5px 10px">Balanced — DR = CR</div>':'<div class="alert alert-err" style="padding:5px 10px">Out of balance by '+fmt(diff)+'</div>';}
function toggleJE(id){var el=document.getElementById(id);el.classList.toggle('open');if(el.classList.contains('open')){buildJE1();buildJE2();}}
function addAccrualRow(){
  var tb=document.getElementById('accrual-body'),tr=document.createElement('tr');
  tr.innerHTML='<td><input placeholder="C-001" style="width:90px"></td><td><input placeholder="Customer" style="width:90px"></td><td><input type="number" placeholder="0.00" step="0.01" style="width:90px" oninput="calcAccruals()"></td><td><input type="number" placeholder="0.00" step="0.01" style="width:90px" oninput="calcAccruals()"></td><td style="font-family:monospace;font-size:12px;font-weight:500;color:#0C447C;text-align:right" class="unbilled">$0.00</td><td><input type="date" style="width:120px"></td><td><input placeholder="Notes" style="width:100px"></td><td><button class="btn btn-danger btn-sm" onclick="this.closest(\'tr\').remove();calcAccruals()">x</button></td>';
  tb.appendChild(tr);
}
function calcAccruals(){
  var total=0;
  document.querySelectorAll('#accrual-body tr').forEach(function(tr){var inputs=tr.querySelectorAll('input[type=number]');if(inputs.length<2)return;var u=Math.max(0,(parseFloat(inputs[0].value)||0)-(parseFloat(inputs[1].value)||0));total+=u;var c=tr.querySelector('.unbilled');if(c)c.textContent=fmt(u);});
  document.getElementById('accrual-total').textContent=fmt(total);
}
function addDeferRow(){
  var tb=document.getElementById('defer-body'),tr=document.createElement('tr');
  tr.innerHTML='<td><input placeholder="C-001" style="width:90px"></td><td><input placeholder="Customer" style="width:90px"></td><td><input type="number" placeholder="0.00" step="0.01" style="width:80px" oninput="calcDefer()"></td><td><input type="number" placeholder="0.00" step="0.01" style="width:80px" oninput="calcDefer()"></td><td><input type="number" placeholder="0.00" step="0.01" style="width:80px" oninput="calcDefer()"></td><td style="font-family:monospace;font-size:12px;font-weight:500;color:#A32D2D;text-align:right" class="closing">$0.00</td><td><input placeholder="Notes" style="width:100px"></td><td><button class="btn btn-danger btn-sm" onclick="this.closest(\'tr\').remove();calcDefer()">x</button></td>';
  tb.appendChild(tr);
}
function calcDefer(){
  var total=0;
  document.querySelectorAll('#defer-body tr').forEach(function(tr){var inputs=tr.querySelectorAll('input[type=number]');if(inputs.length<3)return;var c=Math.max(0,(parseFloat(inputs[0].value)||0)+(parseFloat(inputs[1].value)||0)-(parseFloat(inputs[2].value)||0));total+=c;var el=tr.querySelector('.closing');if(el)el.textContent=fmt(c);});
  document.getElementById('defer-total').textContent=fmt(total);
}
function calcRecon(){
  var rows=getSubRows(),subRev=rows.reduce(function(s,r){return s+r.cur;},0),subDef=rows.reduce(function(s,r){return s+r.def;},0),accrualTotal=0;
  document.querySelectorAll('#accrual-body tr').forEach(function(tr){var inputs=tr.querySelectorAll('input[type=number]');if(inputs.length<2)return;accrualTotal+=Math.max(0,(parseFloat(inputs[0].value)||0)-(parseFloat(inputs[1].value)||0));});
  var glRev=f('gl-rev'),glDef=f('gl-def'),glAsset=f('gl-asset');
  var reconRows=[['Revenue — this period',subRev,glRev],['Deferred revenue balance',subDef,glDef],['Contract asset (unbilled)',accrualTotal,glAsset]];
  var tb=document.getElementById('recon-body');tb.innerHTML='';var allOk=true;
  reconRows.forEach(function(r){var diff=r[2]-r[1],ok=Math.abs(diff)<0.005;if(!ok)allOk=false;var tr=document.createElement('tr');tr.innerHTML='<td style="font-weight:500;font-size:12px">'+r[0]+'</td><td style="text-align:right;font-family:monospace;font-size:12px">'+fmt(r[1])+'</td><td style="text-align:right;font-family:monospace;font-size:12px">'+fmt(r[2])+'</td><td style="text-align:right;font-family:monospace;font-size:12px" class="'+(ok?'diff-ok':'diff-err')+'">'+fmt(Math.abs(diff))+'</td><td>'+(ok?'<span class="badge badge-ok">Balanced</span>':'<span class="badge badge-err">Difference</span>')+'</td>';tb.appendChild(tr);});
  var sum=document.getElementById('recon-summary');
  if(glRev===0&&glDef===0&&glAsset===0)sum.innerHTML='<div class="alert alert-info">Enter GL balances above to run the reconciliation.</div>';
  else if(allOk)sum.innerHTML='<div class="alert alert-ok">All items balanced. Clear to finalize close.</div>';
  else sum.innerHTML='<div class="alert alert-err">Differences exist. Investigate and resolve before closing.</div>';
}
function addDiffRow(){var tb=document.getElementById('diff-log-body'),tr=document.createElement('tr');tr.innerHTML='<td><input placeholder="Item" style="width:80px"></td><td><input type="number" placeholder="0.00" style="width:80px"></td><td><input placeholder="Root cause" style="width:120px"></td><td><input placeholder="Action" style="width:120px"></td><td><input placeholder="Owner" style="width:70px"></td><td><select style="width:90px"><option>Open</option><option>In progress</option><option>Resolved</option></select></td><td><button class="btn btn-danger btn-sm" onclick="this.closest(\'tr\').remove()">x</button></td>';tb.appendChild(tr);}
var CHECKLIST=[{section:'Pre-close preparation',items:['Confirm close period and cut-off dates','Ensure all invoices through period end are posted','Pull subledger — verify all active contracts listed','Confirm opening deferred/contract asset balances tie to prior period']},{section:'Accrual review — earned not billed',items:['Identify over-time POs with earned but uninvoiced revenue','Calculate unbilled revenue (earned minus invoiced)','Prepare contract asset accrual — JE-04','Confirm contract asset balances supported by contract terms']},{section:'Deferred revenue — release',items:['Identify all contract liabilities (advance payments)','Confirm amount earned this period per recognition schedule','Prepare deferred revenue release entry — JE-03','Verify closing deferred balance ties to future PO schedule']},{section:'Revenue recognition entries',items:['Post JE-01: over-time revenue entries','Post JE-02: point-in-time revenue entries','Verify all JEs balance (DR = CR)','Confirm entries reference supporting documentation']},{section:'Variable consideration reassessment',items:['Identify contracts with variable consideration','Reassess constraint based on current facts','Update TP and record catch-up if applicable','Document rationale for VC estimate changes']},{section:'Contract cost amortization',items:['Post JE-05: amortize capitalized contract costs','Verify capitalized contract cost asset balance','Check for impairment indicators']},{section:'Reconciliation & sign-off',items:['Run GL vs. subledger reconciliation','Investigate and resolve all differences','Confirm no PO has revenue exceeding allocated TP','Obtain reviewer sign-off on all JEs','Confirm disclosure requirements met']}];
function buildChecklist(){
  var el=document.getElementById('checklist-container');if(el.innerHTML!='')return;
  var html='',n=0;
  CHECKLIST.forEach(function(section){html+='<div class="chk-section-hdr">'+section.section+'</div><div class="chk-grid">';
    section.items.forEach(function(item){n++;html+='<div class="chk-item" id="chk-wrap-'+n+'"><input type="checkbox" id="chk-'+n+'" onchange="toggleChkItem('+n+')"><label for="chk-'+n+'">'+item+'</label></div>';});
    html+='</div>';});
  el.innerHTML=html;updateChkProgress();
}
function toggleChkItem(n){var cb=document.getElementById('chk-'+n);document.getElementById('chk-wrap-'+n).classList.toggle('done',cb.checked);updateChkProgress();updateProgress();}
function updateChkProgress(){var total=document.querySelectorAll('#checklist-container input[type=checkbox]').length,checked=document.querySelectorAll('#checklist-container input[type=checkbox]:checked').length,pct=total>0?Math.round(checked/total*100):0;document.getElementById('chk-progress-tag').textContent=checked+' / '+total+' complete';var sum=document.getElementById('checklist-summary');if(checked===total&&total>0)sum.innerHTML='<div class="alert alert-ok">All items complete. Ready for final sign-off.</div>';else if(pct>60)sum.innerHTML='<div class="alert alert-info">'+checked+' of '+total+' items complete ('+pct+'%).</div>';else sum.innerHTML='<div class="alert alert-warn">Close checklist is '+pct+'% complete.</div>';}
function addModRow(){var tb=document.getElementById('mod-body'),tr=document.createElement('tr');tr.innerHTML='<td><input placeholder="C-001" style="width:70px"></td><td><input type="date" style="width:120px"></td><td><input placeholder="Description" style="width:120px"></td><td><select style="width:100px"><option>Scope change</option><option>Price change</option><option>Both</option><option>Termination</option></select></td><td><input type="number" placeholder="0.00" style="width:80px"></td><td><select style="width:110px"><option>New contract</option><option>Prospective</option><option>Catch-up adj.</option></select></td><td><input placeholder="Impact" style="width:110px"></td><td><input placeholder="Approver" style="width:80px"></td><td><button class="btn btn-danger btn-sm" onclick="this.closest(\'tr\').remove()">x</button></td>';tb.appendChild(tr);}
buildChecklist();refreshDash();
</script>
</body>
</html>
```

---

## Notes for CC

- The HTML above uses vanilla JS and inline styles — the React components must be rewritten using TypeScript, typed interfaces, React hooks, and CSS modules
- Do not copy inline `onclick` handlers — convert to proper React event handlers
- Do not use `innerHTML` string manipulation — use React JSX and state arrays instead
- All `document.getElementById` DOM manipulation must be replaced with React state and refs
- The `fmt()` number formatting function should become a typed utility: `const fmt = (n: number): string => ...`
- The `CHECKLIST` constant array pattern is correct — keep it as a typed constant, not hardcoded JSX
- The sample data arrays should become typed constants of the appropriate interface type
- Remember: wrap both components in `BrowserOnly` from `@docusaurus/react-loadable` to prevent SSR issues
