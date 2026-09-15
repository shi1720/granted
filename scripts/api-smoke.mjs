import assert from 'node:assert/strict';
import fs from 'node:fs';
const base=process.env.BASE_URL || 'http://localhost:3000';
const results=[];
async function check(label, fn) { const start=Date.now(); await fn(); results.push({label,passed:true,ms:Date.now()-start}); console.log('PASS',label); }
const request = (path,body,headers={})=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
let org;
await check('Server reports a configured AI model',async()=>{const r=await fetch(base+'/api/ai/status');assert.equal(r.status,200);const j=await r.json();assert(j.aiEnabled);});
await check('Reject invalid grant IDs',async()=>{assert.equal((await fetch(base+'/api/grants/not-a-grant')).status,400);});
await check('Reject malformed AI requests',async()=>{assert.equal((await request('/api/ai/draft',{grantId:'abc',org:{}})).status,400);});
await check('Reject foreign origin',async()=>{assert.equal((await request('/api/ai/profile',{text:'x'.repeat(100)},{Origin:'https://foreign.example'})).status,403);});
await check('Extract a live, grounded organization profile',async()=>{const r=await request('/api/ai/profile',{text:'Brightpath Community Partners is a 501(c)(3) nonprofit in Richmond, Virginia. It helps formerly incarcerated adults through job training, housing navigation, and mentoring. Its annual budget is $850,000 and it employs 8 staff. In 2025 it served 240 participants, with 168 finding employment within six months. It runs a 12-week job readiness program.'});assert.equal(r.status,200);org=(await r.json()).profile;assert.equal(org.annualBudgetUsd,850000);assert.equal(org.staffCount,8);assert.equal(org.orgType,'nonprofit_501c3');assert(org.fundingCategories.includes('ELT'));});
await check('Search live Grants.gov data',async()=>{const r=await request('/api/grants/search',{keyword:'reentry',rows:5});const j=await r.json();assert.equal(r.status,200);assert.equal(j.source,'live');assert(j.hits.length>0);});
await check('Enforce the government-only eligibility gate',async()=>{const r=await request('/api/ai/match',{grantId:'363588',org});const j=await r.json();assert.equal(j.report.recommendation,'skip');assert.equal(j.report.eligibility.verdict,'ineligible');assert.equal(j.report.economics.expectedValueUsd,null);});
await check('Complete live strategy, writing, review and revision',async()=>{
  const status=await (await fetch(base+'/api/ai/status')).json();
  const r=await fetch((status.apiBase || base)+'/api/ai/draft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({grantId:'363637',org})});
  assert.equal(r.status,200);
  const raw=await r.text();const events=raw.split('\n\n').filter(x=>x.startsWith('data: ')).map(x=>JSON.parse(x.slice(6)));
  const error=events.find(x=>x.type==='error');assert(!error,error?.message);
  const done=events.find(x=>x.type==='done');assert(done,'Missing completion event');
  assert.equal(done.proposal.engine,'openai');assert(done.proposal.sections.length>=5);assert(done.proposal.sections.every(s=>s.content.length>100));
  assert(done.proposal.usage.inputTokens>0);assert(events.some(x=>x.type==='review'));assert(events.some(x=>x.type==='section_delta'));
  assert(!done.proposal.sections.some(s=>s.content.includes('\u2014')));
  fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/live-proposal.json',JSON.stringify(done.proposal,null,2));
});
fs.mkdirSync('test-results',{recursive:true});
fs.writeFileSync('test-results/api-smoke.json',JSON.stringify({base,at:new Date().toISOString(),results},null,2));
