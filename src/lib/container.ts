import { IConstructor, IInjectionInstance, IInjectionMd, IProvider, ProviderToken } from './interfaces';
import { IRegistryData, RegistryData } from './registry-data';
import { INJECTIONS_MD_KEY } from './decorators';
import { IContainer } from './container.interface';
import { InvalidProviderProvidedError } from './exceptions';

export class Container implements IContainer {
    private registry: Map<ProviderToken, IRegistryData> = new Map();

    constructor(private parent?: IContainer) {}

    public register(provider: IProvider|IProvider[]|IConstructor|IConstructor[]): void {
        provider = this.nornalizeProvider(provider);

        if (Array.isArray(provider)) {
            this.registerAll(<IProvider[]> provider);
        } else {
            provider = this.nornalizeProvider(provider);
            this.registerOne(<IProvider> provider);
        }
    }

    public resolve(token: ProviderToken): IInjectionInstance {
        const registryData = <IRegistryData> this.registry.get(token);

        if (!registryData) {
            if (this.parent) {
                return this.parent.resolve(token);
            } else {
                throw new Error(`No provider for ${token}`);
            }
        }

        if (registryData.value) {
            return registryData.value;
        }

        if (registryData.instance) {
            return registryData.instance;
        }

        if (registryData.factory) {
            let injections: ProviderToken[] = [];

            if (registryData.injections) {
                injections = registryData.injections.map(i => this.resolve(i));
            }

            return registryData.factory(...injections);
        }

        const instance: IInjectionInstance = this.createInstance(registryData);

        registryData.instance = instance;
        this.registry.set(token, registryData);

        return instance;
    }

    public createScope(): IContainer {
        return new Container(this);
    }

    private registerAll(providers: IProvider[]): void {
        providers.forEach((p: IProvider) => this.registerOne(p));
    }

    private createInstance(registryData: IRegistryData): IInjectionInstance {
        const cls = registryData.cls;
        const injectionsMd: IInjectionMd[] = this.getInjections(cls);
        const resolvedInjections: any[] = injectionsMd.map(injectionMd => this.resolve(injectionMd.token));

        const args: any[] = [];
        injectionsMd.forEach((injection: IInjectionMd, index) => {
            args[injection.parameterIndex] = resolvedInjections[index];
        });

        return new cls(...args);
    }

    private registerOne(provider: IProvider) {
        const registryData: IRegistryData = new RegistryData();

        if (provider.useValue) {
            registryData.value = provider.useValue;
        } else if (provider.useClass) {
            registryData.cls = provider.useClass;
        } else if (provider.useFactory) {
            registryData.factory = provider.useFactory;
            registryData.injections = <ProviderToken[]> provider.inject;
        }

        this.registry.set(provider.token, registryData);
    }

    private nornalizeProvider(provider: IProvider|IProvider[]|IConstructor|IConstructor[]): IProvider|IProvider[] {
        let normalizedProvider: any;

        if (Array.isArray(provider)) {
            normalizedProvider = provider.map<IProvider>((p: IProvider|IConstructor) => this.normalizeOneProvider(p));
        } else {
            normalizedProvider = this.normalizeOneProvider(provider);
        }
        return normalizedProvider;
    }
    private normalizeOneProvider(provider: IProvider|IConstructor): IProvider {
        if (typeof provider === 'function') {
            provider = { token: <IConstructor> provider, useClass: <IConstructor> provider };
        } else if (!(provider instanceof Object)) {
            throw new InvalidProviderProvidedError();
        }
        return <IProvider> provider;
    }

    private getInjections(cls: any): IInjectionMd[] {
        return Reflect.getOwnMetadata(INJECTIONS_MD_KEY, cls) || [];
    }
}