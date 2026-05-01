const generatePDF = async () => {
  try {
    const { jsPDF } = await import('jspdf');

    // ✅ Import seguro (não quebra build)
    let autoTable: any = null;
    try {
      const mod = await import('jspdf-autotable');
      autoTable = mod.default;
    } catch (err) {
      console.warn('jspdf-autotable não encontrado');
    }

    const doc = new jsPDF();
    const title = `FICHA DE AVALIAÇÃO FISIOTERAPÊUTICA`;
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(0, 102, 204);
    doc.text(title, 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Data: ${new Date().toLocaleDateString()}`, 160, 20);
    
    // Patient Info
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

    let y = 55;

    const sections = [
      { 
        title: 'ANAMNESE', 
        data: [
          ['Queixa Principal', formData.queixa_principal],
          ['História da Doença Atual', formData.historia_doenca_atual],
          ['Histórico Médico', formData.historico_medico],
          ['Medicamentos em Uso', formData.medicamentos],
          ['Hábitos de Vida', formData.habitos_vida]
        ]
      },
      {
        title: 'AVALIAÇÃO FUNCIONAL',
        data: [
          ['Nível Funcional', formData.nivel_funcional],
          ['Independência', formData.independencia_funcional],
          ['Marcha', formData.marcha],
          ['Postura', formData.postura]
        ]
      },
      {
        title: 'EXAME FÍSICO',
        data: [
          ['Escala de Dor', `${formData.escala_dor}/10`],
          ['Inspeção', formData.inspecao],
          ['Palpação', formData.palpacao],
          ['Amplitude de Movimento', formData.amplitude_movimento],
          ['Força Muscular', formData.forca_muscular]
        ]
      },
      {
        title: 'RACIOCÍNIO CLÍNICO E PLANO',
        data: [
          ['Diagnóstico Fisioterapêutico', formData.diagnostico_fisio],
          ['Objetivos Terapêuticos', formData.objetivos_terapeuticos],
          ['Prognóstico', formData.prognostico],
          ['Conduta', formData.conduta],
          ['Frequência', formData.frequencia_sessoes]
        ]
      }
    ];

    // ✅ Só usa autoTable se existir
    if (autoTable) {
      sections.forEach(section => {
        autoTable(doc, {
          startY: y,
          head: [[{ content: section.title, colSpan: 2 }]],
          body: section.data,
          theme: 'striped',
          styles: { fontSize: 10, cellPadding: 3 },
          columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } },
          margin: { left: 20, right: 20 }
        });

        const finalY = (doc as any).lastAutoTable?.finalY || y + 10;
        y = finalY + 10;

        if (y > 250) {
          doc.addPage();
          y = 20;
        }
      });
    } else {
      // fallback simples (sem tabela)
      doc.text('Erro ao carregar tabelas. Instale jspdf-autotable.', 20, y);
    }

    doc.save(`avaliacao_${patient?.nome || 'paciente'}.pdf`);

  } catch (error) {
    console.error('Error generating PDF:', error);
    toast.error('Erro ao gerar o PDF.');
  }
};
