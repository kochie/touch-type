"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { CodeLanguages, SnippetSource, useSettings } from "./settings_hook";
import { generateCSnippet, generateCSnippets } from "./code-generator";

type CodeContextProps = {
  snippets: string[];
  currentSnippet: string;
  nextSnippet: () => void;
  loading: boolean;
  error: string | null;
};

const CodeContext = createContext<CodeContextProps>({
  snippets: [],
  currentSnippet: "",
  nextSnippet: () => {},
  loading: false,
  error: null,
});

const SNIPPET_DELIMITER = "// SNIPPET";

/**
 * Parse a file containing multiple snippets separated by a delimiter
 */
function parseSnippets(content: string): string[] {
  const snippets = content
    .split(SNIPPET_DELIMITER)
    .map((snippet) => snippet.trim())
    .filter((snippet) => snippet.length > 0);
  
  return snippets;
}

/**
 * Normalize whitespace in a code snippet
 * - Convert tabs to spaces
 * - Remove trailing whitespace from lines
 * - Ensure consistent line endings
 */
function normalizeSnippet(snippet: string, tabWidth: number = 4): string {
  const tabSpaces = " ".repeat(tabWidth);
  
  return snippet
    .replace(/\t/g, tabSpaces)           // Convert tabs to spaces
    .split("\n")
    .map((line) => line.trimEnd())        // Remove trailing whitespace
    .join("\n")
    .trim();                              // Remove leading/trailing empty lines
}

export const CodeProvider = ({ children }: { children: React.ReactNode }) => {
  const settings = useSettings();
  const pathname = usePathname();
  const isCodePage = pathname === "/code";
  const [snippets, setSnippets] = useState<string[]>([]);
  const snippetsLengthRef = useRef(0);
  snippetsLengthRef.current = snippets.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBundledSnippets = useCallback(async () => {
    if (!window.electronAPI?.getCodeSnippets) {
      setError("Code snippet loading is only available in the desktop app.");
      return;
    }
    try {
      setLoading(true);
      setError(null);

      const buffer = await window.electronAPI.getCodeSnippets(settings.codeLang);

      if (!buffer) {
        throw new Error(`Could not load ${settings.codeLang} snippets — file may be missing.`);
      }

      const content = new TextDecoder("utf-8").decode(buffer);
      const parsed = parseSnippets(content);
      const normalized = parsed.map((s) => normalizeSnippet(s, settings.tabWidth));

      setSnippets(normalized);
      setCurrentIndex(0);
    } catch (err) {
      console.error("Error loading bundled snippets:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
      setSnippets([]);
    } finally {
      setLoading(false);
    }
  }, [settings.codeLang, settings.tabWidth]);

  const loadGeneratedSnippets = useCallback(() => {
    setError(null);
    const generated = generateCSnippets(20).map((s) => normalizeSnippet(s, settings.tabWidth));
    setSnippets(generated);
    setCurrentIndex(0);
  }, [settings.tabWidth]);

  const loadFileSnippets = useCallback(async () => {
    if (!settings.customCodePath) {
      setError("No file path specified");
      return;
    }

    if (!window.electronAPI?.loadUserCodeFile) {
      setError("File loading is only available in the desktop app.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const content = await window.electronAPI.loadUserCodeFile(settings.customCodePath);
      
      if (!content) {
        throw new Error("Failed to load file");
      }

      // Check if file has snippet delimiters
      if (content.includes(SNIPPET_DELIMITER)) {
        const parsed = parseSnippets(content);
        const normalized = parsed.map((s) => normalizeSnippet(s, settings.tabWidth));
        setSnippets(normalized);
      } else {
        // Treat entire file as one snippet, or split by function definitions
        const normalized = normalizeSnippet(content, settings.tabWidth);
        // Split by empty lines to create multiple snippets
        const parts = normalized
          .split(/\n\n+/)
          .filter((part) => part.trim().length > 0);
        
        if (parts.length > 1) {
          setSnippets(parts);
        } else {
          // If it's one big chunk, split into smaller sections (roughly 5-8 lines each)
          const lines = normalized.split("\n");
          const chunks: string[] = [];
          let currentChunk: string[] = [];
          
          for (const line of lines) {
            currentChunk.push(line);
            // End chunk at closing braces or after 8 lines
            if ((line.trim() === "}" && currentChunk.length >= 3) || currentChunk.length >= 8) {
              chunks.push(currentChunk.join("\n"));
              currentChunk = [];
            }
          }
          
          if (currentChunk.length > 0) {
            chunks.push(currentChunk.join("\n"));
          }
          
          setSnippets(chunks.length > 0 ? chunks : [normalized]);
        }
      }
      
      setCurrentIndex(0);
    } catch (err) {
      console.error("Error loading file snippets:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [settings.customCodePath, settings.tabWidth]);

  // Load snippets based on source setting
  useEffect(() => {
    if (!settings.codeMode && !isCodePage) {
      return;
    }

    switch (settings.codeSnippetSource) {
      case SnippetSource.BUNDLED:
        loadBundledSnippets();
        break;
      case SnippetSource.GENERATED:
        loadGeneratedSnippets();
        break;
      case SnippetSource.FILE:
        loadFileSnippets();
        break;
      default:
        console.error(`Unknown codeSnippetSource: ${settings.codeSnippetSource}`);
        setError(`Unrecognised snippet source. Please check your settings.`);
    }
  }, [
    settings.codeMode,
    isCodePage,
    settings.codeSnippetSource,
    settings.codeLang,
    settings.customCodePath,
    loadBundledSnippets,
    loadGeneratedSnippets,
    loadFileSnippets,
  ]);

  const nextSnippet = useCallback(() => {
    if (snippetsLengthRef.current === 0) return;

    if (settings.codeSnippetSource === SnippetSource.GENERATED) {
      const newSnippet = normalizeSnippet(generateCSnippet(), settings.tabWidth);
      setSnippets((prev) => [...prev, newSnippet]);
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex((prev) => (prev + 1) % snippetsLengthRef.current);
    }
  }, [settings.codeSnippetSource, settings.tabWidth]);

  const currentSnippet = snippets[currentIndex] || "";

  return (
    <CodeContext.Provider
      value={{
        snippets,
        currentSnippet,
        nextSnippet,
        loading,
        error,
      }}
    >
      {children}
    </CodeContext.Provider>
  );
};

export function useCode() {
  return useContext(CodeContext);
}
