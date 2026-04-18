import React, {useState, useCallback, useMemo} from 'react';
import styles from './worksheet.module.css';

// ── Interfaces ────────────────────────────────────────────────────────────────

interface ContractInfo {
  contractNum: string;
  contractDate: string;
  entity: string;
  preparedBy: string;
  customer: string;
  customerType: string;
  startDate: string;
  endDate: string;
  industry: string;
  reviewDate: string;
  description: string;
}

interface CriterionResponse {
  value: 'yes' | 'no' | 'na' | '';
  evidence: string;
}

interface PerformanceObligation {
  id: number;
  description: string;
  capable: 'yes' | 'no' | '';
  withinContract: 'yes' | 'no' | '';
  timing: 'ot' | 'pt' | '';
}

interface TransactionPrice {
  base: string;
  hasVC: boolean;
  vcMethod: 'ev' | 'mla';
  vcGross: string;
  vcConstraint: 'none' | 'partial' | 'full';
  vcIncluded: string;
  hasFinancing: 'no' | 'yes' | 'expedient';
  financingAdj: string;
  nonCash: string;
  considerationPayable: string;
}

interface AllocationRow {
  poId: number;
  sspMethod: string;
  ssp: string;
}

interface RecognitionRow {
  poId: number;
  method: string;
  p1: string;
  p2: string;
  p3: string;
  p4: string;
}

interface ContractCost {
  obtainTreatment: string;
  obtainAmt: string;
  obtainMonths: string;
  fulfillTreatment: string;
  fulfillAmt: string;
  fulfillMonths: string;
}

