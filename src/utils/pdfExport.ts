import { jsPDF } from 'jspdf';
import type { JobApplicationRecord, UserProfile } from '../types/index.ts';
export function buildApplicationsPDF(applications:JobApplicationRecord[],profile?:UserProfile):jsPDF {
  const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  let y = 18;
  const line = (value:string,bold=false,size=9.5) => {
    doc.setFont('helvetica',bold ? 'bold' : 'normal'); doc.setFontSize(size);
    const lines:string[] = doc.splitTextToSize(value.replace(/[\u0000-\u001f]/g,' '),182);
    for(const part of lines) {if(y > 278) {doc.addPage();y=18;} doc.text(part,14,y);y+=5;}
    y+=2;
  };
  line('VagasMZ — Relatório de candidaturas',true,17);
  line(`Exportado em: ${new Date().toLocaleDateString('pt-MZ')}`);
  if(profile?.name) line(`Candidato: ${profile.name}`);
  line(`${applications.length} candidaturas registadas`,true,11);
  if(!applications.length) line('Nenhuma candidatura registada.');
  applications.forEach((app,index) => {
    if(y > 250) {doc.addPage();y=18;}
    line(`${index+1}. ${app.jobTitle}`,true,11); line(`Estado: ${app.status}`,true);
    line(`Empresa: ${app.company} | Local: ${app.location} | Área: ${app.area}`);
    line(`Data de registo/envio: ${app.appliedDate || 'Não informada'} | Prazo: ${app.deadline || 'Não informado'}`);
    if(app.nextAction) line(`Próxima acção: ${app.nextAction} ${app.nextActionDate || ''}`);
    if(app.notes) line(`Notas: ${app.notes}`);
    app.interviews.forEach(i => line(`Entrevista: ${i.format} (${i.date})${i.completed ? ' — Concluída' : ''}`));
    app.contacts.forEach(c => line(`Contacto: ${c.name} (${c.role}: ${c.contactInfo})`));
    y+=4;
  });
  return doc;
}
export function exportApplicationsToPDF(applications:JobApplicationRecord[],profile?:UserProfile):void {
  buildApplicationsPDF(applications,profile).save(`VagasMZ_Candidaturas_${new Date().toISOString().slice(0,10)}.pdf`);
}
