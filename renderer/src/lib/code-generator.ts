/**
 * Template-based code generator for typing practice.
 * Each language has its own template set; generateSnippet() dispatches by lang.
 */

import { CodeLanguages } from "./settings_hook";

const varNames = ["i", "j", "count", "index", "size", "len", "result", "temp", "value", "total", "sum", "max", "min", "num", "data", "node", "key", "flag", "limit", "offset"];
const funcNames = ["process", "calculate", "compute", "handle", "validate", "parse", "transform", "convert", "filter", "reduce", "fetch", "update", "create", "delete", "search", "sort", "merge", "split", "format", "encode"];
const classNames = ["Manager", "Handler", "Service", "Controller", "Builder", "Factory", "Observer", "Adapter", "Parser", "Encoder"];
const stringVals = ['"hello"', '"world"', '"foo"', '"bar"', '"test"', '"data"', '"name"', '"value"'];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomChoice<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function rVar(): string { return randomChoice(varNames); }
function rFunc(): string { return randomChoice(funcNames); }
function rClass(): string { return randomChoice(classNames); }
function rStr(): string { return randomChoice(stringVals); }
function rVal(): number { return randomInt(1, 100); }

// ─── C ───────────────────────────────────────────────────────────────────────

const cTemplates: Array<() => string> = [
  () => { const v = rVar(), limit = randomInt(5, 100); return `for (int ${v} = 0; ${v} < ${limit}; ${v}++) {\n    printf("%d\\n", ${v});\n}`; },
  () => { const v = rVar(), limit = randomInt(5, 50); return `int ${v} = 0;\nwhile (${v} < ${limit}) {\n    printf("%d\\n", ${v});\n    ${v}++;\n}`; },
  () => { const v = rVar(), val = rVal(); return `if (${v} > ${val}) {\n    printf("Greater\\n");\n} else {\n    printf("Less or equal\\n");\n}`; },
  () => { const f = rFunc(), v = rVar(); return `int ${f}(int ${v}) {\n    int result = ${v} * 2;\n    return result;\n}`; },
  () => `int main(void) {\n    printf("Hello, World!\\n");\n    return 0;\n}`,
  () => { const v = rVar(), size = randomInt(5, 20); return `int ${v}[${size}];\nfor (int i = 0; i < ${size}; i++) {\n    ${v}[i] = i;\n}`; },
  () => { const v = rVar(), val = rVal(); const ptr = "p" + v.charAt(0).toUpperCase() + v.slice(1); return `int ${v} = ${val};\nint *${ptr} = &${v};\nprintf("%d\\n", *${ptr});`; },
  () => { const size = randomInt(10, 100); return `int *arr = malloc(${size} * sizeof(int));\nif (arr == NULL) {\n    return 1;\n}\nfree(arr);`; },
  () => `#include <stdio.h>\n#include <stdlib.h>\n#include <string.h>`,
  () => { const v = rVar(), val1 = randomInt(0, 30), val2 = randomInt(31, 70); return `if (${v} < ${val1}) {\n    printf("Low\\n");\n} else if (${v} < ${val2}) {\n    printf("Medium\\n");\n} else {\n    printf("High\\n");\n}`; },
  () => { const f = rFunc(), v = rVar(), r = rVar(); return `void ${f}(int *${v}, int ${r}) {\n    for (int i = 0; i < ${r}; i++) {\n        ${v}[i] *= 2;\n    }\n}`; },
  () => `typedef struct {\n    int x;\n    int y;\n} Point;\n\nPoint origin = {0, 0};`,
  () => { const v = rVar(); return `char ${v}[256];\nfgets(${v}, sizeof(${v}), stdin);\nprintf("Input: %s", ${v});`; },
  () => `FILE *fp = fopen("data.txt", "r");\nif (fp == NULL) {\n    perror("fopen");\n    return 1;\n}\nfclose(fp);`,
  () => { const f = rFunc(), v = rVar(), n = randomInt(2, 10); return `int ${f}(int ${v}) {\n    if (${v} <= 1) return ${v};\n    return ${f}(${v} - 1) + ${f}(${v} - ${n === 2 ? 2 : 1});\n}`; },
  () => { const v = rVar(), size = randomInt(5, 20); return `int ${v}[${size}] = {0};\nmemset(${v}, 0, sizeof(${v}));\nfor (int i = 0; i < ${size}; i++) {\n    ${v}[i] = rand() % 100;\n}`; },
  () => `int compare(const void *a, const void *b) {\n    return (*(int *)a - *(int *)b);\n}`,
  () => { const v = rVar(), n = randomInt(2, 20); return `int ${v} = 1;\nfor (int i = 1; i <= ${n}; i++) {\n    ${v} *= i;\n}\nprintf("%d! = %d\\n", ${n}, ${v});`; },
  () => { const v = rVar(); return `enum ${v.charAt(0).toUpperCase() + v.slice(1)} {\n    LOW,\n    MEDIUM,\n    HIGH\n};`; },
  () => { const f = rFunc(), v = rVar(); return `char *${f}(const char *${v}) {\n    char *copy = strdup(${v});\n    if (!copy) return NULL;\n    return copy;\n}`; },
  () => `#define MAX(a, b) ((a) > (b) ? (a) : (b))\n#define MIN(a, b) ((a) < (b) ? (a) : (b))`,
  () => { const v = rVar(), n = randomInt(5, 15); return `int ${v}[${n}][${n}];\nfor (int i = 0; i < ${n}; i++) {\n    for (int j = 0; j < ${n}; j++) {\n        ${v}[i][j] = i * ${n} + j;\n    }\n}`; },
  () => { const f = rFunc(); return `int ${f}(int a, int b) {\n    while (b != 0) {\n        int t = b;\n        b = a % b;\n        a = t;\n    }\n    return a;\n}`; },
  () => `pthread_t thread;\npthread_create(&thread, NULL, worker, NULL);\npthread_join(thread, NULL);`,
  () => { const v = rVar(); return `union ${v.charAt(0).toUpperCase() + v.slice(1)} {\n    int i;\n    float f;\n    char c;\n};`; },
];

