const civicQuotes = [
  'A cleaner street begins with the wrapper we choose not to drop.',
  'Public spaces belong to all of us; care for them like home.',
  'Signal pehle, safar baad mein — patience keeps everyone safer.',
  'Every drop saved today keeps tomorrow flowing.',
  'A helpful neighbour can turn a difficult day around.',
  'Report a problem with care; clear details help good work begin.',
  'Kachra dustbin mein, shehar dil ke kareeb.',
  'Respect the road: slow down, look twice, let people cross.',
  'छोटी-सी सफ़ाई, पूरे मोहल्ले की भलाई।',
  'Plant kindness where you live, and community will grow.',
  'Shared walls, parks, and benches deserve our shared respect.',
  'Paani bachao, kal ko muskurane do.',
  'A quiet street is a kindness we give each other.',
  'Before you pass by a concern, consider whether you can help.',
  'सड़क सबकी है—नियम भी सबके लिए हैं।',
  'One thoughtful report can guide a whole team toward a fix.',
  'Keep drains clear; a little care can prevent a lot of trouble.',
  'Neighbourhood tab banta hai jab hum ek doosre ka khayal rakhte hain.',
  'Take only memories from the park; leave it ready for the next family.',
  'Fixing starts with noticing, and noticing starts with caring.',
  'पानी की हर बूँद अनमोल है—इसे बेवजह न बहाएँ।',
  'A safer crossing starts when drivers make room for people.',
  'Use public property gently; it serves the next person too.',
  'Apna shehar, apni zimmedari — care shows in everyday choices.',
  'Listen to your neighbours; their perspective can reveal the solution.',
  'Clean streets are made by many small choices, not one big promise.',
  'गलती दिखे तो सम्मान से बताएँ, सुधार का रास्ता बनाएँ।',
  'A better block is built by people who show up for one another.',
];

export const getDailyCivicQuoteIndex = (date = new Date()) => {
  const dateKey = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  let hash = 0;
  for (const character of dateKey) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return hash % civicQuotes.length;
};

export default civicQuotes;
