import ts from "typescript";
import { decodeEntities, isHumanText } from "./humanText";

const JSX_ATTRIBUTES = new Set([
  "placeholder",
  "aria-label",
  "aria-description",
  "aria-placeholder",
  "aria-roledescription",
  "title",
  "alt",
  "label",
  "description",
  "helperText",
  "tooltip",
  "subtitle",
  "heading",
]);

const TOAST_PROPERTIES = new Set(["title", "description", "message"]);


export type UserFacingLiteral = {
  start: number;
  end: number;
  /** English copy, with {{name}} placeholders for template expressions. */
  text: string;
  /** Placeholder name to the original expression source. */
  values: Record<string, string>;
  /** Whitespace kept outside a JSX expression replacement. */
  leading: string;
  trailing: string;
  jsxText: boolean;
};


function isWrapper(node: ts.Node): boolean {
  if (
    ts.isParenthesizedExpression(node) ||
    ts.isAsExpression(node) ||
    ts.isSatisfiesExpression(node) ||
    ts.isTypeAssertionExpression(node) ||
    ts.isNonNullExpression(node)
  ) {
    return true;
  }
  if (ts.isBinaryExpression(node)) {
    return (
      node.operatorToken.kind === ts.SyntaxKind.PlusToken ||
      node.operatorToken.kind === ts.SyntaxKind.BarBarToken ||
      node.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
    );
  }
  return ts.isConditionalExpression(node);
}

function propertyName(node: ts.PropertyAssignment): string | null {
  if (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) {
    return node.name.text;
  }
  return null;
}

function isToastCallee(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression)) return expression.text === "toast";
  if (!ts.isPropertyAccessExpression(expression)) return false;
  if (expression.name.text === "toast") return true;
  return (
    ts.isIdentifier(expression.expression) && expression.expression.text === "toast"
  );
}

function isSkippedCall(node: ts.CallExpression): boolean {
  const expression = node.expression;
  if (ts.isIdentifier(expression)) {
    return ["cn", "clsx", "cva", "require", "format", "track"].includes(
      expression.text,
    );
  }
  if (!ts.isPropertyAccessExpression(expression)) return false;
  const owner = expression.expression;
  if (!ts.isIdentifier(owner)) return false;
  return owner.text === "console" || owner.text === "logger";
}

function hasSkippedAncestor(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (ts.isImportDeclaration(current) || ts.isTypeAliasDeclaration(current)) {
      return true;
    }
    if (ts.isCallExpression(current) && isSkippedCall(current)) return true;
    if (
      ts.isNewExpression(current) &&
      ts.isIdentifier(current.expression) &&
      (current.expression.text === "Error" || current.expression.text === "RegExp")
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function isTranslationKeyArgument(node: ts.Node): boolean {
  const parent = node.parent;
  if (!parent || !ts.isCallExpression(parent)) return false;
  if (parent.arguments[0] !== node) return false;
  const expression = parent.expression;
  if (ts.isIdentifier(expression) && (expression.text === "t" || expression.text === "tKey")) {
    return true;
  }
  return (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "t" &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "i18n"
  );
}

function findJsxAttribute(node: ts.Node): ts.JsxAttribute | null {
  let current: ts.Node | undefined = node.parent;
  while (current && isWrapper(current)) current = current.parent;
  if (current && ts.isJsxExpression(current)) current = current.parent;
  if (current && ts.isJsxAttribute(current)) return current;
  return null;
}

function isJsxChild(node: ts.Node): boolean {
  if (ts.isJsxText(node)) return true;
  let current: ts.Node | undefined = node.parent;
  while (current && isWrapper(current)) current = current.parent;
  if (!current || !ts.isJsxExpression(current)) return false;
  const owner = current.parent;
  return Boolean(
    owner &&
      (ts.isJsxElement(owner) ||
        ts.isJsxFragment(owner) ||
        ts.isJsxSelfClosingElement(owner)),
  );
}

function isToastArgument(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current) {
    if (isWrapper(current)) {
      current = current.parent;
      continue;
    }
    if (ts.isPropertyAssignment(current)) {
      const name = propertyName(current);
      if (!name || !TOAST_PROPERTIES.has(name)) return false;
      current = current.parent;
      continue;
    }
    if (ts.isObjectLiteralExpression(current)) {
      current = current.parent;
      continue;
    }
    if (ts.isCallExpression(current)) return isToastCallee(current.expression);
    return false;
  }
  return false;
}

function functionName(node: ts.Node): string | null {
  if (ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node)) {
    return node.name && ts.isIdentifier(node.name) ? node.name.text : null;
  }
  if (
    (ts.isFunctionExpression(node) || ts.isArrowFunction(node)) &&
    ts.isVariableDeclaration(node.parent) &&
    ts.isIdentifier(node.parent.name)
  ) {
    return node.parent.name.text;
  }
  if (
    (ts.isFunctionExpression(node) || ts.isMethodDeclaration(node)) &&
    ts.isPropertyAssignment(node.parent) &&
    ts.isIdentifier(node.parent.name)
  ) {
    return node.parent.name.text;
  }
  return null;
}