// ─── JavaScript ──────────────────────────────────────────────────────────────

const jsTemplates: Array<() => string> = [
  () => { const v = rVar(), limit = randomInt(5, 100); return `for (let ${v} = 0; ${v} < ${limit}; ${v}++) {\n    console.log(${v});\n}`; },
  () => { const v = rVar(), limit = randomInt(5, 50); return `let ${v} = 0;\nwhile (${v} < ${limit}) {\n    console.log(${v});\n    ${v}++;\n}`; },
  () => { const f = rFunc(), v = rVar(); return `function ${f}(${v}) {\n    return ${v} * 2;\n}`; },
  () => { const f = rFunc(), v = rVar(); return `const ${f} = (${v}) => {\n    return ${v} * 2;\n};`; },
  () => { const v = rVar(), val = rVal(); return `if (${v} > ${val}) {\n    console.log("Greater");\n} else {\n    console.log("Less or equal");\n}`; },
  () => { const arr = rVar(), size = randomInt(3, 8); const items = Array.from({ length: size }, () => rVal()).join(", "); return `const ${arr} = [${items}];\n${arr}.forEach((item) => {\n    console.log(item);\n});`; },
  () => { const obj = rVar(), k1 = rVar(), k2 = rVar(); return `const ${obj} = {\n    ${k1}: ${rVal()},\n    ${k2}: ${rVal()},\n};\nconsole.log(${obj}.${k1});`; },
  () => { const f = rFunc(), v = rVar(); return `async function ${f}(${v}) {\n    const response = await fetch(${v});\n    return response.json();\n}`; },
  () => { const arr = rVar(); return `const ${arr} = [1, 2, 3, 4, 5];\nconst doubled = ${arr}.map((x) => x * 2);\nconsole.log(doubled);`; },
  () => { const f = rFunc(), v = rVar(); return `function ${f}(${v}) {\n    if (!${v}) {\n        throw new Error("Invalid input");\n    }\n    return ${v};\n}`; },
  () => { const v = rVar(), val1 = randomInt(0, 30), val2 = randomInt(31, 70); return `switch (true) {\n    case ${v} < ${val1}:\n        console.log("Low");\n        break;\n    case ${v} < ${val2}:\n        console.log("Medium");\n        break;\n    default:\n        console.log("High");\n}`; },
  () => { const f = rFunc(), v = rVar(); return `const ${f} = async (${v}) => {\n    try {\n        const data = await ${v}.json();\n        return data;\n    } catch (err) {\n        console.error(err);\n    }\n};`; },
  () => { const cls = rClass(), v = rVar(); return `class ${cls} {\n    constructor(${v}) {\n        this.${v} = ${v};\n    }\n\n    get() {\n        return this.${v};\n    }\n}`; },
  () => { const arr = rVar(); return `const ${arr} = [3, 1, 4, 1, 5, 9, 2, 6];\n${arr}.sort((a, b) => a - b);\nconsole.log(${arr});`; },
  () => { const v = rVar(); return `const ${v} = new Map();\n${v}.set("key1", ${rVal()});\n${v}.set("key2", ${rVal()});\nconsole.log(${v}.get("key1"));`; },
  () => { const v = rVar(), arr = rVar(); return `const ${arr} = [1, 2, 3, 4, 5, 6, 7, 8];\nconst ${v} = ${arr}.filter((x) => x % 2 === 0);\nconsole.log(${v});`; },
  () => { const f = rFunc(), v = rVar(); return `function* ${f}(${v}) {\n    for (let i = 0; i < ${v}; i++) {\n        yield i;\n    }\n}`; },
  () => { const v = rVar(); return `const ${v} = new Promise((resolve, reject) => {\n    setTimeout(() => resolve(${rVal()}), 1000);\n});\n${v}.then(console.log);`; },
  () => { const v = rVar(), f = rFunc(); return `const ${v} = [1, 2, 3, 4, 5];\nconst ${f} = ${v}.reduce((acc, cur) => acc + cur, 0);\nconsole.log(${f});`; },
  () => { const v = rVar(); return `const { ${rVar()}, ${rVar()} } = ${v};\nconst [first, ...rest] = [1, 2, 3, 4];`; },
  () => { const v = rVar(); return `const ${v} = new Set([1, 2, 3, 2, 1]);\nconsole.log([...${v}]);`; },
  () => { const f = rFunc(), v = rVar(); return `const ${f} = (${v} = ${rVal()}) => {\n    return ${v} * ${rVal()};\n};\nconsole.log(${f}());`; },
  () => `const result = fetch("/api/data")\n    .then((res) => res.json())\n    .then((data) => console.log(data))\n    .catch((err) => console.error(err));`,
  () => { const cls = rClass(); return `class ${cls} extends EventTarget {\n    emit(name, detail) {\n        this.dispatchEvent(new CustomEvent(name, { detail }));\n    }\n}`; },
  () => { const v = rVar(); return `const ${v} = {\n    name: "Alice",\n    age: ${rVal()},\n    greet() {\n        return \`Hello, \${this.name}!\`;\n    },\n};`; },
  () => { const f = rFunc(), v = rVar(); return `function ${f}(arr) {\n    if (arr.length <= 1) return arr;\n    const mid = Math.floor(arr.length / 2);\n    const left = ${f}(arr.slice(0, mid));\n    const right = ${f}(arr.slice(mid));\n    return merge(left, right);\n}`; },
  () => { const v = rVar(); return `const ${v} = JSON.parse(localStorage.getItem("data") ?? "{}");\nconsole.log(${v});`; },
  () => { const f = rFunc(); return `const ${f} = (() => {\n    let count = 0;\n    return () => ++count;\n})();\nconsole.log(${f}());`; },
  () => `const [state, setState] = useState(null);\nuseEffect(() => {\n    fetchData().then(setState);\n}, []);`,
  () => { const v = rVar(); return `const ${v} = Object.entries({ a: 1, b: 2, c: 3 })\n    .map(([k, v]) => \`\${k}=\${v}\`)\n    .join("&");\nconsole.log(${v});`; },
];

