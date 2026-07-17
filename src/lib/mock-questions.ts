export type Language = "Português" | "Inglês" | "Espanhol";
export type KnowledgeArea =
  | "Matemática e suas Tecnologias"
  | "Ciências da Natureza"
  | "Ciências Humanas"
  | "Linguagens e Códigos";

export type QuestionStatus = "unanswered" | "correct" | "wrong";

export type Alternative = {
  letter: "A" | "B" | "C" | "D" | "E";
  text: string;
};

export type Question = {
  id: string;
  number: number;
  year: number;
  area: KnowledgeArea;
  subject: string;
  topic: string;
  language: Language;
  context: string;
  statement: string;
  alternatives: Alternative[];
  correct: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  status: QuestionStatus;
  favorite: boolean;
};

const areas: Record<string, KnowledgeArea> = {
  Matemática: "Matemática e suas Tecnologias",
  Física: "Ciências da Natureza",
  Química: "Ciências da Natureza",
  Biologia: "Ciências da Natureza",
  História: "Ciências Humanas",
  Geografia: "Ciências Humanas",
  Filosofia: "Ciências Humanas",
  Português: "Linguagens e Códigos",
  Inglês: "Linguagens e Códigos",
  Espanhol: "Linguagens e Códigos",
};

function make(
  id: string,
  number: number,
  year: number,
  subject: keyof typeof areas,
  topic: string,
  language: Language,
  context: string,
  statement: string,
  alts: string[],
  correctIdx: number,
  explanation: string,
  status: QuestionStatus = "unanswered",
  favorite = false,
): Question {
  const letters: Alternative["letter"][] = ["A", "B", "C", "D", "E"];
  return {
    id,
    number,
    year,
    area: areas[subject],
    subject,
    topic,
    language,
    context,
    statement,
    alternatives: alts.map((text, i) => ({ letter: letters[i], text })),
    correct: letters[correctIdx],
    explanation,
    status,
    favorite,
  };
}