function isLabelReturn(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current && isWrapper(current)) current = current.parent;
  if (!current) return false;
  let fn: ts.Node | undefined;
  if (ts.isReturnStatement(current)) {
    fn = current.parent;
    while (fn && !ts.isFunctionLike(fn)) fn = fn.parent;
  } else if (ts.isArrowFunction(current) && current.body === node) {
    fn = current;
  } else {
    return false;
  }
  if (!fn) return false;
  const name = functionName(fn);
  return Boolean(name && /(Label|Title|Message|Copy|Heading|Text)$/.test(name));
}

function jsxAttributeName(attribute: ts.JsxAttribute): string | null {
  return ts.isIdentifier(attribute.name) ? attribute.name.text : null;
}

export function isUserFacingNode(node: ts.Node, text = ""): boolean {
  if (hasSkippedAncestor(node) || isTranslationKeyArgument(node)) return false;
  const attribute = findJsxAttribute(node);
  if (attribute) {
    const name = jsxAttributeName(attribute);
    return Boolean(name && JSX_ATTRIBUTES.has(name));
  }
  if (isLabelReturn(node)) {
    const sample = text.trim();
    return /\s/.test(sample) || /^[A-Z]/.test(sample);
  }
  return isJsxChild(node) || isToastArgument(node) || isMessageInitializer(node);
}

function isMessageInitializer(node: ts.Node): boolean {
  let current: ts.Node | undefined = node.parent;
  while (current && isWrapper(current)) current = current.parent;
  if (!current || !ts.isVariableDeclaration(current) || !ts.isIdentifier(current.name)) {
    return false;
  }
  return /^(message|description|errorMessage|successMessage|helperText)$/.test(
    current.name.text,
  );
}

function placeholderName(expression: ts.Expression, index: number, used: Set<string>): string {
  let base = `value${index}`;
  if (ts.isIdentifier(expression)) base = expression.text;
  else if (ts.isPropertyAccessExpression(expression) && ts.isIdentifier(expression.name)) {
    base = expression.name.text;
  }
  base = base.replace(/[^A-Za-z0-9_]/g, "") || `value${index}`;
  if (/^[0-9]/.test(base)) base = `value${base}`;
  let name = base;
  let suffix = 2;
  while (used.has(name)) {
    name = `${base}${suffix}`;
    suffix += 1;
  }
  used.add(name);
  return name;
}

function literalFromNode(
  node: ts.Node,
  sourceFile: ts.SourceFile,
): UserFacingLiteral | null {
  if (ts.isJsxText(node)) {
    const raw = node.getText(sourceFile);
    const text = decodeEntities(raw).replace(/\s+/g, " ").trim();
    if (!isHumanText(text) || !isUserFacingNode(node, text)) return null;
    const leading = raw.match(/^\s*/)?.[0] ?? "";
    const trailing = raw.match(/\s*$/)?.[0] ?? "";
    return {
      start: node.getStart(sourceFile),
      end: node.getEnd(),
      text,
      values: {},
      leading,
      trailing,
      jsxText: true,
    };
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    const text = node.text.replace(/\s+/g, " ").trim();
    if (!isHumanText(text) || !isUserFacingNode(node, text)) return null;
    return {
      start: node.getStart(sourceFile),
      end: node.getEnd(),
      text,
      values: {},
      leading: "",
      trailing: "",
      jsxText: false,
    };
  }

  if (!ts.isTemplateExpression(node)) return null;
  const used = new Set<string>();
  const values: Record<string, string> = {};
  let text = node.head.text;
  node.templateSpans.forEach((span, index) => {
    const name = placeholderName(span.expression, index, used);
    values[name] = span.expression.getText(sourceFile);
    text += `{{${name}}}${span.literal.text}`;
  });
  text = text.replace(/\s+/g, " ").trim();
  if (!isHumanText(text.replace(/\{\{[^}]+\}\}/g, "value"))) return null;
  if (!isUserFacingNode(node, text)) return null;
  return {
    start: node.getStart(sourceFile),
    end: node.getEnd(),
    text,
    values,
    leading: "",
    trailing: "",
    jsxText: false,
  };
}