// ─── Python ──────────────────────────────────────────────────────────────────

const pyTemplates: Array<() => string> = [
  () => { const v = rVar(), limit = randomInt(5, 20); return `for ${v} in range(${limit}):\n    print(${v})`; },
  () => { const v = rVar(), limit = randomInt(5, 50); return `${v} = 0\nwhile ${v} < ${limit}:\n    print(${v})\n    ${v} += 1`; },
  () => { const f = rFunc(), v = rVar(); return `def ${f}(${v}):\n    return ${v} * 2`; },
  () => { const v = rVar(), val = rVal(); return `if ${v} > ${val}:\n    print("Greater")\nelse:\n    print("Less or equal")`; },
  () => { const lst = rVar(), size = randomInt(3, 8); const items = Array.from({ length: size }, () => rVal()).join(", "); return `${lst} = [${items}]\nfor item in ${lst}:\n    print(item)`; },
  () => { const d = rVar(), k1 = rVar(), k2 = rVar(); return `${d} = {\n    "${k1}": ${rVal()},\n    "${k2}": ${rVal()},\n}\nprint(${d}["${k1}"])`; },
  () => { const f = rFunc(), v = rVar(); return `def ${f}(*args):\n    return [${v} * 2 for ${v} in args]`; },
  () => { const v = rVar(), val1 = randomInt(0, 30), val2 = randomInt(31, 70); return `if ${v} < ${val1}:\n    print("Low")\nelif ${v} < ${val2}:\n    print("Medium")\nelse:\n    print("High")`; },
  () => `class Animal:\n    def __init__(self, name):\n        self.name = name\n\n    def speak(self):\n        return f"{self.name} makes a sound"`,
  () => { const lst = rVar(); return `${lst} = list(range(10))\nresult = [x * x for x in ${lst} if x % 2 == 0]\nprint(result)`; },
  () => { const f = rFunc(), v = rVar(); return `def ${f}(${v}, memo={}):\n    if ${v} in memo:\n        return memo[${v}]\n    memo[${v}] = ${v} * 2\n    return memo[${v}]`; },
  () => { const v = rVar(); return `${v} = {x: x ** 2 for x in range(10)}\nprint(${v})`; },
  () => `with open("data.txt", "r") as f:\n    lines = f.readlines()\nprint(len(lines))`,
  () => { const f = rFunc(), v = rVar(); return `def ${f}(${v}=None):\n    if ${v} is None:\n        ${v} = []\n    return ${v}`; },
  () => { const v = rVar(); return `try:\n    ${v} = int(input("Enter a number: "))\nexcept ValueError:\n    print("Invalid input")`; },
  () => { const v = rVar(); return `import json\n\n${v} = {"name": "Alice", "age": ${rVal()}}\nprint(json.dumps(${v}, indent=2))`; },
  () => { const v = rVar(); return `${v} = sorted([3, 1, 4, 1, 5, 9, 2, 6], reverse=True)\nprint(${v})`; },
  () => { const f = rFunc(), v = rVar(); return `@staticmethod\ndef ${f}(${v}):\n    return str(${v}).upper()`; },
  () => { const f = rFunc(); return `def ${f}(n):\n    if n <= 1:\n        return n\n    return ${f}(n - 1) + ${f}(n - 2)`; },
  () => `from collections import defaultdict\n\ncounts = defaultdict(int)\nfor word in ["a", "b", "a", "c", "b"]:\n    counts[word] += 1`,
  () => { const v = rVar(); return `${v} = list(range(1, 11))\neven = list(filter(lambda x: x % 2 == 0, ${v}))\nprint(even)`; },
  () => `import os\n\nfor root, dirs, files in os.walk("."):\n    for f in files:\n        print(os.path.join(root, f))`,
  () => { const cls = rClass(); return `class ${cls}:\n    _instance = None\n\n    @classmethod\n    def get_instance(cls):\n        if cls._instance is None:\n            cls._instance = cls()\n        return cls._instance`; },
  () => { const v = rVar(); return `${v} = [1, 2, 3, 4, 5]\nprint(sum(${v}))\nprint(max(${v}))\nprint(min(${v}))`; },
  () => `from dataclasses import dataclass\n\n@dataclass\nclass Point:\n    x: float\n    y: float`,
  () => { const f = rFunc(), v = rVar(); return `def ${f}(${v}: list[int]) -> int:\n    return sum(x for x in ${v} if x > 0)`; },
  () => `import threading\n\ndef worker():\n    print("Thread running")\n\nt = threading.Thread(target=worker)\nt.start()\nt.join()`,
  () => { const v = rVar(); return `${v} = {"a": 1, "b": 2, "c": 3}\nmerged = {**${v}, "d": 4}\nprint(merged)`; },
  () => `import re\n\npattern = re.compile(r"\\d+")\nresult = pattern.findall("abc 123 def 456")\nprint(result)`,
  () => { const f = rFunc(); return `async def ${f}(url):\n    async with aiohttp.ClientSession() as session:\n        async with session.get(url) as resp:\n            return await resp.json()`; },
];

