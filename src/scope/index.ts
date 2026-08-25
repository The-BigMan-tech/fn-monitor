import { NOINIT, DEADZONE } from '../share/const.ts'
import { Variable, Var, Prop } from './variable.ts'
import { create, define } from '../share/util.ts'
import { type SvalPlus } from '../custom-types.ts'

/**
 * Scope simulation class
 */
export default class Scope {
    /**
     * The parent scope along the scope chain
     * @private
     * @readonly
     */
    private readonly parent: Scope | null
    /**
     * To distinguish function scope and block scope
     * The value is true for function scope or false for block scope
     * @private
     * @readonly
     */
    private readonly isolated: boolean

    /**
     * Context simulation object
     * @private
     * @readonly
     */
    private readonly context: { [key: string]: Var } = create(null)

    /**
     * To memoize the object for with-statement context
     * @private
     */
    private withContext: object = create(null)

    public interpreter:SvalPlus | undefined;

    /**The lexical depth of the scope */
    public depth:number;

    public userRoot:{
        /**The lexical depth of where the user's function that resides in the internal generated code starts */
        depth:number | null
    } = Object.create(null);
    
    /**
     * Create a simulated scope
     * @param parent the parent scope along the scope chain (default: null)
     * @param isolated true for function scope or false for block scope (default: false)
    */

    constructor(
        parent: Scope | null,
        isolated: boolean = false,
        interpreter?:SvalPlus
    ) { 
        this.parent = parent
        this.isolated = isolated;

        this.interpreter = interpreter || (parent ? parent.interpreter : undefined);
        this.depth = parent ? parent.depth + 1 : 0;
        this.userRoot.depth = parent ? parent.userRoot.depth : null;
    }


    public hasParent() {
        return this.parent !== null;
    }
    public getParent() {
        return this.parent;
    }
    public get local() {
        return this.context;
    }


    /**
     * Get global scope
     */
    public global(): Scope {
        let scope: Scope = this
        while (scope.parent) {
            scope = scope.parent
        }
        return scope
    }

    /**
     * Find a variable along scope chain
     * @param name variable identifier name
     */
    public find(name: string): Variable | null {
        if (this.context[name]) {
            // The variable locates in the scope
            return this.context[name]
        }
        else if (name in this.withContext) {
            // Find property in with-statement context
            return new Prop(this.withContext, name)
        } 
        else if (this.parent) {
            // Find variable along the scope chain
            return this.parent.find(name)
        }
        else {
            // If enter this branch, the scope will be the global scope
            // And the global scope should have window object
            const win = this.global().find('window')!.get()
            if (name in win) {
                // Find property in window
                return new Prop(win, name)
            }else {
                // Not found
                return null
            }
        }
    }

    /**
     * Declare a var variable
     * @param name variable identifier name
     * @param value variable value
     */
    public var(name: string, value?: any) {
        let scope: Scope = this

        // Find the closest function scope
        while (scope.parent && !scope.isolated) {
            scope = scope.parent
        }

        const variable = scope.context[name]
        if (!variable) {
            scope.context[name] = new Var('var', value === NOINIT ? undefined : value)
        }
        else {
            if (variable.kind === 'var') {
                if (value !== NOINIT) {
                    variable.set(value)
                }
            }else {
                throw new SyntaxError(`Identifier '${name}' has already been declared`)
            }
        }

        if (!scope.parent) {
            const win = scope.find('window')!.get()
            if (value !== NOINIT) {
                define(win, name, { value, writable: true, enumerable: true })
            }
        }
    }

    /**
     * Declare a let variable
     * @param name variable identifier name
     * @param value variable value
     */
    public let(name: string, value: any) {
        const variable = this.context[name]
        if (!variable || variable.get() === DEADZONE) {
            this.context[name] = new Var('let', value)
        } else {
            throw new SyntaxError(`Identifier '${name}' has already been declared`)
        }
    }

    /**
     * Declare a const variable
     * @param name variable identifier name
     * @param value variable value
     */
    public const(name: string, value: any) {
        const variable = this.context[name]
        if (!variable || variable.get() === DEADZONE) {
            this.context[name] = new Var('const', value)
        }else {
            throw new SyntaxError(`Identifier '${name}' has already been declared`)
        }
    }

    /**
     * Declare a function
     * @param name function name
     * @param value function
     */
    public func(name: string, value: any) {
        const variable = this.context[name]
        if (!variable || variable.kind === 'var') {
            this.context[name] = new Var('var', value)
        } else {
            throw new SyntaxError(`Identifier '${name}' has already been declared`)
        }
    }

    /**
     * Memoize the object for with-statement context
     * @param value object
     */
    public with(value: any) {
        // Use Object.keys to check if the value can be converted to object
        if (Object.keys(value)) {
            this.withContext = value
        }
    }
}
