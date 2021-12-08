import * as eris from '@rnet.cf/eris';
import * as rnet from 'RNet';

export default interface CommandData {
	message: eris.Message;
	args?: any[];
	t?: Function;
	command?: string;
	guildConfig?: rnet.GuildConfig;
	isAdmin?: boolean;
	isOverseer?: boolean;
	suppressOutput?: boolean;
	responseChannel?: eris.TextChannel;
}