// ─── Go ──────────────────────────────────────────────────────────────────────

const goTemplates: Array<() => string> = [
  () => { const v = rVar(), limit = randomInt(5, 100); return `for ${v} := 0; ${v} < ${limit}; ${v}++ {\n    fmt.Println(${v})\n}`; },
  () => { const f = rFunc(), v = rVar(); return `func ${f}(${v} int) int {\n    return ${v} * 2\n}`; },
  () => { const v = rVar(), val = rVal(); return `if ${v} > ${val} {\n    fmt.Println("Greater")\n} else {\n    fmt.Println("Less or equal")\n}`; },
  () => `func main() {\n    fmt.Println("Hello, World!")\n}`,
  () => { const v = rVar(), size = randomInt(3, 8); return `${v} := make([]int, ${size})\nfor i := range ${v} {\n    ${v}[i] = i * i\n}`; },
  () => { const v = rVar(), val1 = randomInt(0, 30), val2 = randomInt(31, 70); return `switch {\ncase ${v} < ${val1}:\n    fmt.Println("Low")\ncase ${v} < ${val2}:\n    fmt.Println("Medium")\ndefault:\n    fmt.Println("High")\n}`; },
  () => { const f = rFunc(), v = rVar(); return `func ${f}(${v} int) (int, error) {\n    if ${v} < 0 {\n        return 0, fmt.Errorf("negative: %d", ${v})\n    }\n    return ${v} * 2, nil\n}`; },
  () => { const v = rVar(); return `type ${v.charAt(0).toUpperCase() + v.slice(1)} struct {\n    Value int\n    Name  string\n}`; },
  () => { const f = rFunc(); return `func ${f}(n int) int {\n    if n <= 1 {\n        return n\n    }\n    return ${f}(n-1) + ${f}(n-2)\n}`; },
  () => `ch := make(chan int, 10)\ngo func() {\n    for i := 0; i < 10; i++ {\n        ch <- i\n    }\n    close(ch)\n}()\nfor v := range ch {\n    fmt.Println(v)\n}`,
  () => { const v = rVar(); return `${v} := map[string]int{\n    "a": ${rVal()},\n    "b": ${rVal()},\n}\nfor k, val := range ${v} {\n    fmt.Printf("%s: %d\\n", k, val)\n}`; },
  () => `defer func() {\n    if r := recover(); r != nil {\n        fmt.Println("Recovered:", r)\n    }\n}()`,
  () => { const v = rVar(); return `var wg sync.WaitGroup\nfor i := 0; i < ${randomInt(3, 8)}; i++ {\n    wg.Add(1)\n    go func(${v} int) {\n        defer wg.Done()\n        fmt.Println(${v})\n    }(i)\n}\nwg.Wait()`; },
  () => `type Reader interface {\n    Read(p []byte) (n int, err error)\n}`,
  () => { const f = rFunc(), v = rVar(); return `func ${f}(s []int) []int {\n    result := make([]int, 0, len(s))\n    for _, ${v} := range s {\n        if ${v}%2 == 0 {\n            result = append(result, ${v})\n        }\n    }\n    return result\n}`; },
  () => `ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)\ndefer cancel()`,
  () => { const v = rVar(); return `${v}, err := os.Open("data.txt")\nif err != nil {\n    log.Fatal(err)\n}\ndefer ${v}.Close()`; },
  () => { const f = rFunc(); return `func ${f}[T any](slice []T, pred func(T) bool) []T {\n    result := []T{}\n    for _, v := range slice {\n        if pred(v) {\n            result = append(result, v)\n        }\n    }\n    return result\n}`; },
  () => `mu := sync.Mutex{}\nmu.Lock()\ndefer mu.Unlock()`,
  () => { const v = rVar(); return `${v} := strings.Builder{}\nfor i := 0; i < ${randomInt(3, 8)}; i++ {\n    fmt.Fprintf(&${v}, "item %d\\n", i)\n}\nfmt.Print(${v}.String())`; },
  () => { const f = rFunc(), v = rVar(); return `func ${f}(${v} string) (string, error) {\n    data, err := base64.StdEncoding.DecodeString(${v})\n    if err != nil {\n        return "", err\n    }\n    return string(data), nil\n}`; },
  () => `ticker := time.NewTicker(time.Second)\ndefer ticker.Stop()\nfor t := range ticker.C {\n    fmt.Println(t)\n}`,
  () => { const f = rFunc(); return `func ${f}(a, b []int) []int {\n    seen := make(map[int]bool)\n    for _, v := range a {\n        seen[v] = true\n    }\n    result := []int{}\n    for _, v := range b {\n        if seen[v] {\n            result = append(result, v)\n        }\n    }\n    return result\n}`; },
  () => `http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {\n    fmt.Fprintln(w, "Hello, World!")\n})\nlog.Fatal(http.ListenAndServe(":8080", nil))`,
  () => { const v = rVar(); return `${v} := flag.Int("port", 8080, "server port")\nflag.Parse()\nfmt.Println("Port:", *${v})`; },
];

