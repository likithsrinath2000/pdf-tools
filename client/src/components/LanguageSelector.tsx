import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Globe, Check } from "lucide-react";

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
}

const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ml", name: "Malayalam", nativeName: "മലയാളം", flag: "🇮🇳" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "or", name: "Odia", nativeName: "ଓଡ଼ିଆ", flag: "🇮🇳" },
  { code: "as", name: "Assamese", nativeName: "অসমীয়া", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", nativeName: "اردو", flag: "🇮🇳" },
  { code: "sa", name: "Sanskrit", nativeName: "संस्कृतम्", flag: "🇮🇳" },
];

const OTHER_LANGUAGES: Language[] = [
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "zh-CN", name: "Chinese (Simplified)", nativeName: "简体中文", flag: "🇨🇳" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦" },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇧🇷" },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺" },
];

declare global {
  interface Window {
    google?: {
      translate?: {
        TranslateElement?: any;
      };
    };
    googleTranslateElementInit?: () => void;
  }
}

// Helper to clear all Google Translate cookies
const clearGoogleTranslateCookies = () => {
  const hostname = window.location.hostname;
  const hostParts = hostname.split(".");
  const domains = ["", hostname];
  
  for (let i = 0; i < hostParts.length; i++) {
    domains.push("." + hostParts.slice(i).join("."));
  }
  
  domains.forEach(domain => {
    ["/", ""].forEach(path => {
      const domainPart = domain ? `; domain=${domain}` : "";
      const pathPart = path ? `; path=${path}` : "";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC${pathPart}${domainPart}`;
    });
  });
};

export function LanguageSelector() {
  const [currentLang, setCurrentLang] = useState("en");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem("preferredLanguage") || "en";
    setCurrentLang(savedLang);

    // CRITICAL: If user wants English, clear cookies BEFORE loading Google Translate
    if (savedLang === "en") {
      clearGoogleTranslateCookies();
    }

    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);

      window.googleTranslateElementInit = () => {
        // Clear cookies again right when Google Translate initializes (if English)
        if (savedLang === "en") {
          clearGoogleTranslateCookies();
        }
        
        new window.google!.translate!.TranslateElement(
          {
            pageLanguage: "en",
            includedLanguages: [...LANGUAGES, ...OTHER_LANGUAGES].map(l => l.code).join(","),
            autoDisplay: false,
            layout: 0,
          },
          "google_translate_element"
        );
        setIsLoaded(true);
        
        if (savedLang !== "en") {
          setTimeout(() => translatePage(savedLang), 500);
        }
      };
    } else {
      setIsLoaded(true);
    }

    const style = document.createElement("style");
    style.textContent = `
      .goog-te-banner-frame, .goog-te-balloon-frame { display: none !important; }
      .goog-te-menu-value { display: none !important; }
      .goog-te-gadget { display: none !important; }
      #google_translate_element { position: absolute; left: -9999px; visibility: hidden; }
      .skiptranslate { display: none !important; }
      body { top: 0 !important; }
      .goog-tooltip { display: none !important; }
      .goog-tooltip:hover { display: none !important; }
      .goog-text-highlight { background-color: transparent !important; box-shadow: none !important; }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  const translatePage = (langCode: string) => {
    const frame = document.querySelector(".goog-te-menu-frame") as HTMLIFrameElement;
    if (frame) {
      const frameDoc = frame.contentDocument || frame.contentWindow?.document;
      if (frameDoc) {
        const langItems = frameDoc.querySelectorAll(".goog-te-menu2-item span.text");
        langItems.forEach((item: any) => {
          if (item.textContent.toLowerCase().includes(getLanguageName(langCode).toLowerCase())) {
            item.click();
          }
        });
      }
    }

    const select = document.querySelector(".goog-te-combo") as HTMLSelectElement;
    if (select) {
      select.value = langCode;
      select.dispatchEvent(new Event("change"));
    }

    setCurrentLang(langCode);
    localStorage.setItem("preferredLanguage", langCode);
  };

  const getLanguageName = (code: string): string => {
    const lang = [...LANGUAGES, ...OTHER_LANGUAGES].find(l => l.code === code);
    return lang?.name || code;
  };

  const getCurrentLanguage = (): Language => {
    return [...LANGUAGES, ...OTHER_LANGUAGES].find(l => l.code === currentLang) || LANGUAGES[0];
  };

  const handleLanguageSelect = (lang: Language) => {
    if (lang.code === "en") {
      // Clear all Google Translate cookies
      clearGoogleTranslateCookies();
      
      // Also clear any sessionStorage Google might use
      try {
        Object.keys(sessionStorage).forEach(key => {
          if (key.toLowerCase().includes("goog") || key.toLowerCase().includes("translate")) {
            sessionStorage.removeItem(key);
          }
        });
      } catch (e) {}
      
      // Remove Google Translate elements from DOM
      const elementsToRemove = document.querySelectorAll(
        ".goog-te-banner-frame, .goog-te-menu-frame, .skiptranslate, .goog-te-spinner-pos, #goog-gt-tt, #google-translate-script"
      );
      elementsToRemove.forEach(el => el.remove());
      
      // Reset body/html styles
      document.body.style.top = "";
      document.body.classList.remove("translated-ltr", "translated-rtl");
      document.documentElement.classList.remove("translated-ltr", "translated-rtl");
      
      // Save preference
      setCurrentLang("en");
      localStorage.setItem("preferredLanguage", "en");
      
      // Force full page reload
      setTimeout(() => {
        window.location.href = window.location.pathname + window.location.search;
      }, 50);
    } else {
      translatePage(lang.code);
    }
  };

  const currentLanguage = getCurrentLanguage();

  return (
    <>
      <div id="google_translate_element" style={{ position: "absolute", left: "-9999px" }} />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 text-sm font-medium hover:bg-slate-100"
            data-testid="button-language-selector"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{currentLanguage.flag} {currentLanguage.nativeName}</span>
            <span className="sm:hidden">{currentLanguage.flag}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto">
          <DropdownMenuLabel className="flex items-center gap-2">
            <span className="text-orange-600">🇮🇳</span> Indian Languages
          </DropdownMenuLabel>
          {LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageSelect(lang)}
              className="flex items-center justify-between cursor-pointer"
              data-testid={`lang-${lang.code}`}
            >
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
                <span className="text-muted-foreground text-xs">({lang.name})</span>
              </span>
              {currentLang === lang.code && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
          
          <DropdownMenuSeparator />
          <DropdownMenuLabel className="flex items-center gap-2">
            <Globe className="h-4 w-4" /> Other Languages
          </DropdownMenuLabel>
          {OTHER_LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleLanguageSelect(lang)}
              className="flex items-center justify-between cursor-pointer"
              data-testid={`lang-${lang.code}`}
            >
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
                <span className="text-muted-foreground text-xs">({lang.name})</span>
              </span>
              {currentLang === lang.code && <Check className="h-4 w-4 text-primary" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
