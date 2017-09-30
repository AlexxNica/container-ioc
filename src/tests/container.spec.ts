import { IContainer } from '../lib/container.interface';
import { Container } from '../lib/index';

import 'mocha';
import { expect } from 'chai';
import { IConstructor } from '../lib/interfaces';

/* tslint:disable: no-unused-expression max-classes-per-file*/

describe('Container', () => {

    let container: IContainer;

    beforeEach(() => {
        container = new Container();
    });

    describe('resolve()', () => {
        it('should resolve an instance of a given provider when registered with a single class literal', () => {
            const testClass: IConstructor = class TestClass {};
            container.register(testClass);
            const instance = container.resolve(testClass);
            expect(instance).to.be.ok;
            expect(instance instanceof testClass).to.be.true;
        });

        it('should resolve an instance of a given class when registered with a provider literal', () => {
            const testClass = class TestClass {};
            const testToken = 'ITestClass';

            container.register({ token: testToken, useClass: testClass });
            const instance = container.resolve(testToken);
            expect(instance).to.be.ok;
            expect(instance instanceof testClass).to.be.true;
        });

        it('should resolve an instance of a given when registered with array of providers/tokens', () => {
            const testClass = class TestClass {};
            const testToken = 'ITestClass';

            container.register([{ token: testToken, useClass: testClass }]);
            const instance = container.resolve(testToken);
            expect(instance).to.be.ok;
            expect(instance instanceof testClass).to.be.true;
        });

        it('should resolve with a string literal', () => {
            const testClass = class TestClass {};
            const testToken = 'ITestClass';

            container.register({ token: testToken, useClass: testClass });
            const instance = container.resolve(testToken);
            expect(instance).to.be.ok;
            expect(instance instanceof testClass).to.be.true;
        });

        it('should throw an error if provided token is not registered', () => {
            const testClass = class TestClass {};
            const testToken = 'ITestClass';

            container.register([{ token: testToken, useClass: testClass }]);

            const throwableFunc = () => container.resolve('RandomToken');
            expect(throwableFunc).to.throw();
        });

        it('should look for instance in ascendant containers if it wasnt found in the current container', () => {
            const testClass: IConstructor = class TestClass {};
            container.register(testClass);
            const childContainer = container.createScope();
            const grandChildContainer = childContainer.createScope();

            const instance = grandChildContainer.resolve(testClass);
            expect(instance).to.be.ok;
            expect(instance instanceof testClass).to.be.true;
        });

        it('should resolve value given to container at registration stage', () => {
            const value = { name: 'Peter' };
            container.register({ token: 'V', useValue: value });
            const inst = container.resolve('V');
            expect(inst).to.be.equal(value);
        });

        it('should resolve value with factory provided by user', () => {
            container.register({
                token: 'V',
                useFactory: () => {
                    return 'result';
                }
            });

            const inst = container.resolve('V');
            expect(inst).to.be.equal('result');
        });

        it('should resolve value with factory provided by user + injections', () => {
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
    });

    describe('createScope()', () => {
        it('should create child scope', () => {
            const childContainer: any = container.createScope();
            expect(childContainer).to.be.ok;
            expect(childContainer.parent).to.equal(container);
        });
    });
});