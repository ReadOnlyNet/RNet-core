import * as eris from '@rnet.cf/eris';

export default interface WebhookOptions {
	avatarURL?: string;
	content?: string;
	embeds?: eris.EmbedOptions[];
	slack?: boolean;
}
