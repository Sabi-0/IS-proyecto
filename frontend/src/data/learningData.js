// Datos centralizados para el módulo de aprendizaje

export const coursesData = [
  { id: 'math-01', title: 'Matemáticas Básicas', description: 'Conceptos fundamentales de aritmética y álgebra.', level: 'Básico' },
  { id: 'hist-01', title: 'Historia Universal I', description: 'Desde las primeras civilizaciones hasta la Edad Media.', level: 'Básico' },
  { id: 'sci-01', title: 'Introducción a la Biología', description: 'Principios de la vida y los seres vivos.', level: 'Básico' },
  { id: 'math-02', title: 'Geometría Plana', description: 'Figuras, áreas y perímetros.', level: 'Intermedio' },
];

// Estado inicial de las lecciones (simulando progreso)
// NOTA: Este estado se modificará en memoria por App.js al completar lecciones.
// Para reiniciar el progreso, habría que recargar la página.
export let lessonsData = {
  'math-01': [
    { id: 'm1-l1', title: 'Introducción a los Números', completed: true },
    { id: 'm1-l2', title: 'Suma y Resta', completed: true },
    { id: 'm1-l3', title: 'Multiplicación Básica', completed: false },
    { id: 'm1-l4', title: 'División Simple', completed: false },
  ],
  'hist-01': [
    { id: 'h1-l1', title: 'Mesopotamia', completed: false },
    { id: 'h1-l2', title: 'Antiguo Egipto', completed: false },
    { id: 'h1-l3', title: 'Grecia Clásica', completed: false },
  ],
   'sci-01': [
    { id: 's1-l1', title: 'La Célula', completed: false },
    { id: 's1-l2', title: 'Fotosíntesis', completed: false },
  ],
   'math-02': [
    { id: 'm2-l1', title: 'Puntos y Líneas', completed: false },
    { id: 'm2-l2', title: 'Triángulos', completed: false },
  ],
};

// Contenido simulado para CADA lección
export const lessonContentData = {
    // Matemáticas Básicas
    'm1-l1': { title: 'Introducción a los Números', explanation: 'Los números son la base de todo. Aprende qué son y cómo se usan para contar.', quizQuestions: [ { question: '¿Cuál de estos NO es un número natural?', options: ['0', '1', '5', '100'], answer: '0' }, { question: '¿Para qué usamos los números principalmente?', options: ['Para dibujar', 'Para contar y medir', 'Para cantar', 'Para dormir'], answer: 'Para contar y medir' }] },
    'm1-l2': { title: 'Suma y Resta', explanation: 'Aprende las operaciones básicas de juntar (suma) y quitar (resta) cantidades.', quizQuestions: [ { question: '¿Cuánto es 2 + 3?', options: ['4', '5', '6', '7'], answer: '5' }, { question: '¿Cuánto es 5 - 1?', options: ['3', '4', '5', '6'], answer: '4' }] },
    'm1-l3': { title: 'Multiplicación Básica', explanation: 'La multiplicación es una forma rápida de sumar el mismo número varias veces. Por ejemplo, 3 x 4 es sumar 3 cuatro veces (3+3+3+3=12).', quizQuestions: [
        { question: '¿Cuánto es 2 x 3?', options: ['4', '5', '6', '7'], answer: '6' },
        { question: 'Si tienes 3 cajas con 5 lápices cada una, ¿cuántos lápices tienes en total?', options: ['8', '10', '15', '5'], answer: '15' },
        { question: '¿Qué símbolo usamos para representar "tres"?', options: ['1', '2', '3', '4'], answer: '3' } // Mantenemos esta como ejemplo simple
      ]
    },
    'm1-l4': { title: 'División Simple', explanation: 'La división nos ayuda a repartir una cantidad en partes iguales.', quizQuestions: [ { question: 'Si repartes 6 galletas entre 2 amigos, ¿cuántas le tocan a cada uno?', options: ['2', '3', '4', '6'], answer: '3' }, { question: '¿Cuánto es 10 / 5?', options: ['1', '2', '3', '5'], answer: '2' }] },

    // Historia Universal I
    'h1-l1': { title: 'Mesopotamia', explanation: 'Conoce la "tierra entre ríos", cuna de la escritura y las primeras ciudades.', quizQuestions: [ { question: '¿Entre qué dos ríos se encontraba Mesopotamia?', options: ['Nilo y Amazonas', 'Tigris y Éufrates', 'Ganges y Yangtsé', 'Misisipi y Misuri'], answer: 'Tigris y Éufrates' }] },
    'h1-l2': { title: 'Antiguo Egipto', explanation: 'Descubre los faraones, las pirámides y los misterios del Nilo.', quizQuestions: [ { question: '¿Qué río era vital para la civilización egipcia?', options: ['Amazonas', 'Tigris', 'Nilo', 'Éufrates'], answer: 'Nilo' }] },
    'h1-l3': { title: 'Grecia Clásica', explanation: 'Explora la cuna de la democracia, la filosofía y los Juegos Olímpicos.', quizQuestions: [ { question: '¿En qué ciudad griega nació la democracia?', options: ['Esparta', 'Atenas', 'Corinto', 'Tebas'], answer: 'Atenas' }] },

    // Introducción a la Biología
    's1-l1': { title: 'La Célula', explanation: 'La unidad básica de la vida. Aprende sus partes y funciones.', quizQuestions: [ { question: '¿Cuál es la parte de la célula que contiene la información genética (ADN)?', options: ['Membrana', 'Citoplasma', 'Núcleo', 'Mitocondria'], answer: 'Núcleo' }] },
    's1-l2': { title: 'Fotosíntesis', explanation: 'El proceso por el cual las plantas crean su propio alimento usando la luz solar.', quizQuestions: [ { question: '¿Qué gas absorben las plantas durante la fotosíntesis?', options: ['Oxígeno', 'Dióxido de Carbono', 'Nitrógeno', 'Hidrógeno'], answer: 'Dióxido de Carbono' }] },

    // Geometría Plana
    'm2-l1': { title: 'Puntos y Líneas', explanation: 'Los elementos más básicos de la geometría.', quizQuestions: [ { question: '¿Qué es una línea recta?', options: ['Una sucesión de puntos con curvas', 'Una sucesión infinita de puntos en una dirección', 'Un círculo pequeño', 'Un punto gordo'], answer: 'Una sucesión infinita de puntos en una dirección' }] },
    'm2-l2': { title: 'Triángulos', explanation: 'Figuras de tres lados. Aprende sus tipos y propiedades.', quizQuestions: [ { question: '¿Cuántos lados tiene un triángulo?', options: ['2', '3', '4', '5'], answer: '3' }] },
};
