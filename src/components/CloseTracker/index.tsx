import React, {useState, useMemo, useCallback} from 'react';
import styles from './closetracker.module.css';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface SubledgerRow {
  id: number;
  contractNum: string;
  customer: string;
  allocTP: string;
  priorRecog: string;
  thisPeriod: string;
  poDesc: string;
  type: 'OT' | 'PT';
  acctCode: string;
}

interface AccrualRow {
  id: number;
  contractPO: string;
  customer: string;
  earned: string;
  invoiced: string;
  invoiceDate: string;
  notes: string;
}

interface DeferralRow {
  id: number;
  contractPO: string;
  customer: string;
  opening: string;
  additions: string;
  released: string;
  notes: string;
}

interface DiffLogRow {
  id: number;
  item: string;
  difference: string;
  rootCause: string;
  action: string;
  owner: string;
  status: string;
}

interface ModRow {
  id: number;
  contractNum: string;
  modDate: string;
  description: string;
  type: string;
  tpChange: string;
  treatment: string;
  revenueImpact: string;
  approver: string;
}

interface ChecklistItem {
  label: string;
  checked: boolean;
}

interface JE5State {
  grossCost: string;
  months: string;
  dr: string;
  cr: string;
}

interface JE34State {
  dr: string;
  cr: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CHECKLIST_SECTIONS: {section: string; items: string[]}[] = [
  {section: 'Pre-close preparation', items: [
    'Confirm close period and cut-off dates',
    'Ensure all invoices through period end are posted',
    'Pull subledger — verify all active contracts listed',
    'Confirm opening deferred/contract asset balances tie to prior period',
  ]},
  {section: 'Accrual review — earned not billed', items: [
    'Identify over-time POs with earned but uninvoiced revenue',
    'Calculate unbilled revenue (earned minus invoiced)',
    'Prepare contract asset accrual — JE-04',
    'Confirm contract asset balances supported by contract terms',
  ]},
  {section: 'Deferred revenue — release', items: [
    'Identify all contract liabilities (advance payments)',
    'Confirm amount earned this period per recognition schedule',
    'Prepare deferred revenue release entry — JE-03',
    'Verify closing deferred balance ties to future PO schedule',
  ]},
  {section: 'Revenue recognition entries', items: [
    'Post JE-01: over-time revenue entries',
    'Post JE-02: point-in-time revenue entries',
    'Verify all JEs balance (DR = CR)',
    'Confirm entries reference supporting documentation',
  ]},
  {section: 'Variable consideration reassessment', items: [
    'Identify contracts with variable consideration',
    'Reassess constraint based on current facts',
    'Update TP and record catch-up if applicable',
    'Document rationale for VC estimate changes',
  ]},
  {section: 'Contract cost amortization', items: [
    'Post JE-05: amortize capitalized contract costs',
    'Verify capitalized contract cost asset balance',
    'Check for impairment indicators',
  ]},
  {section: 'Reconciliation & sign-off', items: [
    'Run GL vs. subledger reconciliation',
    'Investigate and resolve all differences',
    'Confirm no PO has revenue exceeding allocated TP',
    'Obtain reviewer sign-off on all JEs',
    'Confirm disclosure requirements met',
  ]},
];

const TABS = ['Dashboard', 'Contract subledger', 'Journal entries', 'Accruals & deferrals', 'Reconciliation', 'Period-end checklist', 'Mod log'];

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const SAMPLE_DATA: Omit<SubledgerRow,'id'>[] = [
  {contractNum:'C-001',customer:'Acme Corp',allocTP:'48000',priorRecog:'22000',thisPeriod:'2000',poDesc:'SaaS platform',type:'OT',acctCode:'4100'},
  {contractNum:'C-002',customer:'BuildCo',allocTP:'180000',priorRecog:'90000',thisPeriod:'15000',poDesc:'Construction mgmt',type:'OT',acctCode:'4200'},
  {contractNum:'C-003',customer:'TechStart',allocTP:'12000',priorRecog:'12000',thisPeriod:'0',poDesc:'Software license',type:'PT',acctCode:'4100'},
  {contractNum:'C-004',customer:'RetailCo',allocTP:'9600',priorRecog:'4000',thisPeriod:'800',poDesc:'PCS support',type:'OT',acctCode:'4300'},
  {contractNum:'C-005',customer:'MedGroup',allocTP:'25000',priorRecog:'0',thisPeriod:'25000',poDesc:'Equipment delivery',type:'PT',acctCode:'4200'},
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (isNaN(n) || n === null) return '$0.00';
  return '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function p(s: string): number {
  const v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

function initChecklist(): ChecklistItem[] {
  return CHECKLIST_SECTIONS.flatMap(s => s.items.map(label => ({label, checked: false})));
}

let nextId = 1;
function newId() { return nextId++; }

// ── Main component ────────────────────────────────────────────────────────────

export default function CloseTracker(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState(0);
  const [period, setPeriod] = useState('April 2025');
  const [subledger, setSubledger] = useState<SubledgerRow[]>([]);
  const [accruals, setAccruals] = useState<AccrualRow[]>([]);
  const [deferrals, setDeferrals] = useState<DeferralRow[]>([]);
  const [glRev, setGLRev] = useState('');
  const [glDef, setGLDef] = useState('');
  const [glAsset, setGLAsset] = useState('');
  const [diffLog, setDiffLog] = useState<DiffLogRow[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>(initChecklist);
  const [mods, setMods] = useState<ModRow[]>([]);
  const [openJEs, setOpenJEs] = useState<Set<string>>(new Set());
  const [je3, setJE3] = useState<JE34State>({dr:'',cr:''});
  const [je4, setJE4] = useState<JE34State>({dr:'',cr:''});
  const [je5, setJE5] = useState<JE5State>({grossCost:'',months:'',dr:'',cr:''});

  // ── Derived values ──────────────────────────────────────────────────────────

  const subTotals = useMemo(() => {
    let totTP=0, totPrior=0, totCur=0, totDef=0, otRev=0, ptRev=0, otCt=0, ptCt=0;
    subledger.forEach(r => {
      const tp=p(r.allocTP), prior=p(r.priorRecog), cur=p(r.thisPeriod);
      const def = Math.max(0, tp - prior - cur);
      totTP+=tp; totPrior+=prior; totCur+=cur; totDef+=def;
      if (r.type==='OT') { otRev+=cur; otCt++; } else { ptRev+=cur; ptCt++; }
    });
    return {totTP,totPrior,totCur,totDef,otRev,ptRev,otCt,ptCt};
  }, [subledger]);

  const accrualTotal = useMemo(() => {
    return accruals.reduce((sum, r) => sum + Math.max(0, p(r.earned) - p(r.invoiced)), 0);
  }, [accruals]);

  const deferralTotal = useMemo(() => {
    return deferrals.reduce((sum, r) => sum + Math.max(0, p(r.opening)+p(r.additions)-p(r.released)), 0);
  }, [deferrals]);

  const checklistProgress = useMemo(() => {
    const total = checklist.length;
    const checked = checklist.filter(c => c.checked).length;
    return {total, checked, pct: total > 0 ? Math.round(checked/total*100) : 0};
  }, [checklist]);

  const je5MonthlyAmt = useMemo(() => {
    const gross = p(je5.grossCost), months = p(je5.months);
    return months > 0 ? gross / months : 0;
  }, [je5.grossCost, je5.months]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const addSubRow = useCallback(() => {
    setSubledger(prev => [...prev, {id:newId(),contractNum:'',customer:'',allocTP:'',priorRecog:'',thisPeriod:'',poDesc:'',type:'OT',acctCode:'4000'}]);
  }, []);

  const updateSub = useCallback((id: number, field: keyof SubledgerRow, val: string) => {
    setSubledger(prev => prev.map(r => r.id===id ? {...r,[field]:val} : r));
  }, []);

  const removeSub = useCallback((id: number) => {
    setSubledger(prev => prev.filter(r => r.id !== id));
  }, []);

  const loadSample = useCallback(() => {
    setSubledger(SAMPLE_DATA.map(r => ({...r, id:newId()})));
  }, []);

  const addAccrual = useCallback(() => {
    setAccruals(prev => [...prev, {id:newId(),contractPO:'',customer:'',earned:'',invoiced:'',invoiceDate:'',notes:''}]);
  }, []);

  const removeAccrual = useCallback((id: number) => {
    setAccruals(prev => prev.filter(r => r.id!==id));
  }, []);

  const addDeferral = useCallback(() => {
    setDeferrals(prev => [...prev, {id:newId(),contractPO:'',customer:'',opening:'',additions:'',released:'',notes:''}]);
  }, []);

  const removeDeferral = useCallback((id: number) => {
    setDeferrals(prev => prev.filter(r => r.id!==id));
  }, []);

  const addDiffRow = useCallback(() => {
    setDiffLog(prev => [...prev, {id:newId(),item:'',difference:'',rootCause:'',action:'',owner:'',status:'Open'}]);
  }, []);

  const removeDiff = useCallback((id: number) => {
    setDiffLog(prev => prev.filter(r => r.id!==id));
  }, []);

  const addMod = useCallback(() => {
    setMods(prev => [...prev, {id:newId(),contractNum:'',modDate:'',description:'',type:'Scope change',tpChange:'',treatment:'New contract',revenueImpact:'',approver:''}]);
  }, []);

  const removeMod = useCallback((id: number) => {
    setMods(prev => prev.filter(r => r.id!==id));
  }, []);

  const toggleJE = useCallback((key: string) => {
    setOpenJEs(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const toggleCheck = useCallback((idx: number) => {
    setChecklist(prev => prev.map((c,i) => i===idx ? {...c,checked:!c.checked} : c));
  }, []);

  // JE balance helpers
  function balIndicator(drVal: number, crVal: number) {
    if (drVal === 0 && crVal === 0) return null;
    const diff = Math.abs(drVal - crVal);
    if (diff < 0.005) return <div className={styles.alertOk} style={{padding:'5px 10px'}}>Balanced — DR = CR</div>;
    return <div className={styles.alertErr} style={{padding:'5px 10px'}}>Out of balance by {fmt(diff)}</div>;
  }

  // Status badge
  const statusLabel = checklistProgress.pct === 100 ? 'Close complete' : checklistProgress.pct > 60 ? 'In progress' : 'Open';
  const statusStyle = checklistProgress.pct === 100 ? {background:'#0F6E56'} : checklistProgress.pct > 60 ? {background:'#185FA5'} : {background:'#854F0B'};

  return (
    <div className={styles.app}>
      {/* Banner */}
      <div className={styles.banner}>
        <div className={styles.bannerLeft}>
          <h2 className={styles.bannerTitle}>Month-end revenue close tracker</h2>
          <p className={styles.bannerSub}>Accrual basis · ASC 606 · Subledger, journal entries, reconciliation & checklist</p>
        </div>
        <div className={styles.bannerRight}>
          <select className={styles.periodSel} value={period} onChange={e => setPeriod(e.target.value)}>
            {MONTHS.map(m => <option key={m}>{m} 2025</option>)}
          </select>
          <span className={styles.statusBadge} style={statusStyle}>{statusLabel}</span>
        </div>
      </div>

      {/* Progress */}
      <div className={styles.progressWrap}>
        <div className={styles.progressBar} style={{width:`${checklistProgress.pct}%`}} />
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((label, i) => (
          <button key={i} className={`${styles.tab} ${activeTab===i ? styles.tabActive : ''}`} onClick={() => setActiveTab(i)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Dashboard ── */}
      {activeTab === 0 && (
        <div>
          <div className={styles.metricGrid}>
            <Metric label="Revenue this period" value={fmt(subTotals.totCur)} sub="Accrual basis" />
            <Metric label="Over-time revenue" value={fmt(subTotals.otRev)} sub={`${subTotals.otCt} contracts`} />
            <Metric label="Point-in-time revenue" value={fmt(subTotals.ptRev)} sub={`${subTotals.ptCt} contracts`} />
            <Metric label="Deferred balance" value={fmt(subTotals.totDef)} sub="Contract liability" />
          </div>
          <div className={styles.card}>
            <div className={styles.secHdr}>Revenue by contract — current period <span className={styles.refTag}>subledger summary</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>Contract</th><th>Customer</th><th>Type</th><th className={styles.ra}>Alloc. TP</th><th className={styles.ra}>Prior recog.</th><th className={styles.ra}>This period</th><th className={styles.ra}>Deferred</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {subledger.length === 0 && (
                    <tr><td colSpan={8} style={{padding:'12px',textAlign:'center',color:'#999'}}>No contracts. Add data in the Contract subledger tab.</td></tr>
                  )}
                  {subledger.map(r => {
                    const tp=p(r.allocTP),prior=p(r.priorRecog),cur=p(r.thisPeriod),def=Math.max(0,tp-prior-cur);
                    const complete = tp>0 && prior+cur>=tp;
                    const active = cur > 0 && !complete;
                    const statusBadge = complete ? <span className={styles.badgeInfo}>complete</span> : active ? <span className={styles.badgeOk}>active</span> : <span className={styles.badgeGray}>idle</span>;
                    return (
                      <tr key={r.id}>
                        <td className={styles.bold}>{r.contractNum||'—'}</td>
                        <td>{r.customer||'—'}</td>
                        <td><span className={r.type==='OT'?styles.badgeInfo:styles.badgeGray}>{r.type}</span></td>
                        <td className={`${styles.mono} ${styles.ra}`}>{fmt(tp)}</td>
                        <td className={`${styles.mono} ${styles.ra}`}>{fmt(prior)}</td>
                        <td className={`${styles.mono} ${styles.ra} ${styles.accentBlue}`}>{fmt(cur)}</td>
                        <td className={`${styles.mono} ${styles.ra}`}>{fmt(def)}</td>
                        <td>{statusBadge}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className={styles.tfootRow}>
                    <td colSpan={3} className={styles.totalFootLabel}>Total</td>
                    <td className={`${styles.mono} ${styles.ra} ${styles.primaryColor}`}>{fmt(subTotals.totTP)}</td>
                    <td className={`${styles.mono} ${styles.ra} ${styles.primaryColor}`}>{fmt(subTotals.totPrior)}</td>
                    <td className={`${styles.mono} ${styles.ra} ${styles.primaryColor}`}>{fmt(subTotals.totCur)}</td>
                    <td className={`${styles.mono} ${styles.ra} ${styles.primaryColor}`}>{fmt(subTotals.totDef)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          {/* Alerts */}
          {subledger.length === 0 && <div className={styles.alertInfo}>No contracts in subledger. Add contracts or load sample data.</div>}
          {subTotals.totDef > 0 && <div className={styles.alertWarn}>{fmt(subTotals.totDef)} deferred revenue requires release entries (JE-03).</div>}
          {subledger.some(r => p(r.priorRecog)+p(r.thisPeriod) > p(r.allocTP) && p(r.allocTP) > 0) && (
            <div className={styles.alertErr}>One or more contracts have revenue exceeding allocated TP.</div>
          )}
          {subledger.length > 0 && subTotals.totDef === 0 && !subledger.some(r => p(r.priorRecog)+p(r.thisPeriod) > p(r.allocTP) && p(r.allocTP) > 0) && (
            <div className={styles.alertOk}>All contracts within range. Run reconciliation before closing.</div>
          )}
        </div>
      )}

      {/* ── Tab 1: Contract subledger ── */}
      {activeTab === 1 && (
        <div>
          <div className={styles.card}>
            <div className={styles.secHdr}>Contract revenue subledger <span className={styles.refTag}>one row per performance obligation</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table} style={{minWidth:'900px',tableLayout:'fixed'}}>
                <thead>
                  <tr>
                    <th style={{width:'80px'}}>Contract #</th>
                    <th style={{width:'110px'}}>Customer</th>
                    <th style={{width:'90px'}}>Alloc. TP ($)</th>
                    <th style={{width:'80px'}}>Prior recog. ($)</th>
                    <th style={{width:'80px'}}>This period ($)</th>
                    <th style={{width:'110px'}}>PO description</th>
                    <th style={{width:'60px'}}>Type</th>
                    <th style={{width:'70px'}}>Acct code</th>
                    <th style={{width:'90px'}}>Deferred bal.</th>
                    <th style={{width:'70px'}}>Status</th>
                    <th style={{width:'50px'}}></th>
                  </tr>
                </thead>
                <tbody>
                  {subledger.map(r => {
                    const def = Math.max(0, p(r.allocTP)-p(r.priorRecog)-p(r.thisPeriod));
                    const complete = p(r.allocTP)>0 && p(r.priorRecog)+p(r.thisPeriod)>=p(r.allocTP);
                    const active = p(r.thisPeriod)>0 && !complete;
                    const statusEl = complete ? <span className={styles.badgeInfo}>complete</span> : active ? <span className={styles.badgeOk}>active</span> : <span className={styles.badgeGray}>pending</span>;
                    return (
                      <tr key={r.id}>
                        <td><input className={styles.inputSm} value={r.contractNum} onChange={e=>updateSub(r.id,'contractNum',e.target.value)} placeholder="C-001" /></td>
                        <td><input className={styles.inputSm} value={r.customer} onChange={e=>updateSub(r.id,'customer',e.target.value)} placeholder="Customer" /></td>
                        <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={r.allocTP} onChange={e=>updateSub(r.id,'allocTP',e.target.value)} placeholder="0.00" /></td>
                        <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={r.priorRecog} onChange={e=>updateSub(r.id,'priorRecog',e.target.value)} placeholder="0.00" /></td>
                        <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={r.thisPeriod} onChange={e=>updateSub(r.id,'thisPeriod',e.target.value)} placeholder="0.00" /></td>
                        <td><input className={styles.inputSm} value={r.poDesc} onChange={e=>updateSub(r.id,'poDesc',e.target.value)} placeholder="PO desc." /></td>
                        <td>
                          <select className={styles.inputSm} value={r.type} onChange={e=>updateSub(r.id,'type',e.target.value as 'OT'|'PT')}>
                            <option>OT</option><option>PT</option>
                          </select>
                        </td>
                        <td><input className={styles.inputSm} value={r.acctCode} onChange={e=>updateSub(r.id,'acctCode',e.target.value)} placeholder="4000" /></td>
                        <td className={`${styles.mono} ${styles.ra} ${styles.primaryColor}`}>{fmt(def)}</td>
                        <td>{statusEl}</td>
                        <td><button className={styles.btnDanger} onClick={()=>removeSub(r.id)}>×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{display:'flex',gap:'8px',marginTop:'8px',flexWrap:'wrap'}}>
              <button className={styles.btnPrimary} onClick={addSubRow}>+ add contract / PO</button>
              <button className={styles.btn} onClick={loadSample}>Load sample data</button>
            </div>
          </div>
          <div className={styles.totalBar}>
            <span className={styles.totalLbl}>Total revenue recognized — this period</span>
            <span className={styles.totalVal}>{fmt(subTotals.totCur)}</span>
          </div>
        </div>
      )}

      {/* ── Tab 2: Journal entries ── */}
      {activeTab === 2 && (
        <div>
          <div className={styles.card}>
            <div className={styles.secHdr}>Journal entry templates — revenue recognition (accrual basis) <span className={styles.refTag}>auto-populated from subledger</span></div>
            <p className={styles.hint}>JE-01 and JE-02 auto-populate from the subledger. All entries validate DR = CR.</p>
          </div>

          {/* JE-01 */}
          <JECard id="je1" label="JE-01" title="Revenue recognition — over-time" badgeClass={styles.badgeInfo} open={openJEs.has('je1')} onToggle={() => toggleJE('je1')}>
            <p className={styles.hint}>Over-time POs from subledger. Debit A/R or unbilled revenue; credit revenue.</p>
            {(() => {
              const otRows = subledger.filter(r => r.type==='OT' && p(r.thisPeriod)>0);
              const totDR = otRows.reduce((s,r) => s+p(r.thisPeriod), 0);
              return (
                <>
                  <table className={styles.table}>
                    <thead><tr><th>Account</th><th style={{width:'80px'}}>Acct code</th><th style={{width:'120px'}}>Debit ($)</th><th style={{width:'120px'}}>Credit ($)</th><th>Description</th></tr></thead>
                    <tbody>
                      {otRows.length === 0 && <tr><td colSpan={5} style={{color:'#999',padding:'10px'}}>No over-time POs with revenue this period.</td></tr>}
                      {otRows.map(r => (
                        <React.Fragment key={r.id}>
                          <tr><td className={styles.dr}>Accounts receivable / unbilled revenue</td><td><input className={styles.inputSm} defaultValue="1200" style={{width:'70px'}} /></td><td><input className={`${styles.inputSm} ${styles.mono}`} defaultValue={p(r.thisPeriod).toFixed(2)} style={{width:'100px'}} /></td><td style={{color:'#999'}}>—</td><td className={styles.hint}>{r.contractNum} (over time)</td></tr>
                          <tr><td className={styles.cr}>&nbsp;&nbsp;&nbsp;Revenue ({r.acctCode})</td><td><input className={styles.inputSm} defaultValue={r.acctCode} style={{width:'70px'}} /></td><td style={{color:'#999'}}>—</td><td><input className={`${styles.inputSm} ${styles.mono}`} defaultValue={p(r.thisPeriod).toFixed(2)} style={{width:'100px'}} /></td><td className={styles.hint}>Revenue recognized</td></tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  <div className={styles.jeTotal}>DR: {fmt(totDR)} &nbsp;&nbsp; CR: {fmt(totDR)}</div>
                  {balIndicator(totDR, totDR)}
                </>
              );
            })()}
          </JECard>

          {/* JE-02 */}
          <JECard id="je2" label="JE-02" title="Revenue recognition — point-in-time" badgeClass={styles.badgeInfo} open={openJEs.has('je2')} onToggle={() => toggleJE('je2')}>
            <p className={styles.hint}>Point-in-time POs from subledger. Debit A/R; credit revenue on control transfer.</p>
            {(() => {
              const ptRows = subledger.filter(r => r.type==='PT' && p(r.thisPeriod)>0);
              const totDR = ptRows.reduce((s,r) => s+p(r.thisPeriod), 0);
              return (
                <>
                  <table className={styles.table}>
                    <thead><tr><th>Account</th><th style={{width:'80px'}}>Acct code</th><th style={{width:'120px'}}>Debit ($)</th><th style={{width:'120px'}}>Credit ($)</th><th>Description</th></tr></thead>
                    <tbody>
                      {ptRows.length === 0 && <tr><td colSpan={5} style={{color:'#999',padding:'10px'}}>No point-in-time POs with revenue this period.</td></tr>}
                      {ptRows.map(r => (
                        <React.Fragment key={r.id}>
                          <tr><td className={styles.dr}>Accounts receivable</td><td><input className={styles.inputSm} defaultValue="1200" style={{width:'70px'}} /></td><td><input className={`${styles.inputSm} ${styles.mono}`} defaultValue={p(r.thisPeriod).toFixed(2)} style={{width:'100px'}} /></td><td style={{color:'#999'}}>—</td><td className={styles.hint}>{r.contractNum} (point in time)</td></tr>
                          <tr><td className={styles.cr}>&nbsp;&nbsp;&nbsp;Revenue ({r.acctCode})</td><td><input className={styles.inputSm} defaultValue={r.acctCode} style={{width:'70px'}} /></td><td style={{color:'#999'}}>—</td><td><input className={`${styles.inputSm} ${styles.mono}`} defaultValue={p(r.thisPeriod).toFixed(2)} style={{width:'100px'}} /></td><td className={styles.hint}>Control transferred</td></tr>
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  <div className={styles.jeTotal}>DR: {fmt(totDR)} &nbsp;&nbsp; CR: {fmt(totDR)}</div>
                  {balIndicator(totDR, totDR)}
                </>
              );
            })()}
          </JECard>

          {/* JE-03 */}
          <JECard id="je3" label="JE-03" title="Deferred revenue release" badgeClass={styles.badgeWarn} open={openJEs.has('je3')} onToggle={() => toggleJE('je3')}>
            <p className={styles.hint}>Release contract liability to revenue as POs are satisfied.</p>
            <table className={styles.table}>
              <thead><tr><th>Account</th><th style={{width:'80px'}}>Acct code</th><th style={{width:'120px'}}>Debit ($)</th><th style={{width:'120px'}}>Credit ($)</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td className={styles.dr}>Deferred revenue (liability)</td><td><input className={styles.inputSm} defaultValue="2150" style={{width:'70px'}} /></td><td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={je3.dr} onChange={e=>setJE3(v=>({...v,dr:e.target.value}))} placeholder="0.00" style={{width:'100px'}} /></td><td style={{color:'#999'}}>—</td><td className={styles.hint}>Release of contract liability earned this period</td></tr>
                <tr><td className={styles.cr}>&nbsp;&nbsp;&nbsp;Revenue</td><td><input className={styles.inputSm} defaultValue="4000" style={{width:'70px'}} /></td><td style={{color:'#999'}}>—</td><td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={je3.cr} onChange={e=>setJE3(v=>({...v,cr:e.target.value}))} placeholder="0.00" style={{width:'100px'}} /></td><td className={styles.hint}>Revenue recognized from prior period advance</td></tr>
              </tbody>
            </table>
            <div className={styles.jeTotal}>DR: {fmt(p(je3.dr))} &nbsp;&nbsp; CR: {fmt(p(je3.cr))}</div>
            {balIndicator(p(je3.dr), p(je3.cr))}
          </JECard>

          {/* JE-04 */}
          <JECard id="je4" label="JE-04" title="Unbilled revenue accrual — contract asset" badgeClass={styles.badgeWarn} open={openJEs.has('je4')} onToggle={() => toggleJE('je4')}>
            <p className={styles.hint}>Accrue revenue earned but not yet invoiced. Accrual basis — recognize when earned, not when billed.</p>
            <table className={styles.table}>
              <thead><tr><th>Account</th><th style={{width:'80px'}}>Acct code</th><th style={{width:'120px'}}>Debit ($)</th><th style={{width:'120px'}}>Credit ($)</th><th>Description</th></tr></thead>
              <tbody>
                <tr><td className={styles.dr}>Contract asset — unbilled revenue</td><td><input className={styles.inputSm} defaultValue="1210" style={{width:'70px'}} /></td><td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={je4.dr} onChange={e=>setJE4(v=>({...v,dr:e.target.value}))} placeholder="0.00" style={{width:'100px'}} /></td><td style={{color:'#999'}}>—</td><td className={styles.hint}>Revenue earned; invoice not yet issued</td></tr>
                <tr><td className={styles.cr}>&nbsp;&nbsp;&nbsp;Revenue</td><td><input className={styles.inputSm} defaultValue="4000" style={{width:'70px'}} /></td><td style={{color:'#999'}}>—</td><td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={je4.cr} onChange={e=>setJE4(v=>({...v,cr:e.target.value}))} placeholder="0.00" style={{width:'100px'}} /></td><td className={styles.hint}>Revenue accrued — earned not billed</td></tr>
              </tbody>
            </table>
            <div className={styles.jeTotal}>DR: {fmt(p(je4.dr))} &nbsp;&nbsp; CR: {fmt(p(je4.cr))}</div>
            {balIndicator(p(je4.dr), p(je4.cr))}
          </JECard>

          {/* JE-05 */}
          <JECard id="je5" label="JE-05" title="Contract cost amortization (ASC 340-40)" badgeClass={styles.badgeGray} open={openJEs.has('je5')} onToggle={() => toggleJE('je5')}>
            <p className={styles.hint}>Amortize capitalized contract costs. Enter gross cost and months — monthly amount auto-calculates.</p>
            <div className={styles.fg3} style={{marginBottom:'10px'}}>
              <Field label="Gross cap. cost ($)"><input className={`${styles.input} ${styles.mono}`} type="number" value={je5.grossCost} onChange={e=>setJE5(v=>({...v,grossCost:e.target.value}))} placeholder="0.00" /></Field>
              <Field label="Amort. period (months)"><input className={`${styles.input} ${styles.mono}`} type="number" value={je5.months} onChange={e=>setJE5(v=>({...v,months:e.target.value}))} placeholder="24" min={1} /></Field>
              <Field label="Monthly amort. ($)"><input className={`${styles.input} ${styles.mono}`} readOnly value={je5MonthlyAmt > 0 ? je5MonthlyAmt.toFixed(2) : ''} placeholder="auto" style={{background:'#f5f5f5'}} /></Field>
            </div>
            <table className={styles.table}>
              <thead><tr><th>Account</th><th style={{width:'80px'}}>Acct code</th><th style={{width:'120px'}}>Debit ($)</th><th style={{width:'120px'}}>Credit ($)</th><th>Description</th></tr></thead>
              <tbody>
                <tr>
                  <td className={styles.dr}>Contract cost amortization expense</td>
                  <td><input className={styles.inputSm} defaultValue="7210" style={{width:'70px'}} /></td>
                  <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={je5.dr || (je5MonthlyAmt > 0 ? je5MonthlyAmt.toFixed(2) : '')} onChange={e=>setJE5(v=>({...v,dr:e.target.value}))} placeholder="0.00" style={{width:'100px'}} /></td>
                  <td style={{color:'#999'}}>—</td>
                  <td className={styles.hint}>Monthly amortization of capitalized contract cost</td>
                </tr>
                <tr>
                  <td className={styles.cr}>&nbsp;&nbsp;&nbsp;Capitalized contract costs (asset)</td>
                  <td><input className={styles.inputSm} defaultValue="1610" style={{width:'70px'}} /></td>
                  <td style={{color:'#999'}}>—</td>
                  <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={je5.cr || (je5MonthlyAmt > 0 ? je5MonthlyAmt.toFixed(2) : '')} onChange={e=>setJE5(v=>({...v,cr:e.target.value}))} placeholder="0.00" style={{width:'100px'}} /></td>
                  <td className={styles.hint}>Reduce capitalized asset by monthly amort.</td>
                </tr>
              </tbody>
            </table>
            {(() => {
              const drVal = p(je5.dr) || je5MonthlyAmt;
              const crVal = p(je5.cr) || je5MonthlyAmt;
              return (
                <>
                  <div className={styles.jeTotal}>DR: {fmt(drVal)} &nbsp;&nbsp; CR: {fmt(crVal)}</div>
                  {balIndicator(drVal, crVal)}
                </>
              );
            })()}
          </JECard>
        </div>
      )}

      {/* ── Tab 3: Accruals & deferrals ── */}
      {activeTab === 3 && (
        <div>
          {/* Accruals */}
          <div className={styles.card}>
            <div className={styles.secHdr}>Accrued revenue — earned not yet billed <span className={styles.refTag}>contract assets</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table} style={{minWidth:'700px'}}>
                <thead><tr><th>Contract / PO</th><th>Customer</th><th className={styles.ra}>Earned ($)</th><th className={styles.ra}>Invoiced ($)</th><th className={styles.ra}>Unbilled ($)</th><th>Invoice date</th><th>Notes</th><th></th></tr></thead>
                <tbody>
                  {accruals.map(r => {
                    const unbilled = Math.max(0, p(r.earned)-p(r.invoiced));
                    return (
                      <tr key={r.id}>
                        <td><input className={styles.inputSm} value={r.contractPO} onChange={e=>setAccruals(prev=>prev.map(x=>x.id===r.id?{...x,contractPO:e.target.value}:x))} placeholder="C-001" style={{width:'90px'}} /></td>
                        <td><input className={styles.inputSm} value={r.customer} onChange={e=>setAccruals(prev=>prev.map(x=>x.id===r.id?{...x,customer:e.target.value}:x))} placeholder="Customer" style={{width:'90px'}} /></td>
                        <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={r.earned} onChange={e=>setAccruals(prev=>prev.map(x=>x.id===r.id?{...x,earned:e.target.value}:x))} placeholder="0.00" style={{width:'90px'}} /></td>
                        <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={r.invoiced} onChange={e=>setAccruals(prev=>prev.map(x=>x.id===r.id?{...x,invoiced:e.target.value}:x))} placeholder="0.00" style={{width:'90px'}} /></td>
                        <td className={`${styles.mono} ${styles.ra} ${styles.accentBlue}`}>{fmt(unbilled)}</td>
                        <td><input className={styles.inputSm} type="date" value={r.invoiceDate} onChange={e=>setAccruals(prev=>prev.map(x=>x.id===r.id?{...x,invoiceDate:e.target.value}:x))} style={{width:'120px'}} /></td>
                        <td><input className={styles.inputSm} value={r.notes} onChange={e=>setAccruals(prev=>prev.map(x=>x.id===r.id?{...x,notes:e.target.value}:x))} placeholder="Notes" style={{width:'100px'}} /></td>
                        <td><button className={styles.btnDanger} onClick={()=>removeAccrual(r.id)}>×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button className={styles.btnPrimary} style={{marginTop:'8px'}} onClick={addAccrual}>+ add accrual</button>
            <div className={styles.totalBar} style={{marginTop:'8px'}}>
              <span className={styles.totalLbl}>Total unbilled contract assets</span>
              <span className={styles.totalVal}>{fmt(accrualTotal)}</span>
            </div>
          </div>

          {/* Deferrals */}
          <div className={styles.card}>
            <div className={styles.secHdr}>Deferred revenue — billed not yet earned <span className={styles.refTag}>contract liabilities</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table} style={{minWidth:'700px'}}>
                <thead><tr><th>Contract / PO</th><th>Customer</th><th className={styles.ra}>Opening ($)</th><th className={styles.ra}>Additions ($)</th><th className={styles.ra}>Released ($)</th><th className={styles.ra}>Closing ($)</th><th>Notes</th><th></th></tr></thead>
                <tbody>
                  {deferrals.map(r => {
                    const closing = Math.max(0, p(r.opening)+p(r.additions)-p(r.released));
                    return (
                      <tr key={r.id}>
                        <td><input className={styles.inputSm} value={r.contractPO} onChange={e=>setDeferrals(prev=>prev.map(x=>x.id===r.id?{...x,contractPO:e.target.value}:x))} placeholder="C-001" style={{width:'90px'}} /></td>
                        <td><input className={styles.inputSm} value={r.customer} onChange={e=>setDeferrals(prev=>prev.map(x=>x.id===r.id?{...x,customer:e.target.value}:x))} placeholder="Customer" style={{width:'90px'}} /></td>
                        <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={r.opening} onChange={e=>setDeferrals(prev=>prev.map(x=>x.id===r.id?{...x,opening:e.target.value}:x))} placeholder="0.00" style={{width:'80px'}} /></td>
                        <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={r.additions} onChange={e=>setDeferrals(prev=>prev.map(x=>x.id===r.id?{...x,additions:e.target.value}:x))} placeholder="0.00" style={{width:'80px'}} /></td>
                        <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={r.released} onChange={e=>setDeferrals(prev=>prev.map(x=>x.id===r.id?{...x,released:e.target.value}:x))} placeholder="0.00" style={{width:'80px'}} /></td>
                        <td className={`${styles.mono} ${styles.ra}`} style={{color:'#A32D2D'}}>{fmt(closing)}</td>
                        <td><input className={styles.inputSm} value={r.notes} onChange={e=>setDeferrals(prev=>prev.map(x=>x.id===r.id?{...x,notes:e.target.value}:x))} placeholder="Notes" style={{width:'100px'}} /></td>
                        <td><button className={styles.btnDanger} onClick={()=>removeDeferral(r.id)}>×</button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <button className={styles.btnPrimary} style={{marginTop:'8px'}} onClick={addDeferral}>+ add deferred item</button>
            <div className={styles.totalBar} style={{marginTop:'8px'}}>
              <span className={styles.totalLbl}>Total deferred revenue — period end</span>
              <span className={styles.totalVal}>{fmt(deferralTotal)}</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab 4: Reconciliation ── */}
      {activeTab === 4 && (
        <div>
          <div className={styles.card}>
            <div className={styles.secHdr}>Revenue reconciliation — GL vs. subledger <span className={styles.refTag}>must balance before close</span></div>
            <p className={styles.hint}>Enter GL balances from your accounting system. Differences must be investigated.</p>
            <div className={styles.fg3}>
              <Field label="GL revenue balance ($)"><input className={`${styles.input} ${styles.mono}`} type="number" value={glRev} onChange={e=>setGLRev(e.target.value)} placeholder="0.00" /></Field>
              <Field label="GL deferred revenue ($)"><input className={`${styles.input} ${styles.mono}`} type="number" value={glDef} onChange={e=>setGLDef(e.target.value)} placeholder="0.00" /></Field>
              <Field label="GL contract asset ($)"><input className={`${styles.input} ${styles.mono}`} type="number" value={glAsset} onChange={e=>setGLAsset(e.target.value)} placeholder="0.00" /></Field>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.secHdr}>Reconciliation output</div>
            {(() => {
              const reconRows = [
                ['Revenue — this period', subTotals.totCur, p(glRev)],
                ['Deferred revenue balance', subTotals.totDef, p(glDef)],
                ['Contract asset (unbilled)', accrualTotal, p(glAsset)],
              ] as [string,number,number][];
              const hasGL = p(glRev)>0||p(glDef)>0||p(glAsset)>0;
              const allOk = reconRows.every(r => Math.abs(r[2]-r[1]) < 0.005);
              return (
                <>
                  <table className={styles.table}>
                    <thead><tr><th>Item</th><th className={styles.ra}>Subledger ($)</th><th className={styles.ra}>GL ($)</th><th className={styles.ra}>Difference ($)</th><th>Status</th></tr></thead>
                    <tbody>
                      {reconRows.map(([label,sub,gl]) => {
                        const diff = Math.abs(gl-sub);
                        const ok = diff < 0.005;
                        return (
                          <tr key={label}>
                            <td className={styles.bold}>{label}</td>
                            <td className={`${styles.mono} ${styles.ra}`}>{fmt(sub)}</td>
                            <td className={`${styles.mono} ${styles.ra}`}>{fmt(gl)}</td>
                            <td className={`${styles.mono} ${styles.ra} ${ok?styles.diffOk:styles.diffErr}`}>{fmt(diff)}</td>
                            <td>{ok ? <span className={styles.badgeOk}>Balanced</span> : <span className={styles.badgeErr}>Difference</span>}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{marginTop:'10px'}}>
                    {!hasGL && <div className={styles.alertInfo}>Enter GL balances above to run the reconciliation.</div>}
                    {hasGL && allOk && <div className={styles.alertOk}>All items balanced. Clear to finalize close.</div>}
                    {hasGL && !allOk && <div className={styles.alertErr}>Differences exist. Investigate and resolve before closing.</div>}
                  </div>
                </>
              );
            })()}
          </div>
          {/* Diff log */}
          <div className={styles.card}>
            <div className={styles.secHdr}>Difference investigation log</div>
            <div className={styles.tableWrap}>
              <table className={styles.table} style={{minWidth:'600px'}}>
                <thead><tr><th>Item</th><th>Difference ($)</th><th>Root cause</th><th>Action</th><th>Owner</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {diffLog.map(r => (
                    <tr key={r.id}>
                      <td><input className={styles.inputSm} value={r.item} onChange={e=>setDiffLog(prev=>prev.map(x=>x.id===r.id?{...x,item:e.target.value}:x))} placeholder="Item" style={{width:'80px'}} /></td>
                      <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={r.difference} onChange={e=>setDiffLog(prev=>prev.map(x=>x.id===r.id?{...x,difference:e.target.value}:x))} placeholder="0.00" style={{width:'80px'}} /></td>
                      <td><input className={styles.inputSm} value={r.rootCause} onChange={e=>setDiffLog(prev=>prev.map(x=>x.id===r.id?{...x,rootCause:e.target.value}:x))} placeholder="Root cause" style={{width:'120px'}} /></td>
                      <td><input className={styles.inputSm} value={r.action} onChange={e=>setDiffLog(prev=>prev.map(x=>x.id===r.id?{...x,action:e.target.value}:x))} placeholder="Action" style={{width:'120px'}} /></td>
                      <td><input className={styles.inputSm} value={r.owner} onChange={e=>setDiffLog(prev=>prev.map(x=>x.id===r.id?{...x,owner:e.target.value}:x))} placeholder="Owner" style={{width:'70px'}} /></td>
                      <td>
                        <select className={styles.inputSm} value={r.status} onChange={e=>setDiffLog(prev=>prev.map(x=>x.id===r.id?{...x,status:e.target.value}:x))} style={{width:'100px'}}>
                          <option>Open</option><option>In progress</option><option>Resolved</option>
                        </select>
                      </td>
                      <td><button className={styles.btnDanger} onClick={()=>removeDiff(r.id)}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className={styles.btnPrimary} style={{marginTop:'8px'}} onClick={addDiffRow}>+ add investigation item</button>
          </div>
        </div>
      )}

      {/* ── Tab 5: Period-end checklist ── */}
      {activeTab === 5 && (
        <div className={styles.card}>
          <div className={styles.secHdr}>
            Period-end close checklist
            <span className={styles.refTag}>{checklistProgress.checked} / {checklistProgress.total} complete</span>
          </div>
          {(() => {
            let itemIdx = 0;
            return CHECKLIST_SECTIONS.map(section => (
              <div key={section.section}>
                <div className={styles.chkSectionHdr}>{section.section}</div>
                <div className={styles.chkGrid}>
                  {section.items.map(item => {
                    const idx = itemIdx++;
                    return (
                      <label key={idx} className={`${styles.chkItem} ${checklist[idx]?.checked ? styles.chkChecked : ''}`}>
                        <input type="checkbox" checked={checklist[idx]?.checked ?? false} onChange={() => toggleCheck(idx)} />
                        {item}
                      </label>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
          <div style={{marginTop:'10px'}}>
            {checklistProgress.checked === checklistProgress.total && checklistProgress.total > 0 && (
              <div className={styles.alertOk}>All items complete. Ready for final sign-off.</div>
            )}
            {checklistProgress.pct > 60 && checklistProgress.pct < 100 && (
              <div className={styles.alertInfo}>{checklistProgress.checked} of {checklistProgress.total} items complete ({checklistProgress.pct}%).</div>
            )}
            {checklistProgress.pct <= 60 && (
              <div className={styles.alertWarn}>Close checklist is {checklistProgress.pct}% complete.</div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab 6: Modification log ── */}
      {activeTab === 6 && (
        <div>
          <div className={styles.card}>
            <div className={styles.secHdr}>Contract modification log <span className={styles.refTag}>ASC 606-10-25-10</span></div>
            <div className={styles.tableWrap}>
              <table className={styles.table} style={{minWidth:'800px'}}>
                <thead><tr><th>Contract #</th><th>Mod date</th><th>Description</th><th>Type</th><th className={styles.ra}>TP change ($)</th><th>Treatment</th><th>Revenue impact</th><th>Approved by</th><th></th></tr></thead>
                <tbody>
                  {mods.map(r => (
                    <tr key={r.id}>
                      <td><input className={styles.inputSm} value={r.contractNum} onChange={e=>setMods(prev=>prev.map(x=>x.id===r.id?{...x,contractNum:e.target.value}:x))} placeholder="C-001" style={{width:'70px'}} /></td>
                      <td><input className={styles.inputSm} type="date" value={r.modDate} onChange={e=>setMods(prev=>prev.map(x=>x.id===r.id?{...x,modDate:e.target.value}:x))} style={{width:'120px'}} /></td>
                      <td><input className={styles.inputSm} value={r.description} onChange={e=>setMods(prev=>prev.map(x=>x.id===r.id?{...x,description:e.target.value}:x))} placeholder="Description" style={{width:'120px'}} /></td>
                      <td>
                        <select className={styles.inputSm} value={r.type} onChange={e=>setMods(prev=>prev.map(x=>x.id===r.id?{...x,type:e.target.value}:x))} style={{width:'100px'}}>
                          <option>Scope change</option><option>Price change</option><option>Both</option><option>Termination</option>
                        </select>
                      </td>
                      <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={r.tpChange} onChange={e=>setMods(prev=>prev.map(x=>x.id===r.id?{...x,tpChange:e.target.value}:x))} placeholder="0.00" style={{width:'80px'}} /></td>
                      <td>
                        <select className={styles.inputSm} value={r.treatment} onChange={e=>setMods(prev=>prev.map(x=>x.id===r.id?{...x,treatment:e.target.value}:x))} style={{width:'110px'}}>
                          <option>New contract</option><option>Prospective</option><option>Catch-up adj.</option>
                        </select>
                      </td>
                      <td><input className={styles.inputSm} value={r.revenueImpact} onChange={e=>setMods(prev=>prev.map(x=>x.id===r.id?{...x,revenueImpact:e.target.value}:x))} placeholder="Impact" style={{width:'110px'}} /></td>
                      <td><input className={styles.inputSm} value={r.approver} onChange={e=>setMods(prev=>prev.map(x=>x.id===r.id?{...x,approver:e.target.value}:x))} placeholder="Approver" style={{width:'80px'}} /></td>
                      <td><button className={styles.btnDanger} onClick={()=>removeMod(r.id)}>×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className={styles.btnPrimary} style={{marginTop:'8px'}} onClick={addMod}>+ log modification</button>
          </div>
          {/* Treatment guide */}
          <div className={styles.card}>
            <div className={styles.secHdr}>Modification treatment guide</div>
            <table className={styles.table}>
              <thead><tr><th style={{width:'220px'}}>Scenario</th><th>Treatment</th><th style={{width:'120px'}}>Impact</th></tr></thead>
              <tbody>
                <tr><td className={styles.bold}>Adds distinct goods at standalone price</td><td className={styles.hint}>New separate contract — no change to original</td><td><span className={styles.badgeInfo}>Prospective</span></td></tr>
                <tr><td className={styles.bold}>Adds distinct goods NOT at standalone price</td><td className={styles.hint}>Terminate original; treat remaining as new contract</td><td><span className={styles.badgeWarn}>Prospective</span></td></tr>
                <tr><td className={styles.bold}>Does not add distinct goods</td><td className={styles.hint}>Modify existing; cumulative catch-up if single PO</td><td><span className={styles.badgeErr}>Catch-up adj.</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Metric({label, value, sub}: {label: string; value: string; sub: string}) {
  return (
    <div style={{background:'#f5f5f5',borderRadius:'8px',padding:'10px 12px'}}>
      <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>{label}</div>
      <div style={{fontSize:'20px',fontWeight:500,fontFamily:'monospace'}}>{value}</div>
      <div style={{fontSize:'10px',color:'#999',marginTop:'2px'}}>{sub}</div>
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div>
      <label style={{display:'block',fontSize:'11px',fontWeight:500,color:'#666',marginBottom:'3px',textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</label>
      {children}
    </div>
  );
}

function JECard({id, label, title, badgeClass, open, onToggle, children}: {
  id: string; label: string; title: string; badgeClass: string;
  open: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div style={{background:'#fff',border:'1px solid #e0e0e0',borderRadius:'10px',marginBottom:'12px',overflow:'hidden'}}>
      <div style={{padding:'10px 12px',background:'#f5f5f5',display:'flex',alignItems:'center',justifyContent:'space-between',cursor:'pointer'}} onClick={onToggle}>
        <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
          <span className={badgeClass}>{label}</span>
          <strong style={{fontSize:'13px'}}>{title}</strong>
        </div>
        <span style={{fontSize:'11px',color:'#666'}}>{open ? 'collapse ▲' : 'expand ▼'}</span>
      </div>
      {open && <div style={{padding:'10px 12px'}}>{children}</div>}
    </div>
  );
}