// ─── Java ────────────────────────────────────────────────────────────────────

const javaTemplates: Array<() => string> = [
  () => { const v = rVar(), limit = randomInt(5, 100); return `for (int ${v} = 0; ${v} < ${limit}; ${v}++) {\n    System.out.println(${v});\n}`; },
  () => { const f = rFunc(), v = rVar(); return `public int ${f}(int ${v}) {\n    return ${v} * 2;\n}`; },
  () => `public static void main(String[] args) {\n    System.out.println("Hello, World!");\n}`,
  () => { const v = rVar(), val = rVal(); return `if (${v} > ${val}) {\n    System.out.println("Greater");\n} else {\n    System.out.println("Less or equal");\n}`; },
  () => { const cls = rClass(), v = rVar(); return `public class ${cls} {\n    private int ${v};\n\n    public ${cls}(int ${v}) {\n        this.${v} = ${v};\n    }\n\n    public int get${v.charAt(0).toUpperCase() + v.slice(1)}() {\n        return ${v};\n    }\n}`; },
  () => { const v = rVar(), size = randomInt(3, 8); return `int[] ${v} = new int[${size}];\nfor (int i = 0; i < ${v}.length; i++) {\n    ${v}[i] = i * i;\n}`; },
  () => { const v = rVar(), val1 = randomInt(0, 30), val2 = randomInt(31, 70); return `if (${v} < ${val1}) {\n    System.out.println("Low");\n} else if (${v} < ${val2}) {\n    System.out.println("Medium");\n} else {\n    System.out.println("High");\n}`; },
  () => { const f = rFunc(); return `public int ${f}(int n) {\n    if (n <= 1) return n;\n    return ${f}(n - 1) + ${f}(n - 2);\n}`; },
  () => `List<String> list = new ArrayList<>();\nlist.add("one");\nlist.add("two");\nlist.forEach(System.out::println);`,
  () => `Map<String, Integer> map = new HashMap<>();\nmap.put("a", 1);\nmap.put("b", 2);\nmap.forEach((k, v) -> System.out.println(k + ": " + v));`,
  () => { const v = rVar(); return `try {\n    int ${v} = Integer.parseInt(input);\n    System.out.println(${v});\n} catch (NumberFormatException e) {\n    System.err.println("Invalid: " + e.getMessage());\n}`; },
  () => `public interface Printable {\n    void print();\n    default void printUpperCase() {\n        System.out.println(toString().toUpperCase());\n    }\n}`,
  () => { const v = rVar(); return `Optional<String> ${v} = Optional.of("hello");\n${v}.map(String::toUpperCase).ifPresent(System.out::println);`; },
  () => `List<Integer> nums = List.of(1, 2, 3, 4, 5);\nint sum = nums.stream()\n    .filter(n -> n % 2 == 0)\n    .mapToInt(Integer::intValue)\n    .sum();`,
  () => { const cls = rClass(); return `public enum ${cls} {\n    PENDING, ACTIVE, COMPLETED, CANCELLED;\n\n    public boolean isTerminal() {\n        return this == COMPLETED || this == CANCELLED;\n    }\n}`; },
  () => `synchronized (lock) {\n    while (queue.isEmpty()) {\n        lock.wait();\n    }\n    return queue.poll();\n}`,
  () => { const f = rFunc(), v = rVar(); return `public static <T extends Comparable<T>> T ${f}(List<T> ${v}) {\n    return ${v}.stream().max(Comparator.naturalOrder()).orElseThrow();\n}`; },
  () => `@FunctionalInterface\npublic interface Transformer<T, R> {\n    R transform(T input);\n}`,
  () => { const v = rVar(); return `CompletableFuture<String> ${v} = CompletableFuture\n    .supplyAsync(() -> "result")\n    .thenApply(String::toUpperCase);\nSystem.out.println(${v}.get());`; },
  () => `record Point(int x, int y) {\n    double distance() {\n        return Math.sqrt(x * x + y * y);\n    }\n}`,
  () => `String result = switch (day) {\n    case MONDAY, FRIDAY -> "Workday";\n    case SATURDAY, SUNDAY -> "Weekend";\n    default -> "Midweek";\n};`,
  () => { const v = rVar(); return `var ${v} = new HashMap<String, List<Integer>>();\n${v}.computeIfAbsent("key", k -> new ArrayList<>()).add(${rVal()});`; },
  () => `try (var stream = Files.lines(Path.of("data.txt"))) {\n    stream.filter(l -> !l.isBlank())\n          .forEach(System.out::println);\n}`,
  () => `@Override\npublic String toString() {\n    return String.format("Point{x=%d, y=%d}", x, y);\n}`,
  () => { const f = rFunc(); return `private static final Logger log = LoggerFactory.getLogger(${f.charAt(0).toUpperCase() + f.slice(1)}.class);\n\nlog.info("Starting process with {} items", count);`; },
];

