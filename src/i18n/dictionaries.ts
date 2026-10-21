import type { LanguageCode } from "@/lib/constants";

// UI chrome strings for the citizen app, localized in all three languages.
// (Answer content is localized at query time by the RAG pipeline.)
export interface Dictionary {
  appName: string;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  browseHeading: string;
  popularHeading: string;
  askPlaceholder: string;
  askButton: string;
  asking: string;
  answerHeading: string;
  stepsHeading: string;
  documentsHeading: string;
  feesHeading: string;
  notesHeading: string;
  sourcesHeading: string;
  lastVerified: string;
  autoTranslatedNotice: string;
  suggestedHeading: string;
  feedbackPrompt: string;
  thanksFeedback: string;
  noInfoHeading: string;
  errorGeneric: string;
  emptyAnswerHint: string;
  disclaimer: string;
  officerLogin: string;
  languageLabel: string;
  newChat: string;
  history: string;
  noHistory: string;
}

export const dictionaries: Record<LanguageCode, Dictionary> = {
  en: {
    appName: "InfoAI.LK",
    tagline: "Your guide to Sri Lankan government services",
    heroTitle: "Your guide to Sri Lankan government services",
    heroSubtitle: "Type a question below or pick one to get started.",
    browseHeading: "Browse by service",
    popularHeading: "Popular questions",
    askPlaceholder: "Ask about a government service or procedure…",
    askButton: "Ask",
    asking: "Searching official records…",
    answerHeading: "Answer",
    stepsHeading: "Steps to apply",
    documentsHeading: "Documents required",
    feesHeading: "Fees and processing times",
    notesHeading: "Good to know",
    sourcesHeading: "Sources",
    lastVerified: "Last verified",
    autoTranslatedNotice: "Auto-translated — verify critical details.",
    suggestedHeading: "Common questions",
    feedbackPrompt: "Was this helpful?",
    thanksFeedback: "Thank you for your feedback.",
    noInfoHeading: "No information yet",
    errorGeneric: "Something went wrong. Please try again.",
    emptyAnswerHint: "Type a question above to get started.",
    disclaimer:
      "Answers are drawn from official government sources only. Always confirm with the relevant department.",
    officerLogin: "Officer login",
    languageLabel: "Language",
    newChat: "New chat",
    history: "History",
    noHistory: "No past questions yet.",
  },
  si: {
    appName: "InfoAI.LK",
    tagline: "ශ්‍රී ලංකා රාජ්‍ය සේවා සඳහා ඔබේ මාර්ගෝපදේශකයා",
    heroTitle: "ශ්‍රී ලංකා රාජ්‍ය සේවා සඳහා ඔබේ මාර්ගෝපදේශකයා",
    heroSubtitle: "පහතින් ප්‍රශ්නයක් ටයිප් කරන්න, නැතහොත් එකක් තෝරන්න.",
    browseHeading: "සේවාව අනුව පිරික්සන්න",
    popularHeading: "ජනප්‍රිය ප්‍රශ්න",
    askPlaceholder: "රාජ්‍ය සේවාවක් හෝ ක්‍රියාපටිපාටියක් ගැන විමසන්න…",
    askButton: "විමසන්න",
    asking: "නිල වාර්තා සොයමින්…",
    answerHeading: "පිළිතුර",
    stepsHeading: "අයදුම් කිරීමේ පියවර",
    documentsHeading: "අවශ්‍ය ලේඛන",
    feesHeading: "ගාස්තු සහ සැකසීමේ කාලය",
    notesHeading: "දැනගැනීම වැදගත්",
    sourcesHeading: "මූලාශ්‍ර",
    lastVerified: "අවසන් වරට තහවුරු කළේ",
    autoTranslatedNotice:
      "ස්වයංක්‍රීයව පරිවර්තනය කර ඇත — වැදගත් තොරතුරු තහවුරු කරගන්න.",
    suggestedHeading: "පොදු ප්‍රශ්න",
    feedbackPrompt: "මෙය ප්‍රයෝජනවත් වූවාද?",
    thanksFeedback: "ඔබේ ප්‍රතිපෝෂණයට ස්තූතියි.",
    noInfoHeading: "තවම තොරතුරු නැත",
    errorGeneric: "යම් දෝෂයක් සිදු විය. කරුණාකර නැවත උත්සාහ කරන්න.",
    emptyAnswerHint: "ආරම්භ කිරීමට ඉහත ප්‍රශ්නයක් ටයිප් කරන්න.",
    disclaimer:
      "පිළිතුරු ලබා දෙනුයේ නිල රාජ්‍ය මූලාශ්‍රවලින් පමණි. වැදගත් තොරතුරු අදාළ දෙපාර්තමේන්තුව සමඟ සැම විටම තහවුරු කරගන්න.",
    officerLogin: "නිලධාරී පිවිසුම",
    languageLabel: "භාෂාව",
    newChat: "නව සංවාදය",
    history: "ඉතිහාසය",
    noHistory: "තවම පෙර ප්‍රශ්න නැත.",
  },
  ta: {
    appName: "InfoAI.LK",
    tagline: "இலங்கை அரசு சேவைகளுக்கான உங்கள் வழிகாட்டி",
    heroTitle: "இலங்கை அரசு சேவைகளுக்கான உங்கள் வழிகாட்டி",
    heroSubtitle: "கீழே ஒரு கேள்வியைத் தட்டச்சு செய்யவும், அல்லது ஒன்றைத் தேர்ந்தெடுக்கவும்.",
    browseHeading: "சேவை வாரியாகப் பார்க்கவும்",
    popularHeading: "பிரபலமான கேள்விகள்",
    askPlaceholder: "ஒரு அரசு சேவை அல்லது நடைமுறை பற்றி கேளுங்கள்…",
    askButton: "கேள்",
    asking: "அதிகாரப்பூர்வ பதிவுகளைத் தேடுகிறது…",
    answerHeading: "பதில்",
    stepsHeading: "விண்ணப்பிக்கும் படிகள்",
    documentsHeading: "தேவையான ஆவணங்கள்",
    feesHeading: "கட்டணங்கள் மற்றும் செயலாக்க நேரம்",
    notesHeading: "தெரிந்துகொள்ள வேண்டியவை",
    sourcesHeading: "ஆதாரங்கள்",
    lastVerified: "கடைசியாக சரிபார்க்கப்பட்டது",
    autoTranslatedNotice:
      "தானாக மொழிபெயர்க்கப்பட்டது — முக்கிய விவரங்களைச் சரிபார்க்கவும்.",
    suggestedHeading: "பொதுவான கேள்விகள்",
    feedbackPrompt: "இது உதவிகரமாக இருந்ததா?",
    thanksFeedback: "உங்கள் கருத்துக்கு நன்றி.",
    noInfoHeading: "இன்னும் தகவல் இல்லை",
    errorGeneric: "ஏதோ தவறு நடந்தது. மீண்டும் முயற்சிக்கவும்.",
    emptyAnswerHint: "தொடங்க மேலே ஒரு கேள்வியைத் தட்டச்சு செய்யவும்.",
    disclaimer:
      "பதில்கள் அதிகாரப்பூர்வ அரச ஆதாரங்களிலிருந்து மட்டுமே வழங்கப்படுகின்றன. முக்கிய விவரங்களை தொடர்புடைய திணைக்களத்துடன் எப்போதும் உறுதிப்படுத்தவும்.",
    officerLogin: "அதிகாரி உள்நுழைவு",
    languageLabel: "மொழி",
    newChat: "புதிய உரையாடல்",
    history: "வரலாறு",
    noHistory: "இன்னும் முந்தைய கேள்விகள் இல்லை.",
  },
};

export function getDictionary(lang: LanguageCode): Dictionary {
  return dictionaries[lang] ?? dictionaries.en;
}
