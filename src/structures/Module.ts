import * as eris from '@rnet.cf/eris';
import * as rnet from 'RNet';
import * as schedule from 'node-schedule';
import Base from './Base';

interface Module {
	[key: string]: any;
	unload?(...args: any[]): void;
}

/**
 * Abstract class for classes that represent a module
 * @abstract Module
 * @extends Base
 */
abstract class Module extends Base {
	public name: string = this.constructor.name;

	public abstract module: string;
	public abstract description: string;
	public abstract enabled: boolean;
	public abstract list: boolean;

	private _boundListeners: Map<string, Function> = new Map();
	private _jobs: any[] = [];

	public abstract start(client: eris.Client, ...args: any[]);

	/**
	 * Validate class requirements
	 */
	public ensureInterface() {
		// required properties
		if (this.module == undefined) {
			throw new Error(`${this.constructor.name} command must define module property.`);
		}
		if (this.enabled == undefined) {
			throw new Error(`${this.constructor.name} command must define enabled property.`);
		}
	}

	/**
	 * Register event listener
	 */
	public registerListener(event: string, listener: Function) {
		const boundListener = listener.bind(this);
		this._boundListeners.set(event, boundListener);
		this.rnet.dispatcher.registerListener(event, boundListener, this);
	}

	/**
	 * Check if a module is enabled for a server, not async for performance
	 */
	public isEnabled(guild: eris.Guild, module: string|Module, guildConfig?: any): boolean|Promise<boolean> {
		if (!guild || !this.rnet.isReady) {
			return guildConfig ? false : Promise.resolve(false);
		}

		if (this.config.handleRegion && !this.utils.regionEnabled(guild, this.config)) {
			return guildConfig ? false : Promise.resolve(false);
		}

		return guildConfig ? this._isEnabled(guild, module, guildConfig) :
			new Promise((resolve: Function) => {
				this.rnet.guilds.getOrFetch(guild.id).then((config: any) =>
					resolve(this._isEnabled(guild, module, config)))
				.catch(() => resolve(false));
			});
	}

	public schedule(interval: string, task: Function) {
		this._jobs.push(schedule.scheduleJob(interval, task));
	}

	/**
	 * Start the module
	 */
	public _start(client: eris.Client, ...args: any[]) {
		if (this.start) {
			this.start(client, ...args);
		}
	}

	// tslint:disable-next-line
	// public unload(): void {}

	public _unload(...args: any[]) {
		if (this._boundListeners && this._boundListeners.size > 0) {
			for (const [event, listener] of this._boundListeners.entries()) {
				this.rnet.dispatcher.unregisterListener(event, listener);
			}
		}

		if (this._jobs) {
			for (const job of this._jobs) {
				job.cancel();
			}
		}

		if (this.unload) {
			this.unload(...args);
		}
	}

	private _isEnabled(guild: eris.Guild, mod: string|Module, guildConfig: rnet.GuildConfig) {
		if (!guild || !guildConfig) {
			return false;
		}

		const modules = guildConfig ? guildConfig.modules : null;
		if (!modules) {
			return false;
		}

		if (typeof mod === 'string') {
			mod = this.rnet.modules.get(mod);
		}

		const name = (<Module>mod).module || (<Module>mod).name;

		// check if globally disabled
		const globalConfig = this.rnet.globalConfig;
		if (globalConfig && globalConfig.modules.hasOwnProperty(name) &&
			globalConfig.modules[name] === false) {
				return false;
		}

		if (this.config.test && !this.config.testGuilds.includes(guild.id) && !guildConfig.test) {
			return false;
		}

		// check if module is disabled
		if ((modules.hasOwnProperty(name) && modules[name] === false) ||
			(!modules.hasOwnProperty(name) && (<Module>mod).defaultEnabled === false)) {
				return false;
		}

		if (!this._checkPremium(guildConfig)) {
			return false;
		}

		if (!this._checkBeta(guildConfig)) {
			return false;
		}

		return true;
	}

	private _checkBeta(guildConfig: rnet.GuildConfig) {
		if (guildConfig.beta) {
			if (!this.config.test && !this.config.beta) {
				return false;
			}
		} else if (this.config.beta) {
			return false;
		}

		return true;
	}

	private _checkPremium(guildConfig: rnet.GuildConfig) {
		if (!this.config.isPremium && guildConfig.isPremium && guildConfig.premiumInstalled) {
			return false;
		}
		if (this.config.isPremium && (!guildConfig.isPremium || !guildConfig.premiumInstalled)) {
			return false;
		}
		if (!this.config.isPremium && guildConfig.clientID && guildConfig.clientID !== this.config.client.id) {
			return false;
		}

		return true;
	}
}

export default Module;
