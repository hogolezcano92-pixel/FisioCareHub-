
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';

export const BASE_EXERCISES = [
  {
    nome: "Agachamento com Apoio frontal",
    objetivo_principal: "Força",
    objetivos_secundarios: ["Equilíbrio", "Funcional (AVDs)"],
    categoria_principal: "Musculoesquelético",
    subcategoria: "Quadríceps / Glúteo",
    contexto_funcional: ["Idoso frágil", "Atleta", "Deambulando"],
    descricao: "Mantenha os pés afastados na largura dos ombros. Apoie as mãos suavemente em uma barra ou encosto de cadeira. Desça o quadril como se fosse sentar em uma cadeira invisível, mantendo o tronco ereto. Retorne à posição inicial.",
    precaucoes: "Evite que os joelhos ultrapassem a linha dos pés. Mantenha os calcanhares no chão.",
    indicacao_clinica: "Fraqueza de membros inferiores, instabilidade de marcha.",
    dificuldade: "iniciante",
    imagem_url: "https://images.unsplash.com/photo-1571019623452-8d9afc330e66?auto=format&fit=crop&q=80&w=800"
  },
  {
    nome: "Ponte (Bridging)",
    objetivo_principal: "Força",
    objetivos_secundarios: ["Estabilidade de Core"],
    categoria_principal: "Musculoesquelético",
    subcategoria: "Glúteos / Lombar",
    contexto_funcional: ["Leito", "Pós-operatório", "Idoso frágil"],
    descricao: "Deitado de costas com os joelhos dobrados e pés apoiados no colchão. Eleve o quadril em direção ao teto, contraindo os glúteos. Mantenha por 3 segundos e desça lentamente.",
    precaucoes: "Não eleve demais o quadril a ponto de arquear excessivamente a lombar.",
    indicacao_clinica: "Dor lombar, pós-operatório de quadril.",
    dificuldade: "iniciante",
    imagem_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800"
  },
  {
    nome: "Alongamento Global em Pé",
    objetivo_principal: "Flexibilidade (Alongamento)",
    objetivos_secundarios: ["Mobilidade articular"],
    categoria_principal: "Flexibilidade",
    subcategoria: "Cadeia Posterior",
    contexto_funcional: ["Atleta", "Deambulando"],
    descricao: "Em pé, pés juntos. Incline o corpo para frente tentando tocar os dedos dos pés sem dobrar os joelhos. Respire profundamente e mantenha a posição por 30 segundos.",
    precaucoes: "Cuidado com tonturas ao retornar à posição ereta. Pacientes com hérnia de disco aguda devem evitar flexão máxima.",
    indicacao_clinica: "Encurtamento muscular de isquiotibiais.",
    dificuldade: "intermediario",
    imagem_url: "https://images.unsplash.com/photo-1518622358385-8ea7d0794bf6?auto=format&fit=crop&q=80&w=800"
  },
  {
    nome: "Mobilidade Cervical - Rotação",
    objetivo_principal: "Mobilidade articular",
    objetivos_secundarios: ["Funcional (AVDs)"],
    categoria_principal: "Musculoesquelético",
    subcategoria: "Cervical",
    contexto_funcional: ["Cadeirante", "Leito", "Deambulando"],
    descricao: "Sentado ou em pé. Gire o pescoço lentamente para a direita como se estivesse olhando por cima do ombro. Retorne ao centro e gire para a esquerda.",
    precaucoes: "Evite movimentos rápidos. Interrompa se houver dor aguda ou tontura.",
    indicacao_clinica: "Cervicalgia, tensão muscular.",
    dificuldade: "iniciante",
    imagem_url: "https://images.unsplash.com/photo-1512438248247-f0f2a5a8b7f0?auto=format&fit=crop&q=80&w=800"
  }
];

export async function seedExerciseLibrary(fisioId: string) {
  try {
    const exercisesToInsert = BASE_EXERCISES.map(ex => ({
      ...ex,
      fisio_id: fisioId
    }));

    const { error } = await supabase
      .from('exercicios')
      .insert(exercisesToInsert);

    if (error) throw error;
    toast.success('Biblioteca base importada com sucesso!');
    return true;
  } catch (err) {
    console.error('Erro ao seedar biblioteca:', err);
    toast.error('Erro ao importar biblioteca base.');
    return false;
  }
}
