import { walk } from 'zimmerframe';
import type * as estree from 'estree';

/**
 * Recursively renames identifiers within a binding pattern.
 */
function renamePattern(node: estree.Node, map: Record<string, string>): estree.Node {
    if (node.type === 'Identifier') {
        return map[node.name] ? { ...node, name: map[node.name] } : node;
    }
    if (node.type === 'AssignmentPattern') {
        const newLeft = renamePattern(node.left, map);
        return newLeft !== node.left ? { ...node, left: newLeft as any } : node;
    }
    if (node.type === 'ArrayPattern') {
        let changed = false;
        const newElements = node.elements.map(el => {
            if (!el) return el;
            const newEl = renamePattern(el, map);
            if (newEl !== el) changed = true;
            return newEl as any;
        });
        return changed ? { ...node, elements: newElements } : node;
    }
    if (node.type === 'ObjectPattern') {
        let changed = false;
        const newProps = node.properties.map(prop => {
            if (prop.type === 'RestElement') {
                const newArg = renamePattern(prop.argument, map);
                if (newArg !== prop.argument) {
                    changed = true;
                    return { ...prop, argument: newArg as any };
                }
                return prop;
            }
            const newVal = renamePattern(prop.value, map);
            if (newVal !== prop.value) {
                changed = true;
                return { ...prop, value: newVal as any };
            }
            return prop;
        });
        return changed ? { ...node, properties: newProps } : node;
    }
    if (node.type === 'RestElement') {
        const newArg = renamePattern(node.argument, map);
        return newArg !== node.argument ? { ...node, argument: newArg as any } : node;
    }
    return node;
}

export function applyOverwrites(ast: estree.Node, renameMap: Record<string, string>):estree.Node {
    if (!renameMap || Object.keys(renameMap).length === 0) return ast;

    return walk(ast, null, {
        // ==========================================
        // TARGETS: Bindings & Mutations
        // ==========================================

        VariableDeclarator(node) {
            const newId = renamePattern(node.id, renameMap);
            if (newId !== node.id) {
                return { ...node, id: newId as any };
            }
        },

        FunctionDeclaration(node) {
            let newNode: any = node;
            if (node.id && renameMap[node.id.name]) {
                newNode = { ...newNode, id: { ...node.id, name: renameMap[node.id.name] } };
            }
            // FIX 2: Cast to estree.Pattern to satisfy strict param types
            const newParams = node.params.map(p => renamePattern(p, renameMap) as estree.Pattern);
            if (newParams.some((p, i) => p !== node.params[i])) {
                newNode = { ...newNode, params: newParams };
            }
            return newNode !== node ? newNode : undefined;
        },

        FunctionExpression(node) {
            let newNode: any = node;
            if (node.id && renameMap[node.id.name]) {
                newNode = { ...newNode, id: { ...node.id, name: renameMap[node.id.name] } };
            }
            // FIX 2: Cast to estree.Pattern
            const newParams = node.params.map(p => renamePattern(p, renameMap) as estree.Pattern);
            if (newParams.some((p, i) => p !== node.params[i])) {
                newNode = { ...newNode, params: newParams };
            }
            return newNode !== node ? newNode : undefined;
        },

        ArrowFunctionExpression(node) {
            // FIX 2: Cast to estree.Pattern
            const newParams = node.params.map(p => renamePattern(p, renameMap) as estree.Pattern);
            if (newParams.some((p, i) => p !== node.params[i])) {
                return { ...node, params: newParams };
            }
        },

        ClassDeclaration(node) {
            if (node.id && renameMap[node.id.name]) {
                return { ...node, id: { ...node.id, name: renameMap[node.id.name] } };
            }
        },

        ClassExpression(node) {
            if (node.id && renameMap[node.id.name]) {
                return { ...node, id: { ...node.id, name: renameMap[node.id.name] } };
            }
        },

        CatchClause(node) {
            if (node.param) {
                // FIX 2: Cast to estree.Pattern
                const newParam = renamePattern(node.param, renameMap) as estree.Pattern;
                if (newParam !== node.param) {
                    return { ...node, param: newParam };
                }
            }
        },

        AssignmentExpression(node) {
            let newLeft: estree.Pattern = node.left;
            if (node.left.type === 'Identifier' && renameMap[node.left.name]) {
                newLeft = { ...node.left, name: renameMap[node.left.name] };
            } else if (node.left.type !== 'Identifier') {
                // FIX 2: Cast to estree.Pattern
                const renamed = renamePattern(node.left, renameMap) as estree.Pattern;
                if (renamed !== node.left) newLeft = renamed;
            }
            
            if (newLeft !== node.left) {
                return { ...node, left: newLeft };
            }
        },

        UpdateExpression(node) {
            if (node.argument.type === 'Identifier' && renameMap[node.argument.name]) {
                return { ...node, argument: { ...node.argument, name: renameMap[node.argument.name] } };
            }
        },

        ForInStatement(node) {
            // FIX 1: Explicitly type newLeft and capture node.left to preserve narrowing in callbacks
            let newLeft: estree.Pattern | estree.VariableDeclaration = node.left;
            if (node.left.type === 'Identifier' && renameMap[node.left.name]) {
                newLeft = { ...node.left, name: renameMap[node.left.name] };
            } else if (node.left.type === 'VariableDeclaration') {
                const varDecl = node.left; // Capture for closure
                const newDecls = varDecl.declarations.map(d => {
                    const newId = renamePattern(d.id, renameMap);
                    return newId !== d.id ? { ...d, id: newId as any } : d;
                });
                // Now TypeScript knows varDecl is a VariableDeclaration
                if (newDecls.some((d, i) => d !== varDecl.declarations[i])) {
                    newLeft = { ...varDecl, declarations: newDecls };
                }
            }
            if (newLeft !== node.left) {
                return { ...node, left: newLeft };
            }
        },

        ForOfStatement(node) {
            // FIX 1: Same as ForInStatement
            let newLeft: estree.Pattern | estree.VariableDeclaration = node.left;
            if (node.left.type === 'Identifier' && renameMap[node.left.name]) {
                newLeft = { ...node.left, name: renameMap[node.left.name] };
            } else if (node.left.type === 'VariableDeclaration') {
                const varDecl = node.left; // Capture for closure
                const newDecls = varDecl.declarations.map(d => {
                    const newId = renamePattern(d.id, renameMap);
                    return newId !== d.id ? { ...d, id: newId as any } : d;
                });
                if (newDecls.some((d, i) => d !== varDecl.declarations[i])) {
                    newLeft = { ...varDecl, declarations: newDecls };
                }
            }
            if (newLeft !== node.left) {
                return { ...node, left: newLeft };
            }
        }
    });
}