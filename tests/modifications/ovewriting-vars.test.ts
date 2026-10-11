import { describe, it, expect } from 'vitest';
import { monitor } from '../../src';

describe('overwrite feature', () => {
    describe('basic variable declarations', () => {
        it('should overwrite a simple variable declaration', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        let x = 10;
                        return x;
                    },
                    overwrite: { x: 30 }
                }
            });
            expect(fn()).toBe(30);
        });

        it('should overwrite a function definition', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        function num() {
                            return 10
                        }
                        return num()
                    },
                    overwrite: { num:()=>30 }
                }
            });
            expect(fn()).toBe(30);
        });

        it('should overwrite a const declaration', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        const x = 10;
                        return x;
                    },
                    overwrite: { x: 50 }
                }
            });
            expect(fn()).toBe(50);
        });

        it('should overwrite multiple variables', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        let x = 10;
                        let y = 20;
                        return x + y;
                    },
                    overwrite: { x: 5, y: 15 }
                }
            });
            expect(fn()).toBe(20);
        });
    });

    describe('function parameters', () => {
        it('should overwrite a function parameter', () => {
            const fn = monitor({
                main: {
                    ref: (x: number) => {
                        return x;
                    },
                    overwrite: { x: 100 }
                }
            });
            expect(fn(10)).toBe(100); // Passed argument is ignored
        });

        it('should overwrite multiple parameters', () => {
            const fn = monitor({
                main: {
                    ref: (a: number, b: number) => {
                        return a + b;
                    },
                    overwrite: { a: 5, b: 10 }
                }
            });
            expect(fn(1, 2)).toBe(15);
        });

        it('should overwrite parameters with destructuring', () => {
            const fn = monitor({
                main: {
                    ref: ({ x, y }: { x: number; y: number }) => {
                        return x + y;
                    },
                    overwrite: { x: 20, y: 30 }
                }
            });
            expect(fn({ x: 1, y: 2 })).toBe(50);
        });
    });

    describe('assignments and updates', () => {
        it('should overwrite assignment expressions', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        let x = 10;
                        x = 20;
                        return x;
                    },
                    overwrite: { x: 100 }
                }
            });
            expect(fn()).toBe(100);
        });

        it('should overwrite update expressions (++)', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        let x = 10;
                        x++;
                        return x;
                    },
                    overwrite: { x: 50 }
                }
            });
            expect(fn()).toBe(50);
        });

        it('should overwrite update expressions (--)', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        let x = 10;
                        x--;
                        return x;
                    },
                    overwrite: { x: 50 }
                }
            });
            expect(fn()).toBe(50);
        });
    });

    describe('destructuring patterns', () => {
        it('should overwrite object destructuring', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        const obj = { x: 10, y: 20 };
                        const { x, y } = obj;
                        return x + y;
                    },
                    overwrite: { x: 100 }
                }
            });
            expect(fn()).toBe(120); // x is overwritten to 100, y stays 20
        });

        it('should overwrite array destructuring', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        const arr = [10, 20];
                        const [x, y] = arr;
                        return x + y;
                    },
                    overwrite: { x: 50 }
                }
            });
            expect(fn()).toBe(70); // x is overwritten to 50, y stays 20
        });

        it('should overwrite destructuring with default values', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        const obj = {};
                        const { x = 10 } = obj as any;
                        return x;
                    },
                    overwrite: { x: 100 }
                }
            });
            expect(fn()).toBe(100);
        });
    });

    describe('guardrails (what should NOT be overwritten)', () => {
        it('should NOT overwrite member expression properties or object literal keys', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        const obj = { x: 10 };
                        return obj.x;
                    },
                    overwrite: { x: 100 }
                }
            });
            expect(fn()).toBe(10); // obj.x should remain 10
        });
    });

    describe('interaction with captures', () => {
        it('should prioritize overwrite over captures', () => {
            let x;
            const fn = monitor({
                main: {
                    ref: () => {
                        return x;
                    },
                    captures: { x: 50 },
                    overwrite: { x: 100 }
                }
            });
            expect(fn()).toBe(100); // overwrite wins
        });

        it('should use captures when overwrite is not specified', () => {
            let x;
            const fn = monitor({
                main: {
                    ref: () => {
                        return x;
                    },
                    captures: { x: 50 }
                }
            });
            expect(fn()).toBe(50); // Internal declaration wins over captures
        });
    });

    describe('nested scopes', () => {
        it('should overwrite variables in nested functions', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        function inner() {
                            let x = 10;
                            return x;
                        }
                        return inner();
                    },
                    overwrite: { x: 100 }
                }
            });
            expect(fn()).toBe(100);
        });
    });

    describe('edge cases', () => {
        it('should handle empty overwrite object', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        let x = 10;
                        return x;
                    },
                    overwrite: {}
                }
            });
            expect(fn()).toBe(10);
        });

        it('should handle undefined overwrite', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        let x = 10;
                        return x;
                    }
                }
            });
            expect(fn()).toBe(10);
        });

        it('should overwrite for-in loop variable', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        let sum = 0;
                        const obj = { a: 1, b: 2 };

                        for (let key in obj) {
                            sum += (obj as any)[key]
                        }
                        return sum
                    },
                    overwrite: {key:'b'}
                }
            });
            expect(fn()).toBe(4);
        });

        it('should overwrite for-of loop variable', () => {
            const fn = monitor({
                main: {
                    ref: () => {
                        let sum = 0;
                        for (let x of [1, 2, 3]) {
                            sum += x
                        }
                        return sum;
                    },
                    overwrite: { x: 10 }
                }
            });
            expect(fn()).toBe(30);
        });
    });
});