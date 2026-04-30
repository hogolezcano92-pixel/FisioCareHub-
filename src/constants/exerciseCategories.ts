export const OBJETIVOS_TERAPEUTICOS = [
  'Equilíbrio',
  'Força',
  'Mobilidade articular',
  'Flexibilidade (Alongamento)',
  'Marcha / Locomoção',
  'Funcional (AVDs)',
  'Respiratório',
  'Coordenação / Dupla tarefa',
  'Resistência'
] as const;

export const CONTEXTOS_FUNCIONAIS = [
  'Leito',
  'Cadeirante',
  'Deambulando',
  'Pós-operatório',
  'Idoso frágil',
  'Atleta'
] as const;

export const DIFICULDADES = [
  { value: 'iniciante', label: 'Iniciante', color: 'text-emerald-400 bg-emerald-400/10' },
  { value: 'intermediario', label: 'Intermediário', color: 'text-amber-400 bg-amber-400/10' },
  { value: 'avancado', label: 'Avançado', color: 'text-rose-400 bg-rose-400/10' }
] as const;

export type ObjetivoTerapeutico = typeof OBJETIVOS_TERAPEUTICOS[number];
export type ContextoFuncional = typeof CONTEXTOS_FUNCIONAIS[number];
export type Dificuldade = typeof DIFICULDADES[number]['value'];
