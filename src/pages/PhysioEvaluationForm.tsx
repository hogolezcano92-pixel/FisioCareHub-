import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'react-hot-toast'; // Ajuste conforme seu sistema de toast

// ... dentro do seu componente
const generatePDF = async () => {
  try {
    const doc = new jsPDF();
    const title = `FICHA DE AVALIAÇÃO FISIOTERAPÊUTICA`;
    
    // Configuração do Título
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204);
    doc.text(title, 20, 20);
    
    // Data e Identificação
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 160, 20);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Paciente: ${patient?.nome || 'N/A'}`, 20, 35);
    doc.text(
      `Data Nasc: ${
        patient?.data_nascimento
          ? new Date(patient.data_nascimento).toLocaleDateString()
          : 'N/A'
      }`,
      20,
      42
    );

    let y = 50;

    const sections = [
      { 
        title: 'ANAMNESE', 
        data: [
          ['Queixa Principal', formData.queixa_principal || 'Não informado'],
          ['História da Doença Atual', formData.historia_doenca_atual || 'Não informado'],
          ['Histórico Médico', formData.historico_medico || 'Não informado'],
          ['Medicamentos em Uso', formData.medicamentos || 'Não informado'],
          ['Hábitos de Vida', formData.habitos_vida || 'Não informado']
        ]
      },
      {
        title: 'AVALIAÇÃO FUNCIONAL',
        data: [
          ['Nível Funcional', formData.nivel_funcional || 'N/A'],
          ['Independência', formData.independencia_funcional || 'N/A'],
          ['Marcha', formData.marcha || 'N/A'],
          ['Postura', formData.postura || 'N/A']
        ]
      },
      {
        title: 'EXAME FÍSICO',
        data: [
          ['Escala de Dor', `${formData.escala_dor || 0}/10`],
          ['Inspeção', formData.inspecao || 'N/A'],
          ['Palpação', formData.palpacao || 'N/A'],
          ['Amplitude de Movimento', formData.amplitude_movimento || 'N/A'],
          ['Força Muscular', formData.forca_muscular || 'N/A']
        ]
      },
      {
        title: 'RACIOCÍNIO CLÍNICO E PLANO',
        data: [
          ['Diagnóstico Fisioterapêutico', formData.diagnostico_fisio || 'N/A'],
          ['Objetivos Terapêuticos', formData.objetivos_terapeuticos || 'N/A'],
          ['Prognóstico', formData.prognostico || 'N/A'],
          ['Conduta', formData.conduta || 'N/A'],
          ['Frequência', formData.frequencia_sessoes || 'N/A']
        ]
      }
    ];

    // Gerando as tabelas
    sections.forEach((section) => {
      autoTable(doc, {
        startY: y,
        head: [[{ content: section.title, colSpan: 2, styles: { fillColor: [0, 102, 204] } }]],
        body: section.data,
        theme: 'striped',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60 } },
        margin: { left: 20, right: 20 },
        didDrawPage: (data) => {
          y = data.cursor?.y || y;
        }
      });
      
      // Atualiza o Y para a próxima seção
      y = (doc as any).lastAutoTable.finalY + 10;
    });

    doc.save(`avaliacao_${patient?.nome || 'paciente'}.pdf`);
    toast.success('PDF gerado com sucesso!');

  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.error('Erro ao gerar o PDF.');
  }
};
