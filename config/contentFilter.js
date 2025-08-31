// Content Filtering System for Projectify
// Designed for users under 18 - School-safe environment

// Comprehensive list of offensive/inappropriate words and phrases
const OFFENSIVE_WORDS = [
  // Profanity and swear words
  'fuck', 'shit', 'bitch', 'ass', 'damn', 'hell',
  'piss', 'cock', 'dick', 'pussy', 'cunt', 'whore',
  'slut', 'bastard', 'motherfucker', 'fucker', 'shithead',
  
  // Hate speech and discrimination
  'nigger', 'faggot', 'dyke', 'retard', 'spic', 'kike',
  'chink', 'gook', 'wetback', 'towelhead', 'sandnigger',
  
  // Violence and threats
  'kill', 'murder', 'suicide', 'bomb', 'terrorist', 'shoot',
  'gun', 'weapon', 'attack', 'fight', 'beat', 'hurt',
  
  // Drugs and alcohol
  'drugs', 'cocaine', 'heroin', 'marijuana', 'weed', 'alcohol',
  'beer', 'wine', 'drunk', 'high', 'stoned', 'addict',
  
  // Sexual content
  'sex', 'porn', 'nude', 'naked', 'boobs', 'tits', 'penis',
  'vagina', 'horny', 'sexy', 'hot', 'attractive',
  
  // Cyberbullying
  'ugly', 'fat', 'stupid', 'idiot', 'moron', 'dumb', 'loser',
  'nerd', 'geek', 'weirdo', 'freak', 'creep', 'stalker'
];

// Contextual phrases that might be inappropriate
const INAPPROPRIATE_PHRASES = [
  'kill yourself', 'go die', 'you suck', 'you\'re ugly',
  'i hate you', 'you\'re stupid', 'shut up', 'fuck off',
  'get lost', 'go away', 'you\'re worthless'
];

// Function to check if text contains offensive content
export const containsOffensiveContent = (text) => {
  if (!text || typeof text !== 'string') return false;
  
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  
  // Check individual words
  for (const word of words) {
    if (OFFENSIVE_WORDS.includes(word)) {
      return { isOffensive: true, reason: 'Contains offensive language', word };
    }
  }
  
  // Check phrases
  for (const phrase of INAPPROPRIATE_PHRASES) {
    if (lowerText.includes(phrase)) {
      return { isOffensive: true, reason: 'Contains inappropriate phrase', phrase };
    }
  }
  
  // Check for leetspeak variations (e.g., f*ck, sh1t)
  const leetspeakPattern = /[f*ck|sh1t|b!tch|@ss|d@mn]/i;
  if (leetspeakPattern.test(text)) {
    return { isOffensive: true, reason: 'Contains leetspeak variations', text };
  }
  
  // Check for excessive punctuation (e.g., !!!, ???)
  const excessivePunctuation = /[!?]{3,}/;
  if (excessivePunctuation.test(text)) {
    return { isOffensive: true, reason: 'Excessive punctuation detected', text };
  }
  
  return { isOffensive: false };
};

// Function to sanitize text (replace offensive words with asterisks)
export const sanitizeText = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  let sanitized = text;
  
  // Replace offensive words with asterisks
  OFFENSIVE_WORDS.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, '*'.repeat(word.length));
  });
  
  // Replace inappropriate phrases
  INAPPROPRIATE_PHRASES.forEach(phrase => {
    const regex = new RegExp(phrase, 'gi');
    sanitized = sanitized.replace(regex, '*'.repeat(phrase.length));
  });
  
  return sanitized;
};

// Function to get content rating (G, PG, PG-13, R)
export const getContentRating = (text) => {
  const result = containsOffensiveContent(text);
  
  if (result.isOffensive) {
    // Count offensive words to determine severity
    const lowerText = text.toLowerCase();
    let offensiveCount = 0;
    
    OFFENSIVE_WORDS.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = lowerText.match(regex);
      if (matches) offensiveCount += matches.length;
    });
    
    if (offensiveCount >= 5) return 'R';
    if (offensiveCount >= 2) return 'PG-13';
    return 'PG';
  }
  
  return 'G';
};

// Function to validate comment before posting
export const validateComment = (text) => {
  const result = containsOffensiveContent(text);
  
  if (result.isOffensive) {
    return {
      isValid: false,
      reason: result.reason,
      suggestion: 'Please review your comment and remove inappropriate language.',
      sanitized: sanitizeText(text)
    };
  }
  
  return {
    isValid: true,
    reason: 'Comment is appropriate',
    sanitized: text
  };
};

export default {
  containsOffensiveContent,
  sanitizeText,
  getContentRating,
  validateComment
};
