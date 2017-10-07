import { IContainer } from '../lib/container.interface';
import { Container } from '../lib/index';

import 'mocha';
import { expect } from 'chai';
import { InjectionToken } from '../lib/index';
import { Inject, Injectable } from '../lib/decorators';
import { LifeTime } from '../lib/interfaces';

/* tslint:disable: no-unused-expression max-classes-per-file*/

describe('Container', () => {

    let container: IContainer;

    beforeEach(() => {
        container = new Container();
    });

    describe('resolve()', () => {
        it('should resolve an instance when registered with a class Literal', () => {
            @Injectable()
            class TestClass {}
            container.register(TestClass);

            const instance = container.resolve(TestClass);
            expect(instance).to.be.ok;
            expect(instance instanceof TestClass).to.be.true;
        });

        it('should resolve an instance when registered "useClass" attribute', () => {
            @Injectable()
            class TestClass {}
            const testToken = 'ITestClass';

            container.register({ token: testToken, useClass: TestClass });
            const instance = container.resolve(testToken);
            expect(instance).to.be.ok;
            expect(instance instanceof TestClass).to.be.true;
        });

        it('should resolve an instance when registered with "useValue" attribute', () => {
            const value = {};
            container.register({ token: 'Token', useValue: value });
            const instance = container.resolve('Token');
            expect(instance).to.be.ok;
            expect(instance === value).to.be.true;
        });

        it('should resolve an instance if registered with array of providers', () => {
            @Injectable()
            class TestClass {}
            const testToken = 'ITestClass';

            container.register([{ token: testToken, useClass: TestClass }]);
            const instance = container.resolve(testToken);
            expect(instance).to.be.ok;
            expect(instance instanceof TestClass).to.be.true;
        });

        it('should resolve a value if registered and resolved with a token which is a string literal', () => {
            @Injectable()
            class TestClass {}
            const testToken = 'ITestClass';

            container.register({ token: testToken, useClass: TestClass });
            const instance = container.resolve(testToken);
            expect(instance).to.be.ok;
            expect(instance instanceof TestClass).to.be.true;
        });

        it('should resolve a value when registered with a token which is an Object literal', () => {
            @Injectable()
            class TestClass {}
            container.register({ token: TestClass, useClass: TestClass });
            const instance = container.resolve(TestClass);
            expect(instance).to.be.ok;
            expect(instance instanceof TestClass).to.be.true;
        });

        it(`should resolve an instance found in ascendant containers if wasn't found in current container`, () => {
            @Injectable()
            class TestClass {}

            container.register(TestClass);
            const childContainer = container.createScope();
            const grandChildContainer = childContainer.createScope();

            const instance = grandChildContainer.resolve(TestClass);
            expect(instance).to.be.ok;
            expect(instance instanceof TestClass).to.be.true;
        });

        it('should resolve ф value when registered with "useFactory"', () => {
            container.register({
                token: 'V',
                useFactory: () => {
                    return 'result';
                }
            });

            const inst = container.resolve('V');
            expect(inst).to.be.equal('result');
        });

        it('should resolve a value if registered with "useFactory" + "inject" attributes', () => {
            @Injectable()
            class Foo {
                bar = 'works';
            }
            container.register({ token: 'IFoo', useClass: Foo} );

            container.register({
                token: 'V',
                useFactory: (foo: any) => {
                    return foo.bar;
                },
                inject: ['IFoo']
            });

            const inst = container.resolve('V');
            expect(inst).to.be.equal('works');
        });

        it('should resolve value if registered with InjectionToken', () => {
            interface IFactory {
                create(): any;
            }

            @Injectable()
            class ConcreteFactory implements IFactory {
                create(): any {
                    return;
                }
            }

            const TFactory = new InjectionToken<IFactory>('IFactory');

            container.register({ token: TFactory, useClass: ConcreteFactory } );

            const concreteFactory = container.resolve(TFactory);

            expect(concreteFactory instanceof ConcreteFactory).to.be.true;
        });

        describe('LifeTime', () => {
            it('should resolve a singleton instance if LifeTime was not specified', () => {
                @Injectable()
                class A {}

                container.register({ token: A, useClass: A });

                const instance1 = container.resolve(A);
                const instance2 = container.resolve(A);

                expect(instance1).to.be.equal(instance2);
            });

            it('should resolve a different instances if LifeTime was set to LifeTime.PerRequest', () => {
                @Injectable()
                class A {}

                container.register({ token: A, useClass: A, lifeTime: LifeTime.PerRequest });

                const instance1 = container.resolve(A);
                const instance2 = container.resolve(A);

                expect(instance1).not.to.be.equal(instance2);
            });

            it('should resolve a different instances if LifeTime was set to LifeTime.PerRequest in case of nested dependencies', () => {
                @Injectable()
                class A {
                    constructor(@Inject('IB') private b: any) {}
                }

                @Injectable()
                class B {

                }

                container.register({ token: A, useClass: A, lifeTime: LifeTime.PerRequest });
                container.register({ token: 'IB', useClass: B});

                const instance1: any = container.resolve(A);
                const instance2: any = container.resolve(A);

                expect(instance1).not.to.be.equal(instance2);
                expect(instance1.b).to.be.equal(instance2.b);
            });
        });

        describe('Errors', () => {
            it('should throw an error if provided token is not registered', () => {
                @Injectable()
                class TestClass {}
                container.register([{ token: 'Token', useClass: TestClass }]);

                const throwableFunc = () => container.resolve('NotRegisteredToken');
                expect(throwableFunc).to.throw();
            });

            it('should correctly print token in error messages: Token is a class literal', () => {
                @Injectable()
                class B {}

                @Injectable()
                class A {
                    constructor(@Inject(B) private b: any) {}
                }

                container.register({ token: 'IA', useClass: A });

                const throwableFunc = () => container.resolve('IA');
                expect(throwableFunc).to.throw('No provider for B. Trace: IA --> B');
            });

            it('should correctly print token in error messages: Token is an InjectionToken', () => {
                @Injectable()
                class A {}

                container.register({ token: 'IA', useClass: A });

                interface IB {
                    [key: string]: any;
                }

                const TB = new InjectionToken<IB>('IB');

                const throwableFunc = () => container.resolve(TB);
                expect(throwableFunc).to.throw('No provider for IB. Trace: IB');
            });

            it('should correctly print token in error messages: Token is a string', () => {
                @Injectable()
                class A {}

                container.register({ token: 'IA', useClass: A });

                const throwableFunc = () => container.resolve('str');
                expect(throwableFunc).to.throw('No provider for str. Trace: str');
            });

            it('should throw an error with a specific message if the 1st token in the line is not registered', () => {
                @Injectable()
                class A {
                    constructor(@Inject('d') private a: any) {}
                }
                container.register([{ token: 'IA', useClass: A }]);

                const throwableFunc = () => container.resolve('Fish');
                expect(throwableFunc).to.throw('No provider for Fish. Trace: Fish');
            });

            it('should throw an error with a specific message if the 2nd token in the line is not registered', () => {
                @Injectable()
                class A {
                    constructor(@Inject('IB') private b: any) {}
                }
                container.register([{ token: 'IA', useClass: A }]);

                const throwableFunc = () => container.resolve('IA');
                expect(throwableFunc).to.throw('No provider for IB. Trace: IA --> IB');
            });

            it('should throw an error with a specific message if the 3nd token in the line is not registered', () => {
                @Injectable()
                class A {
                    constructor(@Inject('IB') private b: any) {}
                }

                @Injectable()
                class B {
                    constructor(@Inject('IC') private c: any) {}
                }
                container.register({ token: 'IA', useClass: A });
                container.register({ token: 'IB', useClass: B });

                const throwableFunc = () => container.resolve('IA');
                expect(throwableFunc).to.throw('No provider for IC. Trace: IA --> IB --> IC');
            });

            it('should throw an error if registered class isnt marked with Injectable() decorator', () => {
                class A {
                }
                container.register({ token: 'IA', useClass: A });

                const throwableFunc = () => container.resolve('IA');
                expect(throwableFunc).to.throw();
            });

            it('should print Symbol types properly', () => {
                const TB = Symbol('IB');

                @Injectable()
                class A {
                    constructor(@Inject(TB) private b: any) {}
                }
                container.register({ token: 'IA', useClass: A });

                const throwableFunc = () => container.resolve('IA');
                expect(throwableFunc).to.throw('No provider for IB. Trace: IA --> IB');
            });
        });

    });

    describe('createScope()', () => {
        it('should create child scope', () => {
            const childContainer: any = container.createScope();
            expect(childContainer).to.be.ok;
            expect(childContainer.parent).to.equal(container);
        });
    });
});