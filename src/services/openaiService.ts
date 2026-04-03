// Agora o frontend não fala mais com a OpenAI, ele fala com a sua API na Vercel
export const realizarTriagemIA = async (relatoPaciente: string) => {
  try {
    const response = await fetch('/api/triage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: relatoPaciente }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro na comunicação com a IA');
    }

    const data = await response.json();
    return data.text; // Retorna o texto da análise
  } catch (error) {
    console.error("Erro na triagem:", error);
    return "Não foi possível realizar a triagem agora. Tente novamente.";
  }
};