// ─── Kotlin ──────────────────────────────────────────────────────────────────

const kotlinTemplates: Array<() => string> = [
  () => { const v = rVar(), limit = randomInt(5, 100); return `for (${v} in 0..${limit}) {\n    println(${v})\n}`; },
  () => { const f = rFunc(), v = rVar(); return `fun ${f}(${v}: Int): Int {\n    return ${v} * 2\n}`; },
  () => `fun main() {\n    println("Hello, World!")\n}`,
  () => { const v = rVar(), val = rVal(); return `if (${v} > ${val}) {\n    println("Greater")\n} else {\n    println("Less or equal")\n}`; },
  () => { const v = rVar(); return `data class ${v.charAt(0).toUpperCase() + v.slice(1)}(val value: Int, val name: String)`; },
  () => { const lst = rVar(), size = randomInt(3, 8); const items = Array.from({ length: size }, () => rVal()).join(", "); return `val ${lst} = listOf(${items})\n${lst}.forEach { println(it) }`; },
  () => { const f = rFunc(), v = rVar(); return `val ${f}: (Int) -> Int = { ${v} -> ${v} * 2 }`; },
  () => { const v = rVar(), val1 = randomInt(0, 30), val2 = randomInt(31, 70); return `when {\n    ${v} < ${val1} -> println("Low")\n    ${v} < ${val2} -> println("Medium")\n    else -> println("High")\n}`; },
  () => { const f = rFunc(), v = rVar(); return `fun ${f}(${v}: Int): String = when {\n    ${v} < 0 -> "negative"\n    ${v} == 0 -> "zero"\n    else -> "positive"\n}`; },
  () => { const v = rVar(); return `val ${v} = listOf(1, 2, 3, 4, 5)\n    .filter { it % 2 == 0 }\n    .map { it * it }\nprintln(${v})`; },
  () => { const cls = rClass(); return `sealed class ${cls} {\n    data class Success(val data: String) : ${cls}()\n    data class Error(val message: String) : ${cls}()\n    object Loading : ${cls}()\n}`; },
  () => { const f = rFunc(), v = rVar(); return `fun ${f}(${v}: String?): String {\n    return ${v} ?: "default"\n}`; },
  () => { const v = rVar(); return `val ${v} = mapOf("a" to ${rVal()}, "b" to ${rVal()})\n${v}.forEach { (k, v) -> println("$k: $v") }`; },
  () => { const cls = rClass(), v = rVar(); return `class ${cls} {\n    var ${v}: Int = 0\n        private set\n\n    fun increment() {\n        ${v}++\n    }\n}`; },
  () => `object Singleton {\n    private var count = 0\n\n    fun increment() = ++count\n\n    fun reset() {\n        count = 0\n    }\n}`,
  () => { const f = rFunc(); return `inline fun <reified T> ${f}(json: String): T {\n    return gson.fromJson(json, T::class.java)\n}`; },
  () => { const v = rVar(); return `val ${v} = (1..${randomInt(5, 20)}).sumOf { it * it }\nprintln(${v})`; },
  () => `coroutineScope {\n    launch {\n        delay(1000)\n        println("Done")\n    }\n}`,
  () => { const f = rFunc(), v = rVar(); return `suspend fun ${f}(): Result<String> = runCatching {\n    val ${v} = api.getData()\n    ${v}.body() ?: error("Empty response")\n}`; },
  () => { const v = rVar(); return `val ${v} by lazy {\n    println("Computing...")\n    ${rVal()} * ${rVal()}\n}\nprintln(${v})`; },
  () => { const f = rFunc(); return `fun List<Int>.${f}(): Int {\n    return this.fold(0) { acc, n -> acc + n }\n}`; },
  () => `val result = runCatching { riskyOperation() }\n    .onSuccess { println("OK: $it") }\n    .onFailure { println("Error: ${it.message}") }`,
  () => { const v = rVar(); return `val ${v} = flow {\n    repeat(${randomInt(3, 8)}) {\n        emit(it)\n        delay(100)\n    }\n}\n${v}.collect { println(it) }`; },
  () => `@Composable\nfun Greeting(name: String) {\n    Text(text = "Hello, $name!")\n}`,
  () => { const cls = rClass(); return `interface ${cls} {\n    fun execute(): Boolean\n    fun rollback(): Unit = println("Rolling back")\n}`; },
];

