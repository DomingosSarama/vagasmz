import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApplicationsPDF } from './pdfExport.ts';
import { INITIAL_DEMO_APPLICATIONS, DEFAULT_USER_PROFILE } from '../data/seedCatalog.ts';
test('PDF export paginates long titles, notes, contacts and interviews without clipping to a single page',()=>{
  const app={...INITIAL_DEMO_APPLICATIONS[0],jobTitle:'Título longo '.repeat(40),notes:'Notas pessoais extensas '.repeat(300),contacts:Array.from({length:30},(_,i)=>({id:`c-${i}`,name:'Contacto '.repeat(15),role:'Recrutamento',contactInfo:'email@example.com'}))};
  const doc=buildApplicationsPDF([app],{...DEFAULT_USER_PROFILE,name:'Nome comprido '.repeat(30)});
  assert.ok(doc.getNumberOfPages()>3);assert.ok(doc.output().startsWith('%PDF-'));
  assert.equal(buildApplicationsPDF([]).getNumberOfPages(),1);
});