export const mockQuestions: Question[] = [
  make(
    "q-2023-mat-01", 1, 2023, "Matemática", "Funções exponenciais", "Português",
    "Uma cultura de bactérias dobra sua população a cada 3 horas. Um pesquisador inicia o experimento com 500 bactérias.",
    "Quantas bactérias existirão após 15 horas de cultivo?",
    ["8.000", "12.500", "16.000", "20.000", "32.000"],
    2,
    "Em 15h temos 15/3 = 5 duplicações. Assim: 500 × 2⁵ = 500 × 32 = 16.000 bactérias.",
    "correct", true,
  ),
  make(
    "q-2022-qui-02", 2, 2022, "Química", "Estequiometria", "Português",
    "A combustão completa do metano é descrita por CH₄ + 2 O₂ → CO₂ + 2 H₂O. Massas molares: CH₄ = 16 g/mol; CO₂ = 44 g/mol.",
    "Qual é a massa de CO₂ produzida a partir de 32 g de CH₄?",
    ["44 g", "64 g", "72 g", "88 g", "132 g"],
    3,
    "32 g de CH₄ = 2 mol. Pela estequiometria 1:1, produzem 2 mol de CO₂ = 2 × 44 = 88 g.",
    "wrong", false,
  ),
  make(
    "q-2024-his-03", 3, 2024, "História", "Era Vargas", "Português",
    "O Estado Novo (1937–1945) foi marcado por medidas centralizadoras de Getúlio Vargas.",
    "Entre as características do Estado Novo destaca-se:",
    [
      "Fortalecimento do Poder Legislativo",
      "Dissolução do Congresso e outorga da Constituição de 1937",
      "Fim da censura à imprensa",
      "Autonomia total dos estados",
      "Eleições diretas para presidente",
    ],
    1,
    "O Estado Novo dissolveu o Congresso e impôs a Constituição de 1937 (\"Polaca\"), centralizando o poder no Executivo.",
    "unanswered", false,
  ),
  make(
    "q-2023-fis-04", 4, 2023, "Física", "Termodinâmica", "Português",
    "Uma máquina térmica opera segundo o ciclo de Carnot entre uma fonte quente a 500 K e uma fonte fria a 300 K.",
    "Qual é o rendimento máximo teórico dessa máquina?",
    ["20%", "30%", "40%", "50%", "60%"],
    2,
    "η = 1 − Tf/Tq = 1 − 300/500 = 0,40 = 40%.",
    "wrong", true,
  ),
  make(
    "q-2021-bio-05", 5, 2021, "Biologia", "Ecologia — Ciclo do Nitrogênio", "Português",
    "Bactérias fixadoras convertem N₂ atmosférico em compostos assimiláveis pelas plantas.",
    "A etapa descrita corresponde a:",
    ["Nitrificação", "Amonificação", "Desnitrificação", "Fixação biológica", "Assimilação"],
    3,
    "A conversão de N₂ em amônia por bactérias como Rhizobium é chamada de fixação biológica do nitrogênio.",
    "unanswered", false,
  ),
  make(
    "q-2022-mat-06", 6, 2022, "Matemática", "Geometria — Áreas", "Português",
    "Um terreno retangular mede 30 m por 20 m. Deseja-se cercá-lo e cobrir metade da área com grama.",
    "Qual é a área que receberá grama?",
    ["150 m²", "200 m²", "250 m²", "300 m²", "600 m²"],
    3,
    "Área total = 30 × 20 = 600 m². Metade = 300 m².",
    "correct", false,
  ),
  make(
    "q-2024-por-07", 7, 2024, "Português", "Interpretação de texto", "Português",
    "\"A linguagem é a casa do ser.\" (Heidegger)",
    "A frase acima pode ser interpretada como:",
    [
      "A linguagem limita o pensamento humano",
      "O ser humano habita e se constitui pela linguagem",
      "A casa é uma metáfora para arquitetura",
      "Heidegger defendia o silêncio absoluto",
      "A linguagem é apenas um instrumento neutro",
    ],
    1,
    "Para Heidegger, é na linguagem que o ser se manifesta — ela é constitutiva da existência humana.",
    "unanswered", false,
  ),
  make(
    "q-2023-ing-08", 8, 2023, "Inglês", "Reading comprehension", "Inglês",
    "\"Climate change is no longer a distant threat; it is a present reality that reshapes ecosystems and economies alike.\"",
    "According to the text, climate change:",
    [
      "will affect the planet only in the far future",
      "is currently transforming natural and economic systems",
      "has no measurable impact on economies",
      "is a hypothesis debated by scientists",
      "affects only tropical regions",
    ],
    1,
    "The text explicitly states that climate change is a \"present reality\" reshaping \"ecosystems and economies\".",
    "unanswered", false,
  ),
  make(
    "q-2022-esp-09", 9, 2022, "Espanhol", "Comprensión lectora", "Espanhol",
    "\"La lectura no solo entretiene: también amplía nuestra visión del mundo y agudiza el pensamiento crítico.\"",
    "Según el texto, la lectura:",
    [
      "sirve únicamente para el entretenimiento",
      "reemplaza la educación formal",
      "expande la perspectiva y desarrolla el pensamiento crítico",
      "es una actividad exclusiva de académicos",
      "carece de importancia en la sociedad actual",
    ],
    2,
    "El texto afirma que la lectura amplía la visión del mundo y agudiza el pensamiento crítico.",
    "correct", true,
  ),
  make(
    "q-2024-geo-10", 10, 2024, "Geografia", "Urbanização", "Português",
    "O processo de metropolização no Brasil intensificou-se a partir da segunda metade do século XX.",
    "Uma consequência direta desse processo é:",
    [
      "Redução das desigualdades socioespaciais",
      "Formação de periferias e conurbação entre municípios",
      "Diminuição da pressão sobre recursos hídricos urbanos",
      "Desaparecimento das favelas nas grandes cidades",
      "Homogeneização da distribuição de renda",
    ],
    1,
    "A metropolização gera conurbação e periferias extensas, aprofundando desigualdades intraurbanas.",
    "unanswered", false,
  ),
  make(
    "q-2021-fil-11", 11, 2021, "Filosofia", "Ética contemporânea", "Português",
    "Para Hannah Arendt, o mal pode se manifestar de forma \"banal\" quando indivíduos comuns deixam de refletir sobre suas ações.",
    "Essa tese foi desenvolvida por Arendt ao analisar:",
    [
      "O julgamento de Sócrates",
      "A Revolução Francesa",
      "O julgamento de Adolf Eichmann em Jerusalém",
      "A Guerra do Peloponeso",
      "A queda do Muro de Berlim",
    ],
    2,
    "A tese da \"banalidade do mal\" foi formulada em Eichmann em Jerusalém (1963), sobre o julgamento do oficial nazista.",
    "unanswered", false,
  ),
  make(
    "q-2023-mat-12", 12, 2023, "Matemática", "Probabilidade", "Português",
    "Um dado honesto de 6 faces é lançado duas vezes consecutivas.",
    "Qual é a probabilidade de a soma dos resultados ser igual a 7?",
    ["1/12", "1/9", "1/6", "1/4", "1/3"],
    2,
    "Existem 6 pares (1,6),(2,5),(3,4),(4,3),(5,2),(6,1) em 36 possibilidades: 6/36 = 1/6.",
    "unanswered", false,
  ),
];