// ─── Swift ───────────────────────────────────────────────────────────────────

const swiftTemplates: Array<() => string> = [
  () => { const v = rVar(), limit = randomInt(5, 100); return `for ${v} in 0..<${limit} {\n    print(${v})\n}`; },
  () => { const f = rFunc(), v = rVar(); return `func ${f}(_ ${v}: Int) -> Int {\n    return ${v} * 2\n}`; },
  () => `print("Hello, World!")`,
  () => { const v = rVar(), val = rVal(); return `if ${v} > ${val} {\n    print("Greater")\n} else {\n    print("Less or equal")\n}`; },
  () => { const v = rVar(); return `struct ${v.charAt(0).toUpperCase() + v.slice(1)} {\n    var value: Int\n    var name: String\n}`; },
  () => { const lst = rVar(), size = randomInt(3, 8); const items = Array.from({ length: size }, () => rVal()).join(", "); return `let ${lst} = [${items}]\n${lst}.forEach { print($0) }`; },
  () => { const v = rVar(), val1 = randomInt(0, 30), val2 = randomInt(31, 70); return `switch ${v} {\ncase ..<${val1}:\n    print("Low")\ncase ..<${val2}:\n    print("Medium")\ndefault:\n    print("High")\n}`; },
  () => { const f = rFunc(), v = rVar(); return `guard let ${v} = ${v}Optional else {\n    return\n}\n${f}(${v})`; },
  () => { const v = rVar(); return `let ${v} = [1, 2, 3, 4, 5]\n    .filter { $0 % 2 == 0 }\n    .map { $0 * $0 }\nprint(${v})`; },
  () => { const cls = rClass(); return `class ${cls} {\n    private var items: [String] = []\n\n    func add(_ item: String) {\n        items.append(item)\n    }\n\n    var count: Int { items.count }\n}`; },
  () => `enum Direction {\n    case north, south, east, west\n\n    var opposite: Direction {\n        switch self {\n        case .north: return .south\n        case .south: return .north\n        case .east: return .west\n        case .west: return .east\n        }\n    }\n}`,
  () => { const f = rFunc(), v = rVar(); return `func ${f}(completion: @escaping (Result<String, Error>) -> Void) {\n    URLSession.shared.dataTask(with: url) { data, _, error in\n        if let error { completion(.failure(error)); return }\n        completion(.success(String(data: data!, encoding: .utf8)!))\n    }.resume()\n}`; },
  () => { const v = rVar(); return `var ${v}: String? = nil\nif let value = ${v} {\n    print(value)\n} else {\n    print("nil")\n}`; },
  () => `protocol Describable {\n    var description: String { get }\n    func describe() -> Void\n}`,
  () => { const f = rFunc(); return `func ${f}<T: Comparable>(_ array: [T]) -> T? {\n    return array.max()\n}`; },
  () => { const v = rVar(); return `let ${v} = (1...${randomInt(5, 20)}).reduce(0, +)\nprint(${v})`; },
  () => `Task {\n    let data = try await fetchData()\n    await MainActor.run {\n        update(with: data)\n    }\n}`,
  () => { const v = rVar(); return `@Published var ${v}: String = ""\n\n$${v}.debounce(for: 0.3, scheduler: RunLoop.main)\n    .sink { print($0) }\n    .store(in: &cancellables)`; },
  () => `extension Array where Element: Numeric {\n    var sum: Element { reduce(0, +) }\n}`,
  () => { const cls = rClass(); return `struct ${cls}: Codable {\n    let id: UUID\n    let name: String\n    let value: Int\n\n    init(name: String, value: Int) {\n        self.id = UUID()\n        self.name = name\n        self.value = value\n    }\n}`; },
  () => `do {\n    let data = try JSONEncoder().encode(model)\n    let json = String(data: data, encoding: .utf8)!\n    print(json)\n} catch {\n    print("Encoding error:", error)\n}`,
  () => { const f = rFunc(), v = rVar(); return `lazy var ${f}: [${v.charAt(0).toUpperCase() + v.slice(1)}] = {\n    return loadItems()\n}()`; },
  () => `DispatchQueue.global(qos: .background).async {\n    let result = heavyWork()\n    DispatchQueue.main.async {\n        update(result)\n    }\n}`,
  () => `@ViewBuilder\nfunc makeBody() -> some View {\n    VStack(spacing: 16) {\n        Text("Title")\n        Divider()\n        Text("Content")\n    }\n}`,
  () => { const v = rVar(); return `let ${v} = Dictionary(grouping: items, by: \\.category)\n${v}.forEach { key, values in\n    print("\\(key): \\(values.count)")\n}`; },
];

