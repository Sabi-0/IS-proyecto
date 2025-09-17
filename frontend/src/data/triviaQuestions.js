// --- LA LÍNEA CLAVE ---
// Usamos "export const" para que pueda ser importado con llaves {} en App.js.
export const triviaData = {
  Ciencia: [
    {
      question: "¿Cuál es el planeta más grande del sistema solar?",
      options: ["Tierra", "Júpiter", "Marte", "Saturno"],
      answer: "Júpiter",
    },
    {
      question: "¿Qué gas es esencial para la respiración?",
      options: ["Nitrógeno", "Oxígeno", "Dióxido de Carbono", "Hidrógeno"],
      answer: "Oxígeno",
    },
  ],
  Historia: [
    {
      question: "¿En qué año comenzó la Segunda Guerra Mundial?",
      options: ["1939", "1941", "1945", "1914"],
      answer: "1939",
    },
    {
      question: "¿Quién fue el primer presidente de los Estados Unidos?",
      options: ["Abraham Lincoln", "Thomas Jefferson", "George Washington", "John Adams"],
      answer: "George Washington",
    },
  ],
  Deportes: [
    {
      question: "¿Cuántos jugadores tiene un equipo de fútbol en el campo?",
      options: ["9", "10", "11", "12"],
      answer: "11",
    },
    {
      question: "¿En qué deporte se utiliza una raqueta y una pelota con plumas?",
      options: ["Tenis", "Bádminton", "Squash", "Ping Pong"],
      answer: "Bádminton",
    },
  ],
};