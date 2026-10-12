import { walk } from 'zimmerframe';
import { visit } from "ast-types";
import { EsNode } from './custom-types.ts';

/**
 * Recursively renames identifiers within a binding pattern.
 * Mutates properties when mapped, to avoid breaking AST traversal paths.
 */
function changeName(node: EsNode, map: Record<string, string>): EsNode {
    switch (node.type) {
        case "Identifier":
            if (map[node.name]) {
                node.name = map[node.name];
            }
            return node;
        
        case "AssignmentPattern":
            changeName(node.left, map);
            return node;
        
        case "ArrayPattern":
            node.elements.forEach(element => {
                if (element) {
                    changeName(element, map);
                }
            });
            return node;
        
        case "RestElement":
            changeName(node.argument, map);
            return node;

        case "ObjectPattern": 
            node.properties.forEach(prop => {
                if (prop.type === 'RestElement') {
                    changeName(prop.argument, map);
                    return;
                }
                // If it's shorthand like { foo }, renaming the value breaks it unless we decouple it
                if (prop.shorthand && prop.key.type === 'Identifier' && map[prop.key.name]) {
                    prop.shorthand = false; // Turn off shorthand so key stays original, value updates
                }
                changeName(prop.value, map);
            });
            return node;
        
        default: 
            return node;
    }
}

export function renameVariables(ast: EsNode, renameMap: Record<string, string>): EsNode {
    if (!renameMap || Object.keys(renameMap).length === 0) return ast;

    // We can walk the AST and apply target modifications directly
    walk(ast, null, {
        VariableDeclarator(node, { next }) {
            changeName(node.id, renameMap);
            next(); // Keep walking child nodes (like the initializers!)
        },

        FunctionDeclaration(node, { next }) {
            if (node.id && renameMap[node.id.name]) {
                node.id.name = renameMap[node.id.name];
            }
            node.params.forEach(param => changeName(param, renameMap));
            next();
        },

        FunctionExpression(node, { next }) {
            if (node.id && renameMap[node.id.name]) {
                node.id.name = renameMap[node.id.name];
            }
            node.params.forEach(param => changeName(param, renameMap));
            next();
        },

        ArrowFunctionExpression(node, { next }) {
            node.params.forEach(param => changeName(param, renameMap));
            next();
        },

        ClassDeclaration(node, { next }) {
            if (node.id && renameMap[node.id.name]) {
                node.id.name = renameMap[node.id.name];
            }
            next();
        },

        ClassExpression(node, { next }) {
            if (node.id && renameMap[node.id.name]) {
                node.id.name = renameMap[node.id.name];
            }
            next();
        },

        CatchClause(node, { next }) {
            if (node.param) {
                changeName(node.param, renameMap);
            }
            next();
        },

        AssignmentExpression(node, { next }) {
            if (node.left.type === 'Identifier') {
                if (renameMap[node.left.name]) {
                    node.left.name = renameMap[node.left.name];
                }
            } else {
                changeName(node.left, renameMap);
            }
            next();
        },

        UpdateExpression(node, { next }) {
            if (node.argument.type === 'Identifier' && renameMap[node.argument.name]) {
                node.argument.name = renameMap[node.argument.name];
            }
            next();
        },

        ForInStatement(node, { next }) {
            if (node.left.type === 'Identifier') {
                if (renameMap[node.left.name]) {
                    node.left.name = renameMap[node.left.name];
                }
            }else if (node.left.type === 'VariableDeclaration') {
                node.left.declarations.forEach(d => changeName(d.id, renameMap));
            }
            next();
        },

        ForOfStatement(node, { next }) {
            if (node.left.type === 'Identifier') {
                if (renameMap[node.left.name]) {
                    node.left.name = renameMap[node.left.name];
                }
            }else if (node.left.type === 'VariableDeclaration') {
                node.left.declarations.forEach(d => changeName(d.id, renameMap));
            }
            next();
        }
    });

    return ast;
}

/**
 * Recursively strips dead identifiers out of a binding pattern, mutating it in place.
 * 
 * @returns `true` if the pattern is now completely empty and the entire binding should be pruned.
 *          `false` if at least one live binding remains.
 */
function pruneBindingPattern(node: EsNode, deadIdentifiers: Set<string>): boolean {
    switch (node.type) {
        case "Identifier":
            return deadIdentifiers.has(node.name);

        case "AssignmentPattern":
            return pruneBindingPattern(node.left, deadIdentifiers);

        case "RestElement":
            return pruneBindingPattern(node.argument, deadIdentifiers);

        case "ArrayPattern": {
            let survived = false;
            node.elements = node.elements.map(element => {
                if (element === null) return null; // Preserve holes!
                if (pruneBindingPattern(element, deadIdentifiers)) {
                    return null; // Dead element becomes a hole
                }
                survived = true;
                return element;
            }) as typeof node.elements;
            return !survived;
        }

        case "ObjectPattern": {
            const kept = node.properties.filter((prop) =>
                prop.type === "RestElement"
                    ? !pruneBindingPattern(prop.argument, deadIdentifiers)
                    : !pruneBindingPattern(prop.value, deadIdentifiers)
            );
            const emptied = kept.length === 0;
            node.properties = kept as typeof node.properties;
            return emptied;
        }

        default:
            return false;
    }
}

/**
 * Removes every statement whose sole purpose was to bind, assign, or update
 * a variable that the rename stage turned dead.
*/
export function purgeVariables<T extends object>(ast: T, deadIdentifiers: Set<string>): T {
    if (deadIdentifiers.size === 0) return ast;

    visit(ast as any, {
        visitVariableDeclaration(path: any) {
            // CRITICAL FIX: Never prune a VariableDeclaration if it is the loop variable.
            // Pruning it would result in invalid syntax like `for ( of items)`.
            // The rename stage already made it a dead variable, so it will safely absorb iterations.
            const parent = path.parentPath;
            const isLoopVariable = parent && 
                (parent.value.type === "ForInStatement" || parent.value.type === "ForOfStatement") && 
                parent.value.left === path.value;

            if (isLoopVariable) {
                this.traverse(path);
                return;
            }

            const kept = path.value.declarations.filter(
                (d: any) => !pruneBindingPattern(d.id, deadIdentifiers)
            );

            if (kept.length === 0) {
                path.prune();
                return false;
            }

            path.value.declarations = kept;
            this.traverse(path);
        },

        visitExpressionStatement(path: any) {
            const expr = path.value.expression;

            if (expr.type === "UpdateExpression") {
                if (expr.argument.type === "Identifier" && deadIdentifiers.has(expr.argument.name)) {
                    path.prune();
                    return false;
                }
            }

            if (expr.type === "AssignmentExpression") {
                if (pruneBindingPattern(expr.left, deadIdentifiers)) {
                    path.prune(); // Takes the right-hand side (and its side effects) with it.
                    return false;
                }
            }

            if (expr.type === "SequenceExpression") {
                const kept = expr.expressions.filter((e: any) => {
                    if (e.type !== "AssignmentExpression") return true;
                    return !pruneBindingPattern(e.left, deadIdentifiers);
                });
                
                if (kept.length === 0) {
                    path.prune();
                    return false;
                }
                expr.expressions = kept;
            }

            this.traverse(path);
        },

        visitFunctionDeclaration(path: any) {
            if (path.value.id && deadIdentifiers.has(path.value.id.name)) {
                path.prune();
                return false;
            }
            this.traverse(path);
        },

        visitClassDeclaration(path: any) {
            if (path.value.id && deadIdentifiers.has(path.value.id.name)) {
                path.prune();
                return false;
            }
            this.traverse(path);
        }
    });

    return ast;
}