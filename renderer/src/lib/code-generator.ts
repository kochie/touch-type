/**
 * Template-based code generator for typing practice
 * Generates randomized but syntactically correct code snippets
 */

// Variable name pools
const variableNames = ["i", "j", "k", "n", "x", "y", "count", "index", "size", "len", "temp", "result"];
const functionNames = ["process", "calculate", "compute", "handle", "check", "validate", "parse", "transform"];
const typeNames = ["int", "float", "double", "char", "long", "short"];

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomVarName(): string {
  return randomChoice(variableNames);
}

function randomFuncName(): string {
  return randomChoice(functionNames);
}

function randomType(): string {
  return randomChoice(typeNames);
}

// Indent helper
function indent(code: string, spaces: number = 4): string {
  const pad = " ".repeat(spaces);
  return code.split("\n").map(line => line ? pad + line : line).join("\n");
}

// Template generators for C code
export const cTemplates = {
  forLoop(): string {
    const varName = randomVarName();
    const limit = randomInt(5, 100);
    return `for (int ${varName} = 0; ${varName} < ${limit}; ${varName}++) {
    printf("%d\\n", ${varName});
}`;
  },

  whileLoop(): string {
    const varName = randomVarName();
    const limit = randomInt(5, 50);
    return `int ${varName} = 0;
while (${varName} < ${limit}) {
    printf("%d\\n", ${varName});
    ${varName}++;
}`;
  },

  ifStatement(): string {
    const varName = randomVarName();
    const value = randomInt(0, 100);
    return `if (${varName} > ${value}) {
    printf("Greater\\n");
} else {
    printf("Less or equal\\n");
}`;
  },

  ifElseChain(): string {
    const varName = randomVarName();
    const val1 = randomInt(0, 30);
    const val2 = randomInt(31, 70);
    return `if (${varName} < ${val1}) {
    printf("Low\\n");
} else if (${varName} < ${val2}) {
    printf("Medium\\n");
} else {
    printf("High\\n");
}`;
  },

  switchStatement(): string {
    const varName = randomVarName();
    return `switch (${varName}) {
    case 1:
        printf("One\\n");
        break;
    case 2:
        printf("Two\\n");
        break;
    default:
        printf("Other\\n");
        break;
}`;
  },

  functionDefinition(): string {
    const funcName = randomFuncName();
    const paramType = randomType();
    const paramName = randomVarName();
    const returnType = randomType();
    return `${returnType} ${funcName}(${paramType} ${paramName}) {
    ${returnType} result = ${paramName} * 2;
    return result;
}`;
  },

  voidFunction(): string {
    const funcName = randomFuncName();
    return `void ${funcName}(void) {
    printf("Function called\\n");
}`;
  },

  mainFunction(): string {
    return `int main(void) {
    printf("Hello, World!\\n");
    return 0;
}`;
  },

  mainWithArgs(): string {
    return `int main(int argc, char *argv[]) {
    for (int i = 0; i < argc; i++) {
        printf("%s\\n", argv[i]);
    }
    return 0;
}`;
  },

  structDefinition(): string {
    const type1 = randomType();
    const var1 = randomVarName();
    const type2 = randomType();
    const var2 = randomChoice(variableNames.filter(v => v !== var1));
    return `struct Point {
    ${type1} ${var1};
    ${type2} ${var2};
};`;
  },

  arrayDeclaration(): string {
    const type = randomType();
    const varName = randomVarName();
    const size = randomInt(5, 20);
    return `${type} ${varName}[${size}];
for (int i = 0; i < ${size}; i++) {
    ${varName}[i] = i;
}`;
  },

  pointerExample(): string {
    const type = randomType();
    const varName = randomVarName();
    const ptrName = "p" + varName.charAt(0).toUpperCase() + varName.slice(1);
    const value = randomInt(1, 100);
    return `${type} ${varName} = ${value};
${type} *${ptrName} = &${varName};
printf("%d\\n", *${ptrName});`;
  },

  mallocExample(): string {
    const size = randomInt(10, 100);
    return `int *arr = malloc(${size} * sizeof(int));
if (arr == NULL) {
    return 1;
}
free(arr);`;
  },

  includeHeaders(): string {
    return `#include <stdio.h>
#include <stdlib.h>
#include <string.h>`;
  },

  defineConstant(): string {
    const name = randomChoice(["MAX_SIZE", "BUFFER_SIZE", "DEFAULT_VALUE", "ARRAY_LEN"]);
    const value = randomInt(10, 1000);
    return `#define ${name} ${value}`;
  },

  stringOperation(): string {
    return `char str1[50] = "Hello";
char str2[50] = "World";
strcat(str1, str2);
printf("%s\\n", str1);`;
  },

  fileOperation(): string {
    return `FILE *fp = fopen("data.txt", "r");
if (fp == NULL) {
    printf("Error opening file\\n");
    return 1;
}
fclose(fp);`;
  },
};

// Get all template function names
const templateNames = Object.keys(cTemplates) as (keyof typeof cTemplates)[];

/**
 * Generate a random C code snippet using templates
 */
export function generateCSnippet(): string {
  const templateName = randomChoice(templateNames);
  return cTemplates[templateName]();
}

/**
 * Generate multiple C code snippets
 */
export function generateCSnippets(count: number): string[] {
  const snippets: string[] = [];
  const usedTemplates = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    // Try to avoid repeating templates
    let attempts = 0;
    let templateName: keyof typeof cTemplates;
    
    do {
      templateName = randomChoice(templateNames);
      attempts++;
    } while (usedTemplates.has(templateName) && attempts < 10);
    
    usedTemplates.add(templateName);
    if (usedTemplates.size >= templateNames.length) {
      usedTemplates.clear();
    }
    
    snippets.push(cTemplates[templateName]());
  }
  
  return snippets;
}

/**
 * Generate a combined snippet with multiple elements
 */
export function generateCombinedSnippet(): string {
  const parts: string[] = [];
  
  // Add includes
  parts.push(cTemplates.includeHeaders());
  parts.push("");
  
  // Maybe add a define
  if (Math.random() > 0.5) {
    parts.push(cTemplates.defineConstant());
    parts.push("");
  }
  
  // Add a function or main
  if (Math.random() > 0.5) {
    parts.push(cTemplates.functionDefinition());
    parts.push("");
  }
  
  // Add main
  parts.push(cTemplates.mainFunction());
  
  return parts.join("\n");
}