// ─── Dispatch ────────────────────────────────────────────────────────────────

const templatesByLang: Record<CodeLanguages, Array<() => string>> = {
  [CodeLanguages.C]: cTemplates,
  [CodeLanguages.JAVASCRIPT]: jsTemplates,
  [CodeLanguages.PYTHON]: pyTemplates,
  [CodeLanguages.GO]: goTemplates,
  [CodeLanguages.JAVA]: javaTemplates,
  [CodeLanguages.KOTLIN]: kotlinTemplates,
  [CodeLanguages.SWIFT]: swiftTemplates,
};

export function generateSnippet(lang: CodeLanguages): string {
  const templates = templatesByLang[lang] ?? cTemplates;
  return randomChoice(templates)();
}

export function generateSnippets(lang: CodeLanguages, count: number): string[] {
  const templates = templatesByLang[lang] ?? cTemplates;
  const used = new Set<number>();
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    let idx: number;
    let attempts = 0;
    do {
      idx = Math.floor(Math.random() * templates.length);
      attempts++;
    } while (used.has(idx) && attempts < 10);

    used.add(idx);
    if (used.size >= templates.length) used.clear();
    result.push(templates[idx]());
  }

  return result;
}

// Legacy exports kept for any direct callers
export function generateCSnippet(): string { return generateSnippet(CodeLanguages.C); }
export function generateCSnippets(count: number): string[] { return generateSnippets(CodeLanguages.C, count); }
