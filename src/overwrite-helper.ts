import { walk } from 'zimmerframe';
import type * as estree from 'estree';

/**
 * Recursively renames identifiers within a binding pattern.
 * Mutates properties when mapped to avoid breaking AST traversal paths.
 */
function renamePattern(node: estree.Node, map: Record<string, string>): estree.Node {
    if (node.type === 'Identifier') {
        if (map[node.name]) {
            node.name = map[node.name];
        }
        return node;
    }
    if (node.type === 'AssignmentPattern') {
        renamePattern(node.left, map);
        return node;
    }
    if (node.type === 'ArrayPattern') {
        node.elements.forEach(el => {
            if (el) renamePattern(el, map);
        });
        return node;
    }
    if (node.type === 'ObjectPattern') {
        node.properties.forEach(prop => {
            if (prop.type === 'RestElement') {
                renamePattern(prop.argument, map);
            } else {
                // If it's shorthand like { foo }, renaming the value breaks it unless we decouple it
                if (prop.shorthand && prop.key.type === 'Identifier' && map[prop.key.name]) {
                    prop.shorthand = false; // Turn off shorthand so key stays original, value updates
                }
                renamePattern(prop.value, map);
            }
        });
        return node;
    }
    if (node.type === 'RestElement') {
        renamePattern(node.argument, map);
        return node;
    }
    return node;
}

export function applyOverwrites(ast: estree.Node, renameMap: Record<string, string>): estree.Node {
    if (!renameMap || Object.keys(renameMap).length === 0) return ast;

    // We can walk the AST and apply target modifications directly
    walk(ast, null, {
        VariableDeclarator(node, { next }) {
            renamePattern(node.id, renameMap);
            next(); // Keep walking child nodes (like the initializers!)
        },

        FunctionDeclaration(node, { next }) {
            if (node.id && renameMap[node.id.name]) {
                node.id.name = renameMap[node.id.name];
            }
            node.params.forEach(p => renamePattern(p, renameMap));
            next();
        },

        FunctionExpression(node, { next }) {
            if (node.id && renameMap[node.id.name]) {
                node.id.name = renameMap[node.id.name];
            }
            node.params.forEach(p => renamePattern(p, renameMap));
            next();
        },

        ArrowFunctionExpression(node, { next }) {
            node.params.forEach(p => renamePattern(p, renameMap));
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
                renamePattern(node.param, renameMap);
            }
            next();
        },

        AssignmentExpression(node, { next }) {
            if (node.left.type === 'Identifier') {
                if (renameMap[node.left.name]) {
                    node.left.name = renameMap[node.left.name];
                }
            } else {
                renamePattern(node.left, renameMap);
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
            } else if (node.left.type === 'VariableDeclaration') {
                node.left.declarations.forEach(d => renamePattern(d.id, renameMap));
            }
            next();
        },

        ForOfStatement(node, { next }) {
            if (node.left.type === 'Identifier') {
                if (renameMap[node.left.name]) {
                    node.left.name = renameMap[node.left.name];
                }
            } else if (node.left.type === 'VariableDeclaration') {
                node.left.declarations.forEach(d => renamePattern(d.id, renameMap));
            }
            next();
        }
    });

    return ast;
}
