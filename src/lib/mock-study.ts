import { BookOpen, Brain, PenLine, type LucideIcon } from "lucide-react";

export type StudySession = {
  id: string;
  subject: string;
  topic: string;
  objective: string;
  duration: string;
  durationMinutes: number;
  questions: number;
  kind: string;
  icon: LucideIcon;
  content: string[];
  done?: boolean;
  active?: boolean;
};

export const studySessions: StudySession[] = [
  {
    id: "matematica-logaritmos",
    subject: "Matemática",
    topic: "Logaritmos e propriedades",
    objective:
      "Dominar as 5 propriedades operatórias e aplicar em problemas contextualizados do ENEM.",
    duration: "45 min",
    durationMinutes: 45,
    questions: 12,
    kind: "Teoria + 12 questões",
    icon: BookOpen,
    done: true,
    content: [
      "Definição de logaritmo e condição de existência",
      "Propriedade do produto, quociente e potência",
      "Mudança de base",
      "Aplicações em juros compostos e escala Richter",
    ],
  },
  {
    id: "fisica-newton",
    subject: "Física",
    topic: "Leis de Newton — aplicações",
    objective:
      "Resolver problemas envolvendo plano inclinado, atrito e sistemas de corpos ligados por fios.",
    duration: "60 min",
    durationMinutes: 60,
    questions: 8,
    kind: "Simulação prática",
    icon: Brain,
    active: true,
    content: [
      "Revisão da 1ª, 2ª e 3ª Lei de Newton",
      "Diagrama de corpo livre passo a passo",
      "Plano inclinado com e sem atrito",
      "Sistema de blocos e polias ideais",
    ],
  },
  {
    id: "redacao-repertorio",
    subject: "Redação",
    topic: "Repertório sociocultural",
    objective:
      "Construir um banco pessoal de repertórios legitimados aplicáveis a temas sociais recorrentes.",
    duration: "30 min",
    durationMinutes: 30,
    questions: 0,
    kind: "Leitura crítica",
    icon: PenLine,
    content: [
      "Diferença entre repertório legitimado e senso comum",
      "3 filósofos-chave: Bauman, Foucault e Hannah Arendt",
      "Como conectar repertório à tese",
      "Exercício: aplicar em 2 propostas antigas do ENEM",
    ],
  },
  {
    id: "historia-vargas",
    subject: "História",
    topic: "Era Vargas — revisão espaçada",
    objective:
      "Fixar cronologia, políticas econômicas e transformações sociais dos governos Vargas.",
    duration: "25 min",
    durationMinutes: 25,
    questions: 15,
    kind: "Flashcards IA",
    icon: BookOpen,
    content: [
      "Governo Provisório (1930-1934)",
      "Constitucional (1934-1937) e Estado Novo (1937-1945)",
      "CLT, industrialização e populismo",
      "Segundo governo (1951-1954) e crise final",
    ],
  },
];

export const insights: Record<
  string,
  {
    id: string;
    title: string;
    subject: string;
    reason: string;
    related: string[];
    questionsCount: number;
  }
> = {
  "termodinamica-entropia": {
    id: "termodinamica-entropia",
    title: "Reforço em Entropia",
    subject: "Física · Termodinâmica",
    reason:
      "Nos últimos 7 dias você errou 3 de 4 questões envolvendo a 2ª Lei da Termodinâmica. O padrão indica que a definição operacional de entropia ainda não está consolidada — você acerta cálculos, mas erra a interpretação conceitual.",
    related: [
      "1ª Lei da Termodinâmica e conservação de energia",
      "Ciclo de Carnot e rendimento máximo",
      "Processos reversíveis vs. irreversíveis",
      "Máquinas térmicas e refrigeradores",
    ],
    questionsCount: 3,
  },
};

export const metricDetails = {
  streak: {
    label: "Sequência",
    value: "12 dias",
    description:
      "Número de dias consecutivos em que você estudou pelo menos 1 sessão. A sequência é zerada se você ficar 24h sem completar nenhuma atividade.",
    tip: "Manter a sequência libera bônus de XP crescentes a cada 7 dias.",
  },
  time: {
    label: "Tempo hoje",
    value: "2h 15m",
    description:
      "Tempo total efetivo de estudo hoje, contabilizando apenas sessões em foco (sem pausas maiores que 5 minutos).",
    tip: "A meta diária personalizada é ajustada pela IA com base no seu cronograma até o ENEM.",
  },
  accuracy: {
    label: "Precisão média",
    value: "78%",
    description:
      "Percentual de acertos considerando todas as questões resolvidas nos últimos 30 dias, ponderado por dificuldade.",
    tip: "Precisões acima de 75% indicam prontidão para questões de nível avançado.",
  },
  tri: {
    label: "TRI estimada",
    value: "742.5",
    description:
      "Estimativa da sua nota na Teoria de Resposta ao Item (TRI), o modelo usado pelo ENEM. Considera acertos, dificuldade das questões e coerência do gabarito.",
    tip: "Acima de 700 já coloca você entre os 15% melhores candidatos históricos.",
  },
} as const;

export type MetricKey = keyof typeof metricDetails;

export const reorganizedPlan = [
  { time: "08:00", subject: "Física", topic: "Termodinâmica — Entropia", duration: "50 min", priority: "Alta" },
  { time: "09:00", subject: "Matemática", topic: "Logaritmos aplicados", duration: "40 min", priority: "Média" },
  { time: "10:00", subject: "Redação", topic: "Repertório sociocultural", duration: "30 min", priority: "Média" },
  { time: "14:00", subject: "Biologia", topic: "Ciclo do Nitrogênio (revisão)", duration: "25 min", priority: "Baixa" },
  { time: "15:00", subject: "História", topic: "Era Vargas — flashcards", duration: "25 min", priority: "Baixa" },
];