interface SignOffRow {
  role: string;
  name: string;
  date: string;
  notes: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CRITERIA = [
  {id: 'cr_a', label: '(a) Approval & commitment', q: "All parties approved and committed to perform?"},
  {id: 'cr_b', label: '(b) Rights identified', q: "Each party's rights re: goods/services identified?"},
  {id: 'cr_c', label: '(c) Payment terms', q: "Payment terms for the goods/services identified?"},
  {id: 'cr_d', label: '(d) Commercial substance', q: "Risk, timing, or cash flows expected to change?"},
  {id: 'cr_e', label: '(e) Collectibility', q: "Probable to collect substantially all consideration?"},
];

const SPECIAL_CHECKS = [
  'Bill-and-hold — all 4 criteria met?',
  'Consignment — revenue deferred to end-customer sale?',
  'Right of return — liability and asset recorded?',
  'Repurchase agreement — sale vs. financing reviewed?',
  'Warranty — assurance-type (ASC 460) vs. service-type PO?',
  'License — right-to-access (OT) vs. right-to-use (PT)?',
  'Variable consideration reassessed at reporting date?',
  'Remaining PO disclosure required or expedient elected?',
];

const DISC_ITEMS = [
  'Revenue disaggregation prepared',
  'Contract asset/liability balances disclosed',
  'Remaining PO disclosure prepared (or expedient elected)',
  'Significant judgments documented',
  'Variable consideration constraint documented',
  'Capitalized contract cost disclosures prepared',
  'Changes in estimates disclosed',
  'Practical expedients elected noted in disclosures',
];

const SIGNOFF_ROLES = ['Preparer', 'Reviewer', 'Manager / Controller', 'CFO (if material)'];

const TABS = [
  'Contract info',
  'Step 1 — Contract',
  'Step 2 — Obligations',
  'Step 3 — Price',
  'Step 4 — Allocate',
  'Step 5 — Recognize',
  'Costs & disclosures',
  'Summary & sign-off',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (isNaN(n)) return '$0.00';
  return '$' + n.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function pct(n: number): string {
  if (isNaN(n)) return '0.0%';
  return n.toFixed(1) + '%';
}

function parseNum(s: string): number {
  const v = parseFloat(s);
  return isNaN(v) ? 0 : v;
}

function initContract(): ContractInfo {
  return {contractNum:'',contractDate:'',entity:'',preparedBy:'',customer:'',customerType:'',startDate:'',endDate:'',industry:'',reviewDate:'',description:''};
}

function initCriteria(): Record<string, CriterionResponse> {
  const r: Record<string, CriterionResponse> = {};
  CRITERIA.forEach(c => { r[c.id] = {value: '', evidence: ''}; });
  return r;
}

function initTP(): TransactionPrice {
  return {base:'',hasVC:false,vcMethod:'ev',vcGross:'',vcConstraint:'none',vcIncluded:'',hasFinancing:'no',financingAdj:'',nonCash:'',considerationPayable:''};
}

function initCosts(): ContractCost {
  return {obtainTreatment:'Capitalize',obtainAmt:'',obtainMonths:'',fulfillTreatment:'Capitalize',fulfillAmt:'',fulfillMonths:''};
}

function initSignOff(): SignOffRow[] {
  return SIGNOFF_ROLES.map(role => ({role, name:'', date:'', notes:''}));
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Worksheet(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState(0);

  // State
  const [contractInfo, setContractInfo] = useState<ContractInfo>(initContract);
  const [criteria, setCriteria] = useState<Record<string, CriterionResponse>>(initCriteria);
  const [contractForm, setContractForm] = useState('');
  const [contractMod, setContractMod] = useState('');
  const [contractCombo, setContractCombo] = useState('');
  const [modNotes, setModNotes] = useState('');
  const [pos, setPOs] = useState<PerformanceObligation[]>([
    {id: 1, description:'', capable:'', withinContract:'', timing:''},
    {id: 2, description:'', capable:'', withinContract:'', timing:''},
    {id: 3, description:'', capable:'', withinContract:'', timing:''},
  ]);
  const [series, setSeries] = useState('No');
  const [principalAgent, setPrincipalAgent] = useState('Not required');
  const [poNotes, setPONotes] = useState('');
  const [tp, setTP] = useState<TransactionPrice>(initTP);
  const [allocation, setAllocation] = useState<Record<number, AllocationRow>>({});
  const [recognition, setRecognition] = useState<Record<number, RecognitionRow>>({});
  const [specialChecks, setSpecialChecks] = useState<boolean[]>(SPECIAL_CHECKS.map(() => false));
  const [costs, setCosts] = useState<ContractCost>(initCosts);
  const [discChecks, setDiscChecks] = useState<boolean[]>(DISC_ITEMS.map(() => false));
  const [signOff, setSignOff] = useState<SignOffRow[]>(initSignOff);

  // Derived: valid POs (isPO = capable yes AND withinContract yes)
  const validPOs = useMemo(
    () => pos.filter(p => p.capable === 'yes' && p.withinContract === 'yes'),
    [pos]
  );

  // Derived: transaction price total
  const tpTotal = useMemo(() => {
    const base = parseNum(tp.base);
    let vc = 0;
    if (tp.hasVC) {
      if (tp.vcConstraint === 'none') vc = parseNum(tp.vcGross);
      else if (tp.vcConstraint === 'partial') vc = parseNum(tp.vcIncluded);
    }
    const sfc = tp.hasFinancing === 'yes' ? parseNum(tp.financingAdj) : 0;
    const ncc = parseNum(tp.nonCash);
    const cpc = parseNum(tp.considerationPayable);
    return Math.max(0, base + vc + sfc + ncc - cpc);
  }, [tp]);

  // Derived: allocation calculations
  const allocCalc = useMemo(() => {
    let totalSSP = 0;
    validPOs.forEach(po => {
      const row = allocation[po.id];
      totalSSP += row ? parseNum(row.ssp) : 0;
    });
    const rows = validPOs.map(po => {
      const row = allocation[po.id];
      const ssp = row ? parseNum(row.ssp) : 0;
      const p = totalSSP > 0 ? ssp / totalSSP : 0;
      return {poId: po.id, ssp, pct: p * 100, allocTP: tpTotal * p};
    });
    return {rows, totalSSP, totalAllocTP: tpTotal};
  }, [validPOs, allocation, tpTotal]);

  // Handlers
  const handleCriterion = useCallback((id: string, field: 'value' | 'evidence', val: string) => {
    setCriteria(prev => ({...prev, [id]: {...prev[id], [field]: val as CriterionResponse['value']}}));
  }, []);

  const addPO = useCallback(() => {
    setPOs(prev => {
      const nextId = prev.length > 0 ? Math.max(...prev.map(p => p.id)) + 1 : 1;
      return [...prev, {id: nextId, description:'', capable:'', withinContract:'', timing:''}];
    });
  }, []);

  const updatePO = useCallback((id: number, field: keyof PerformanceObligation, val: string) => {
    setPOs(prev => prev.map(p => p.id === id ? {...p, [field]: val} : p));
  }, []);

  const updateAlloc = useCallback((poId: number, field: keyof AllocationRow, val: string) => {
    setAllocation(prev => ({
      ...prev,
      [poId]: {...(prev[poId] ?? {poId, sspMethod:'Market', ssp:''}), [field]: val},
    }));
  }, []);

  const updateRecog = useCallback((poId: number, field: keyof RecognitionRow, val: string) => {
    setRecognition(prev => ({
      ...prev,
      [poId]: {...(prev[poId] ?? {poId, method:'', p1:'', p2:'', p3:'', p4:''}), [field]: val},
    }));
  }, []);

  const loadSample = useCallback(() => {
    setContractInfo({contractNum:'C-2024-001',contractDate:'2024-01-15',entity:'TechCo Inc.',preparedBy:'J. Smith',customer:'Acme Corporation',customerType:'B2B',startDate:'2024-02-01',endDate:'2026-01-31',industry:'Software / SaaS',reviewDate:'2024-07-31',description:'24-month SaaS platform license + onboarding services. Monthly fee $8,000 + one-time onboarding $25,000.'});
    setCriteria({cr_a:{value:'yes',evidence:'Signed MSA dated 2024-01-15'},cr_b:{value:'yes',evidence:'SOW identifies SaaS access and onboarding'},cr_c:{value:'yes',evidence:'Monthly invoicing schedule attached'},cr_d:{value:'yes',evidence:'SaaS delivery changes entity cash flows'},cr_e:{value:'yes',evidence:'Acme is creditworthy; A+ credit rating'}});
    setPOs([
      {id:1,description:'SaaS platform access (24 months)',capable:'yes',withinContract:'yes',timing:'ot'},
      {id:2,description:'Onboarding & data migration',capable:'yes',withinContract:'yes',timing:'pt'},
      {id:3,description:'',capable:'',withinContract:'',timing:''},
    ]);
    setTP({base:'217000',hasVC:false,vcMethod:'ev',vcGross:'',vcConstraint:'none',vcIncluded:'',hasFinancing:'no',financingAdj:'',nonCash:'',considerationPayable:''});
    setAllocation({1:{poId:1,sspMethod:'Market',ssp:'195000'},2:{poId:2,sspMethod:'Cost + margin',ssp:'30000'}});
    setRecognition({1:{poId:1,method:'Ratable over 24 months',p1:'47319',p2:'47319',p3:'47319',p4:'47319'},2:{poId:2,method:'Completion of onboarding',p1:'28061',p2:'0',p3:'0',p4:'0'}});
  }, []);

  // Step 1 pass/fail
  const criteriaAllMet = useMemo(() => {
    return CRITERIA.every(c => criteria[c.id]?.value === 'yes' || criteria[c.id]?.value === 'na');
  }, [criteria]);
  const criteriaAnswered = useMemo(() => {
    return CRITERIA.some(c => criteria[c.id]?.value !== '');
  }, [criteria]);

  const progress = Math.round((activeTab / (TABS.length - 1)) * 100);

  return (
    <div className={styles.app}>
      <div className={styles.banner}>
        <h2 className={styles.bannerTitle}>ASC 606 revenue recognition worksheet</h2>
        <p className={styles.bannerSub}>Complete one worksheet per contract at inception — fields auto-calculate as you fill them in</p>
      </div>

      {/* Progress bar */}
      <div className={styles.progressWrap}>
        <div className={styles.progressBar} style={{width: `${progress}%`}} />
      </div>

      {/* Tab nav */}
      <div className={styles.tabs}>
        {TABS.map((label, i) => (
          <button
            key={i}
            className={`${styles.tab} ${activeTab === i ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab 0: Contract info ── */}
      {activeTab === 0 && (
        <div className={styles.panel}>
          <div className={styles.card}>
            <div className={styles.secHdr}>Contract identification</div>
            <div className={`${styles.fieldGrid} ${styles.fg4}`}>
              <Field label="Contract #"><input className={styles.input} value={contractInfo.contractNum} onChange={e => setContractInfo(p => ({...p,contractNum:e.target.value}))} placeholder="C-2024-001" /></Field>
              <Field label="Contract date"><input className={styles.input} type="date" value={contractInfo.contractDate} onChange={e => setContractInfo(p => ({...p,contractDate:e.target.value}))} /></Field>
              <Field label="Entity / division"><input className={styles.input} value={contractInfo.entity} onChange={e => setContractInfo(p => ({...p,entity:e.target.value}))} placeholder="Legal entity name" /></Field>
              <Field label="Prepared by"><input className={styles.input} value={contractInfo.preparedBy} onChange={e => setContractInfo(p => ({...p,preparedBy:e.target.value}))} placeholder="Your name" /></Field>
            </div>
            <div className={`${styles.fieldGrid} ${styles.fg4}`}>
              <Field label="Customer name"><input className={styles.input} value={contractInfo.customer} onChange={e => setContractInfo(p => ({...p,customer:e.target.value}))} placeholder="Customer legal name" /></Field>
              <Field label="Customer type">
                <select className={styles.input} value={contractInfo.customerType} onChange={e => setContractInfo(p => ({...p,customerType:e.target.value}))}>
                  <option>— select —</option><option>B2B</option><option>B2C</option><option>Government</option><option>Non-profit</option>
                </select>
              </Field>
              <Field label="Contract start"><input className={styles.input} type="date" value={contractInfo.startDate} onChange={e => setContractInfo(p => ({...p,startDate:e.target.value}))} /></Field>
              <Field label="Contract end"><input className={styles.input} type="date" value={contractInfo.endDate} onChange={e => setContractInfo(p => ({...p,endDate:e.target.value}))} /></Field>
            </div>
            <div className={`${styles.fieldGrid} ${styles.fg2}`}>
              <Field label="Industry / sector">
                <select className={styles.input} value={contractInfo.industry} onChange={e => setContractInfo(p => ({...p,industry:e.target.value}))}>
                  <option>— select —</option><option>Software / SaaS</option><option>Construction / engineering</option><option>Manufacturing</option><option>Professional services</option><option>Healthcare</option><option>Retail / consumer</option><option>Financial services</option><option>Media / entertainment</option><option>Other</option>
                </select>
              </Field>
              <Field label="Next reassessment date"><input className={styles.input} type="date" value={contractInfo.reviewDate} onChange={e => setContractInfo(p => ({...p,reviewDate:e.target.value}))} /></Field>
            </div>
            <Field label="Contract description">
              <textarea className={styles.input} rows={3} value={contractInfo.description} onChange={e => setContractInfo(p => ({...p,description:e.target.value}))} placeholder="Briefly describe the goods or services promised in this contract" />
            </Field>
          </div>
          <NavRow onNext={() => setActiveTab(1)} />
        </div>
      )}

      {/* ── Tab 1: Step 1 ── */}
      {activeTab === 1 && (
        <div className={styles.panel}>
          <div className={styles.card}>
            <div className={styles.secHdr}>Step 1 — identify the contract <span className={styles.diffTag}>ASC 606-10-25-1</span></div>
            <p className={styles.hint}>All five criteria must be met before you can account for this as a revenue contract.</p>
            <div className={styles.tableWrap}>
              <table className={styles.criteriaTable}>
                <thead>
                  <tr><th style={{width:'26%'}}>Criterion</th><th style={{width:'34%'}}>Question</th><th style={{width:'20%'}}>Response</th><th>Evidence / notes</th></tr>
                </thead>
                <tbody>
                  {CRITERIA.map(c => (
                    <tr key={c.id}>
                      <td className={styles.bold}>{c.label}</td>
                      <td className={styles.hint}>{c.q}</td>
                      <td>
                        <div className={styles.radioGroup}>
                          {(['yes','no','na'] as const).map(v => (
                            <label key={v} className={styles.radioLabel}>
                              <input type="radio" name={c.id} value={v} checked={criteria[c.id]?.value === v} onChange={() => handleCriterion(c.id, 'value', v)} /> {v === 'na' ? 'N/A' : v.charAt(0).toUpperCase() + v.slice(1)}
                            </label>
                          ))}
                        </div>
                      </td>
                      <td><input className={styles.inputSm} placeholder="Evidence" value={criteria[c.id]?.evidence ?? ''} onChange={e => handleCriterion(c.id, 'evidence', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {criteriaAnswered && (
              <div className={criteriaAllMet ? styles.alertOk : styles.alertWarn}>
                {criteriaAllMet
                  ? 'All five criteria met — proceed with revenue recognition.'
                  : 'One or more criteria not met. Do not recognize revenue. Record consideration received as a liability.'}
              </div>
            )}
            <div className={`${styles.fieldGrid} ${styles.fg3}`} style={{marginTop:'12px'}}>
              <Field label="Contract form">
                <select className={styles.input} value={contractForm} onChange={e => setContractForm(e.target.value)}>
                  <option>— select —</option><option>Written</option><option>Oral</option><option>Implied by practice</option>
                </select>
              </Field>
              <Field label="Contract modifications?">
                <select className={styles.input} value={contractMod} onChange={e => setContractMod(e.target.value)}>
                  <option>— select —</option><option>None</option><option>Yes — new contract</option><option>Yes — modification of existing</option>
                </select>
              </Field>
              <Field label="Contract combinations?">
                <select className={styles.input} value={contractCombo} onChange={e => setContractCombo(e.target.value)}>
                  <option>— select —</option><option>No</option><option>Yes — combined</option>
                </select>
              </Field>
            </div>
            <Field label="Notes">
              <textarea className={styles.input} rows={2} value={modNotes} onChange={e => setModNotes(e.target.value)} placeholder="Document any modifications, combinations, or unmet criteria" />
            </Field>
          </div>
          <NavRow onBack={() => setActiveTab(0)} onNext={() => setActiveTab(2)} />
        </div>
      )}

      {/* ── Tab 2: Step 2 ── */}
      {activeTab === 2 && (
        <div className={styles.panel}>
          <div className={styles.card}>
            <div className={styles.secHdr}>Step 2 — identify performance obligations <span className={styles.diffTag}>ASC 606-10-25-14</span></div>
            <p className={styles.hint}>A good/service is distinct if it is <em>capable of being distinct</em> AND <em>distinct within the contract</em>.</p>
            <div className={styles.tableWrap}>
              <table className={styles.poTable}>
                <thead>
                  <tr>
                    <th style={{width:'28px'}}>#</th>
                    <th>Description</th>
                    <th style={{width:'90px'}}>Capable?</th>
                    <th style={{width:'90px'}}>Distinct in contract?</th>
                    <th style={{width:'70px'}}>PO?</th>
                    <th style={{width:'110px'}}>Timing</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po, idx) => {
                    const isPO = po.capable === 'yes' && po.withinContract === 'yes';
                    const isUndecided = po.capable === '' || po.withinContract === '';
                    return (
                      <tr key={po.id}>
                        <td className={styles.centerCell}>{idx + 1}</td>
                        <td><input className={styles.inputSm} value={po.description} onChange={e => updatePO(po.id, 'description', e.target.value)} placeholder="Description" /></td>
                        <td>
                          <select className={styles.inputSm} value={po.capable} onChange={e => updatePO(po.id, 'capable', e.target.value)}>
                            <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
                          </select>
                        </td>
                        <td>
                          <select className={styles.inputSm} value={po.withinContract} onChange={e => updatePO(po.id, 'withinContract', e.target.value)}>
                            <option value="">—</option><option value="yes">Yes</option><option value="no">No</option>
                          </select>
                        </td>
                        <td className={styles.centerCell}>
                          {isUndecided ? <span className={styles.badgeGray}>—</span>
                            : isPO ? <span className={styles.badgeOk}>Yes</span>
                            : <span className={styles.badgeErr}>No</span>}
                        </td>
                        <td>
                          <select className={styles.inputSm} value={po.timing} onChange={e => updatePO(po.id, 'timing', e.target.value)}>
                            <option value="">— select —</option><option value="ot">Over time</option><option value="pt">Point in time</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={styles.btnRow}>
              <button className={styles.btn} onClick={addPO}>+ add obligation</button>
              <button className={styles.btnPrimary} onClick={loadSample}>Load sample data</button>
            </div>
            {validPOs.length > 0 && (
              <div className={styles.totalBar}>
                <span className={styles.totalLbl}>Performance obligations identified</span>
                <span className={styles.totalVal}>{validPOs.length}</span>
              </div>
            )}
            <div className={`${styles.fieldGrid} ${styles.fg2}`} style={{marginTop:'12px'}}>
              <Field label="Series provision?">
                <select className={styles.input} value={series} onChange={e => setSeries(e.target.value)}>
                  <option>No</option><option>Yes — single PO</option>
                </select>
              </Field>
              <Field label="Principal / agent?">
                <select className={styles.input} value={principalAgent} onChange={e => setPrincipalAgent(e.target.value)}>
                  <option>Not required</option><option>Principal (gross)</option><option>Agent (net)</option>
                </select>
              </Field>
            </div>
            <Field label="Bundling notes">
              <textarea className={styles.input} rows={2} value={poNotes} onChange={e => setPONotes(e.target.value)} placeholder="Explain any bundled goods/services" />
            </Field>
          </div>
          <NavRow onBack={() => setActiveTab(1)} onNext={() => setActiveTab(3)} />
        </div>
      )}

      {/* ── Tab 3: Step 3 ── */}
      {activeTab === 3 && (
        <div className={styles.panel}>
          <div className={styles.card}>
            <div className={styles.secHdr}>Step 3 — determine the transaction price <span className={styles.diffTag}>ASC 606-10-32-2</span></div>
            <VCRow label="Base contract price ($)">
              <input className={`${styles.input} ${styles.mono}`} type="number" style={{maxWidth:'200px'}} value={tp.base} onChange={e => setTP(p => ({...p,base:e.target.value}))} placeholder="0.00" min={0} step="0.01" />
            </VCRow>
            <VCRow label="Variable consideration?">
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}><input type="radio" checked={!tp.hasVC} onChange={() => setTP(p => ({...p,hasVC:false}))} /> None</label>
                <label className={styles.radioLabel}><input type="radio" checked={tp.hasVC} onChange={() => setTP(p => ({...p,hasVC:true}))} /> Yes</label>
              </div>
            </VCRow>
            {tp.hasVC && (
              <>
                <VCRow label="Estimation method">
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}><input type="radio" checked={tp.vcMethod==='ev'} onChange={() => setTP(p => ({...p,vcMethod:'ev'}))} /> Expected value</label>
                    <label className={styles.radioLabel}><input type="radio" checked={tp.vcMethod==='mla'} onChange={() => setTP(p => ({...p,vcMethod:'mla'}))} /> Most likely amount</label>
                  </div>
                </VCRow>
                <VCRow label="Estimated VC ($)">
                  <input className={`${styles.input} ${styles.mono}`} type="number" style={{maxWidth:'200px'}} value={tp.vcGross} onChange={e => setTP(p => ({...p,vcGross:e.target.value}))} placeholder="0.00" min={0} step="0.01" />
                </VCRow>
                <VCRow label="Constraint applied?">
                  <select className={styles.input} style={{maxWidth:'300px'}} value={tp.vcConstraint} onChange={e => setTP(p => ({...p,vcConstraint:e.target.value as TransactionPrice['vcConstraint']}))}>
                    <option value="none">No constraint — include full amount</option>
                    <option value="partial">Partially constrained — enter included amount</option>
                    <option value="full">Fully constrained — exclude entirely</option>
                  </select>
                </VCRow>
                {tp.vcConstraint === 'partial' && (
                  <VCRow label="Included VC ($)">
                    <input className={`${styles.input} ${styles.mono}`} type="number" style={{maxWidth:'200px'}} value={tp.vcIncluded} onChange={e => setTP(p => ({...p,vcIncluded:e.target.value}))} placeholder="0.00" min={0} step="0.01" />
                  </VCRow>
                )}
              </>
            )}
            <VCRow label="Significant financing?">
              <div className={styles.radioGroup}>
                {(['no','yes','expedient'] as const).map(v => (
                  <label key={v} className={styles.radioLabel}>
                    <input type="radio" checked={tp.hasFinancing===v} onChange={() => setTP(p => ({...p,hasFinancing:v}))} />
                    {' '}{v==='expedient' ? 'Expedient (≤1yr)' : v.charAt(0).toUpperCase()+v.slice(1)}
                  </label>
                ))}
              </div>
            </VCRow>
            {tp.hasFinancing === 'yes' && (
              <VCRow label="Financing adj. ($)">
                <input className={`${styles.input} ${styles.mono}`} type="number" style={{maxWidth:'200px'}} value={tp.financingAdj} onChange={e => setTP(p => ({...p,financingAdj:e.target.value}))} placeholder="0.00" step="0.01" />
              </VCRow>
            )}
            <VCRow label="Non-cash consideration ($)">
              <input className={`${styles.input} ${styles.mono}`} type="number" style={{maxWidth:'200px'}} value={tp.nonCash} onChange={e => setTP(p => ({...p,nonCash:e.target.value}))} placeholder="FV or 0" min={0} step="0.01" />
            </VCRow>
            <VCRow label="Consideration payable to customer ($)">
              <input className={`${styles.input} ${styles.mono}`} type="number" style={{maxWidth:'200px'}} value={tp.considerationPayable} onChange={e => setTP(p => ({...p,considerationPayable:e.target.value}))} placeholder="Reduction or 0" min={0} step="0.01" />
            </VCRow>
            <div className={styles.totalBar} style={{marginTop:'14px'}}>
              <span className={styles.totalLbl}>Total transaction price</span>
              <span className={styles.totalVal}>{fmt(tpTotal)}</span>
            </div>
          </div>
          <NavRow onBack={() => setActiveTab(2)} onNext={() => setActiveTab(4)} />
        </div>
      )}

      {/* ── Tab 4: Step 4 ── */}
      {activeTab === 4 && (
        <div className={styles.panel}>
          <div className={styles.card}>
            <div className={styles.secHdr}>Step 4 — allocate the transaction price <span className={styles.diffTag}>ASC 606-10-32-28</span></div>
            <p className={styles.hint}>Enter stand-alone selling prices. Allocation calculates automatically.</p>
            <div className={styles.tpReminder}>
              Transaction price to allocate: <strong className={styles.mono}>{fmt(tpTotal)}</strong>
            </div>
            {validPOs.length === 0 ? (
              <div className={styles.alertWarn}>No POs yet. Complete Step 2 first.</div>
            ) : (
              <>
                <div className={styles.tableWrap}>
                  <table className={styles.poTable}>
                    <thead>
                      <tr>
                        <th style={{width:'28px'}}>#</th>
                        <th>Performance obligation</th>
                        <th style={{width:'110px'}}>SSP method</th>
                        <th style={{width:'100px'}}>SSP ($)</th>
                        <th style={{width:'70px'}}>SSP %</th>
                        <th style={{width:'110px'}}>Allocated TP ($)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allocCalc.rows.map((row, i) => {
                        const po = validPOs[i];
                        const allocRow = allocation[po.id] ?? {poId:po.id,sspMethod:'Market',ssp:''};
                        return (
                          <tr key={po.id}>
                            <td className={styles.centerCell}>{po.id}</td>
                            <td className={styles.bold}>{po.description || `PO ${po.id}`}</td>
                            <td>
                              <select className={styles.inputSm} value={allocRow.sspMethod} onChange={e => updateAlloc(po.id,'sspMethod',e.target.value)}>
                                <option>Market</option><option>Cost + margin</option><option>Residual</option>
                              </select>
                            </td>
                            <td>
                              <input className={`${styles.inputSm} ${styles.mono}`} type="number" value={allocRow.ssp} onChange={e => updateAlloc(po.id,'ssp',e.target.value)} placeholder="0.00" min={0} step="0.01" />
                            </td>
                            <td className={`${styles.mono} ${styles.rightAlign}`}>{pct(row.pct)}</td>
                            <td className={`${styles.mono} ${styles.rightAlign} ${styles.primaryColor}`}>{fmt(row.allocTP)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className={styles.totalsRow}>
                        <td colSpan={3} className={styles.totalFootLabel}>Total</td>
                        <td className={`${styles.mono} ${styles.primaryColor}`}>{fmt(allocCalc.totalSSP)}</td>
                        <td className={`${styles.mono} ${styles.primaryColor}`}>100%</td>
                        <td className={`${styles.mono} ${styles.primaryColor}`}>{fmt(allocCalc.totalAllocTP)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
                {allocCalc.totalSSP === 0 && (
                  <div className={styles.alertWarn}>Enter SSP for each PO to compute the allocation.</div>
                )}
              </>
            )}
          </div>
          <NavRow onBack={() => setActiveTab(3)} onNext={() => setActiveTab(5)} />
        </div>
      )}

      {/* ── Tab 5: Step 5 ── */}
      {activeTab === 5 && (
        <div className={styles.panel}>
          <div className={styles.card}>
            <div className={styles.secHdr}>Step 5 — recognize revenue <span className={styles.diffTag}>ASC 606-10-25-23</span></div>
            {validPOs.length === 0 ? (
              <div className={styles.alertWarn}>No POs yet. Complete Step 2 first.</div>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.poTable} style={{minWidth:'700px'}}>
                  <thead>
                    <tr>
                      <th style={{width:'28px'}}>#</th>
                      <th>PO</th>
                      <th style={{width:'90px'}}>Alloc. TP</th>
                      <th style={{width:'90px'}}>Timing</th>
                      <th style={{width:'120px'}}>Method/trigger</th>
                      <th style={{width:'80px'}}>P1 ($)</th>
                      <th style={{width:'80px'}}>P2 ($)</th>
                      <th style={{width:'80px'}}>P3 ($)</th>
                      <th style={{width:'80px'}}>P4 ($)</th>
                      <th style={{width:'90px'}}>Total ($)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validPOs.map((po, i) => {
                      const allocRow = allocCalc.rows[i];
                      const recRow = recognition[po.id] ?? {poId:po.id,method:'',p1:'',p2:'',p3:'',p4:''};
                      const rowTotal = parseNum(recRow.p1)+parseNum(recRow.p2)+parseNum(recRow.p3)+parseNum(recRow.p4);
                      const timingLabel = po.timing === 'ot' ? 'Over time' : po.timing === 'pt' ? 'Point in time' : '—';
                      return (
                        <tr key={po.id}>
                          <td className={styles.centerCell}>{po.id}</td>
                          <td className={styles.bold}>{po.description || `PO ${po.id}`}</td>
                          <td className={`${styles.mono} ${styles.rightAlign}`}>{fmt(allocRow?.allocTP ?? 0)}</td>
                          <td><span className={po.timing === 'ot' ? styles.badgeOt : styles.badgePt}>{timingLabel}</span></td>
                          <td><input className={styles.inputSm} value={recRow.method} onChange={e => updateRecog(po.id,'method',e.target.value)} placeholder="e.g. % complete" /></td>
                          {(['p1','p2','p3','p4'] as const).map(period => (
                            <td key={period}>
                              <input className={`${styles.inputSm} ${styles.mono}`} type="number" value={recRow[period]} onChange={e => updateRecog(po.id,period,e.target.value)} placeholder="0" min={0} step="0.01" />
                            </td>
                          ))}
                          <td className={`${styles.mono} ${styles.rightAlign} ${styles.primaryColor}`}>{fmt(rowTotal)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={styles.totalsRow}>
                      <td colSpan={5} className={styles.totalFootLabel}>Total recognized</td>
                      {(['p1','p2','p3','p4'] as const).map(period => {
                        const colTotal = validPOs.reduce((sum, po) => {
                          const r = recognition[po.id];
                          return sum + (r ? parseNum(r[period]) : 0);
                        }, 0);
                        return <td key={period} className={`${styles.mono} ${styles.primaryColor}`}>{fmt(colTotal)}</td>;
                      })}
                      <td className={`${styles.mono} ${styles.primaryColor}`}>
                        {fmt(validPOs.reduce((sum, po) => {
                          const r = recognition[po.id];
                          if (!r) return sum;
                          return sum + parseNum(r.p1)+parseNum(r.p2)+parseNum(r.p3)+parseNum(r.p4);
                        }, 0))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
          {/* Special arrangements checklist */}
          <div className={styles.card}>
            <div className={styles.secHdr}>Special arrangements checklist</div>
            <div className={styles.checklist}>
              {SPECIAL_CHECKS.map((item, i) => (
                <label key={i} className={`${styles.chkItem} ${specialChecks[i] ? styles.chkChecked : ''}`}>
                  <input type="checkbox" checked={specialChecks[i]} onChange={() => setSpecialChecks(prev => prev.map((v,j) => j===i ? !v : v))} />
                  {item}
                </label>
              ))}
            </div>
          </div>
          <NavRow onBack={() => setActiveTab(4)} onNext={() => setActiveTab(6)} nextLabel="Next: Costs →" />
        </div>
      )}

      {/* ── Tab 6: Costs & disclosures ── */}
      {activeTab === 6 && (
        <div className={styles.panel}>
          <div className={styles.card}>
            <div className={styles.secHdr}>Contract costs <span className={styles.diffTag}>ASC 340-40</span></div>
            <table className={styles.criteriaTable}>
              <thead>
                <tr><th>Cost type</th><th>Example</th><th>Treatment</th><th>Amount ($)</th><th>Amort. (months)</th></tr>
              </thead>
              <tbody>
                <tr>
                  <td className={styles.bold}>Costs to obtain</td>
                  <td className={styles.hint}>Sales commissions</td>
                  <td>
                    <select className={styles.inputSm} value={costs.obtainTreatment} onChange={e => setCosts(p => ({...p,obtainTreatment:e.target.value}))}>
                      <option>Capitalize</option><option>Expense (≤1 yr)</option><option>N/A</option>
                    </select>
                  </td>
                  <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={costs.obtainAmt} onChange={e => setCosts(p => ({...p,obtainAmt:e.target.value}))} placeholder="0.00" min={0} step="0.01" /></td>
                  <td><input className={styles.inputSm} type="number" value={costs.obtainMonths} onChange={e => setCosts(p => ({...p,obtainMonths:e.target.value}))} placeholder="—" min={0} /></td>
                </tr>
                <tr>
                  <td className={styles.bold}>Costs to fulfill</td>
                  <td className={styles.hint}>Setup, mobilization</td>
                  <td>
                    <select className={styles.inputSm} value={costs.fulfillTreatment} onChange={e => setCosts(p => ({...p,fulfillTreatment:e.target.value}))}>
                      <option>Capitalize</option><option>Expense</option><option>N/A</option>
                    </select>
                  </td>
                  <td><input className={`${styles.inputSm} ${styles.mono}`} type="number" value={costs.fulfillAmt} onChange={e => setCosts(p => ({...p,fulfillAmt:e.target.value}))} placeholder="0.00" min={0} step="0.01" /></td>
                  <td><input className={styles.inputSm} type="number" value={costs.fulfillMonths} onChange={e => setCosts(p => ({...p,fulfillMonths:e.target.value}))} placeholder="—" min={0} /></td>
                </tr>
              </tbody>
            </table>
            {(parseNum(costs.obtainAmt) + parseNum(costs.fulfillAmt)) > 0 && (
              <div className={styles.totalBar}>
                <span className={styles.totalLbl}>Total contract costs</span>
                <span className={styles.totalVal}>{fmt(parseNum(costs.obtainAmt) + parseNum(costs.fulfillAmt))}</span>
              </div>
            )}
          </div>
          <div className={styles.card}>
            <div className={styles.secHdr}>Disclosure checklist <span className={styles.diffTag}>ASC 606-10-50</span></div>
            <div className={styles.checklist}>
              {DISC_ITEMS.map((item, i) => (
                <label key={i} className={`${styles.chkItem} ${discChecks[i] ? styles.chkChecked : ''}`}>
                  <input type="checkbox" checked={discChecks[i]} onChange={() => setDiscChecks(prev => prev.map((v,j) => j===i ? !v : v))} />
                  {item}
                </label>
              ))}
            </div>
          </div>
          <NavRow onBack={() => setActiveTab(5)} onNext={() => setActiveTab(7)} nextLabel="Next: Summary →" />
        </div>
      )}

      {/* ── Tab 7: Summary & sign-off ── */}
      {activeTab === 7 && (
        <div className={styles.panel}>
          <div className={styles.card}>
            <div className={styles.secHdr}>Worksheet summary</div>
            {/* Metric cards */}
            <div className={styles.sumGrid}>
              <SumCard label="Transaction price" value={fmt(tpTotal)} sub="Total per Step 3" />
              <SumCard label="Performance obligations" value={String(validPOs.length)} sub={`OT: ${validPOs.filter(p=>p.timing==='ot').length} · PT: ${validPOs.filter(p=>p.timing==='pt').length}`} />
              <SumCard label="Disclosures checked" value={`${discChecks.filter(Boolean).length} / ${DISC_ITEMS.length}`} sub="ASC 606-10-50" />
            </div>
            {/* PO allocation summary */}
            {validPOs.length > 0 && (
              <table className={styles.poTable}>
                <thead>
                  <tr><th>#</th><th>PO</th><th>Timing</th><th style={{textAlign:'right'}}>Allocated TP</th></tr>
                </thead>
                <tbody>
                  {validPOs.map((po, i) => {
                    const allocRow = allocCalc.rows[i];
                    const timingLabel = po.timing === 'ot' ? 'Over time' : po.timing === 'pt' ? 'Point in time' : 'Not set';
                    return (
                      <tr key={po.id}>
                        <td className={styles.centerCell}>{po.id}</td>
                        <td className={styles.bold}>{po.description || `PO ${po.id}`}</td>
                        <td className={styles.bold}>{timingLabel}</td>
                        <td className={`${styles.mono} ${styles.rightAlign} ${styles.primaryColor}`}>{fmt(allocRow?.allocTP ?? 0)}</td>
                      </tr>
                    );
                  })}
                  <tr className={styles.totalsRow}>
                    <td colSpan={3} className={styles.totalFootLabel}>Total</td>
                    <td className={`${styles.mono} ${styles.primaryColor} ${styles.rightAlign}`}>{fmt(tpTotal)}</td>
                  </tr>
                </tbody>
              </table>
            )}
            {/* Alerts */}
            <div style={{marginTop:'12px'}}>
              {!criteriaAllMet && criteriaAnswered && <div className={styles.alertWarn}>Step 1: Not all contract criteria confirmed.</div>}
              {validPOs.length === 0 && <div className={styles.alertWarn}>Step 2: No performance obligations identified.</div>}
              {tpTotal === 0 && <div className={styles.alertWarn}>Step 3: Transaction price is $0.</div>}
              {discChecks.filter(Boolean).length < DISC_ITEMS.length && (
                <div className={styles.alertWarn}>Disclosures: {DISC_ITEMS.length - discChecks.filter(Boolean).length} item(s) unchecked.</div>
              )}
              {criteriaAllMet && validPOs.length > 0 && tpTotal > 0 && discChecks.every(Boolean) && (
                <div className={styles.alertOk}>Worksheet complete — ready for sign-off.</div>
              )}
            </div>
          </div>
          {/* Sign-off */}
          <div className={styles.card}>
            <div className={styles.secHdr}>Sign-off</div>
            <table className={styles.signTable}>
              <thead><tr><th>Role</th><th>Name (print)</th><th>Date</th><th>Notes</th></tr></thead>
              <tbody>
                {signOff.map((row, i) => (
                  <tr key={row.role}>
                    <td className={styles.bold}>{row.role}</td>
                    <td><input className={styles.inputSm} value={row.name} onChange={e => setSignOff(prev => prev.map((r,j) => j===i?{...r,name:e.target.value}:r))} placeholder="Full name" /></td>
                    <td><input className={styles.inputSm} type="date" value={row.date} onChange={e => setSignOff(prev => prev.map((r,j) => j===i?{...r,date:e.target.value}:r))} /></td>
                    <td><input className={styles.inputSm} value={row.notes} onChange={e => setSignOff(prev => prev.map((r,j) => j===i?{...r,notes:e.target.value}:r))} placeholder="Optional" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.navRow}>
            <button className={styles.btn} onClick={() => setActiveTab(6)}>← Back</button>
            <button className={styles.btnPrimary} onClick={() => window.print()}>Print / save PDF</button>
          </div>
          <p className={styles.footnote}>Retain this worksheet with the contract file. Update when a contract modification or triggering event occurs.</p>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div>
      <label style={{display:'block',fontSize:'11px',fontWeight:500,color:'#666',marginBottom:'4px',textTransform:'uppercase',letterSpacing:'.04em'}}>{label}</label>
      {children}
    </div>
  );
}

function VCRow({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <div style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 0',borderBottom:'1px solid #eee'}}>
      <span style={{flex:'0 0 200px',fontSize:'12px',fontWeight:500,color:'#666'}}>{label}</span>
      <div style={{flex:1}}>{children}</div>
    </div>
  );
}

function NavRow({onBack, onNext, nextLabel = 'Next →'}: {onBack?: () => void; onNext?: () => void; nextLabel?: string}) {
  return (
    <div style={{display:'flex',justifyContent:'space-between',marginTop:'1rem'}}>
      {onBack ? <button style={{padding:'8px 18px',borderRadius:'8px',border:'1px solid #ccc',background:'#fff',cursor:'pointer',fontSize:'13px'}} onClick={onBack}>← Back</button> : <div />}
      {onNext && <button style={{padding:'8px 18px',borderRadius:'8px',border:'none',background:'#1F3864',color:'#fff',cursor:'pointer',fontSize:'13px'}} onClick={onNext}>{nextLabel}</button>}
    </div>
  );
}

function SumCard({label, value, sub}: {label: string; value: string; sub: string}) {
  return (
    <div style={{background:'#f5f5f5',borderRadius:'8px',padding:'12px'}}>
      <div style={{fontSize:'11px',color:'#666',marginBottom:'4px'}}>{label}</div>
      <div style={{fontSize:'20px',fontWeight:500,fontFamily:'monospace'}}>{value}</div>
      <div style={{fontSize:'11px',color:'#999',marginTop:'2px'}}>{sub}</div>
    </div>
  );
}