export function collectUserFacingLiterals(
  source: string,
  fileName = "file.tsx",
): UserFacingLiteral[] {
  const sourceFile = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith(".tsx") || fileName.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const found: UserFacingLiteral[] = [];
  const visit = (node: ts.Node) => {
    const literal = literalFromNode(node, sourceFile);
    if (literal) found.push(literal);
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return found;
}

export function extractHardcodedLiterals(source: string, filePath: string): string[] {
  const literals = collectUserFacingLiterals(source, filePath);
  return [...new Set(literals.map((literal) => `${filePath}: ${literal.text}`))].sort();
}

const STRICT_PROPERTIES = new Set([
  "label",
  "description",
  "placeholder",
  "heading",
  "helperText",
  "tooltip",
  "subtitle",
  "actionLabel",
  "emptyTitle",
  "emptyDescription",
]);

const STRICT_VARIABLES = /^(title|label|description|placeholder|heading|panelTitle|panelDescription|actionLabel|emptyTitle|emptyDescription|helperText|tooltip|subtitle)$/;

const STRICT_ATTRIBUTES = new Set(["text", "actionLabel"]);

const LANGUAGE_ENDONYMS = new Set([
  "English",
  "Español",
  "Français",
  "Deutsch",
  "Italiano",
  "Português",
]);

function isStrictLiteralNode(node: ts.Node): boolean {
  if (hasSkippedAncestor(node) || isTranslationKeyArgument(node)) return false;
  const attribute = findJsxAttribute(node);
  if (attribute) {
    const name = jsxAttributeName(attribute);
    return Boolean(name && STRICT_ATTRIBUTES.has(name));
  }
  let current: ts.Node | undefined = node.parent;
  while (current && isWrapper(current)) current = current.parent;
  if (!current) return false;
  if (ts.isVariableDeclaration(current) && ts.isIdentifier(current.name)) {
    return STRICT_VARIABLES.test(current.name.text);
  }
  if (ts.isPropertyAssignment(current)) {
    const name = propertyName(current);
    return Boolean(name && STRICT_PROPERTIES.has(name));
  }
  return false;
}

export function extractStrictLiterals(source: string, filePath: string): string[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      isStrictLiteralNode(node)
    ) {
      const text = node.text.replace(/\s+/g, " ").trim();
      if (
        isHumanText(text) &&
        !isUserFacingNode(node, text) &&
        !/^[a-z][a-zA-Z0-9]*(\.[a-zA-Z0-9_-]+)+$/.test(text) &&
        !LANGUAGE_ENDONYMS.has(text)
      ) {
        found.push(`${filePath}: ${text}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...new Set(found)].sort();
}

export function extractTranslationKeys(source: string, filePath: string): string[] {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith(".tsx") || filePath.endsWith(".jsx")
      ? ts.ScriptKind.TSX
      : ts.ScriptKind.TS,
  );
  const keys: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && !hasSkippedAncestor(node)) {
      const expression = node.expression;
      const isT = ts.isIdentifier(expression) && expression.text === "t";
      const isI18nT =
        ts.isPropertyAccessExpression(expression) &&
        expression.name.text === "t" &&
        ts.isIdentifier(expression.expression) &&
        expression.expression.text === "i18n";
      const first = node.arguments[0];
      if ((isT || isI18nT) && first && ts.isStringLiteral(first) && first.text.includes(".")) {
        keys.push(first.text);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return keys;
}
