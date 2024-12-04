const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./config.json');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

let monitoredChannelId = null; // Canal que será monitorado
let targetChannelId = null;    // Canal de destino
let usersInChannel = [];       // Array de usuários no canal monitorado

async function updateUsersInChannel(channelId) {
    if (!channelId) return;

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel || channel.type !== 2) return; // Garante que é um canal de voz

    usersInChannel = channel.members.map(member => member.user.id);
    console.log(usersInChannel)
    console.log(`Atualizado: ${usersInChannel.length} usuário(s) no canal.`);
}

client.on('ready', () => {
    console.log(`Bot iniciado como ${client.user.tag}`);
    client.user.setActivity('Monitorando canais de voz');
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(config.prefix)) return;

    const args = message.content.slice(config.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command === 'setvoicechannel') {
        const channelId = args[0];

        if (!channelId) {
            return message.reply('Por favor, forneça o ID de um canal de voz.');
        }

        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || channel.type !== 2) {
            return message.reply('Canal inválido ou não é um canal de voz.');
        }

        monitoredChannelId = channelId;
        await updateUsersInChannel(channelId);
        return message.reply(`Agora monitorando o canal de voz: ${channel.name}`);
    }

    if (command === 'settargetchannel') {
        const channelId = args[0];

        if (!channelId) {
            return message.reply('Por favor, forneça o ID de um canal de voz.');
        }

        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel || channel.type !== 2) {
            return message.reply('Canal inválido ou não é um canal de voz.');
        }

        targetChannelId = channelId;
        return message.reply(`Canal de destino configurado para: ${channel.name}`);
    }

    if (command === 'moveuser') {
        if (!targetChannelId) {
            return message.reply('O canal de destino não foi configurado. Use o comando `settargetchannel` primeiro.');
        }

        const userId = args[0];
        if (!userId) {
            return message.reply('Por favor, forneça o ID de um usuário.');
        }

        const guild = message.guild;
        const member = guild.members.cache.get(userId);

        if (!member) {
            return message.reply('Usuário não encontrado no servidor.');
        }

        if (member.voice.channel.id != monitoredChannelId) {
            return message.reply(`O usuário não está no canal ${member.voice.channel}.`);
        }

        try {
            await member.voice.setChannel(targetChannelId);
            return message.reply(`Usuário ${member.user.tag} movido para o canal de destino.`);
        } catch (error) {
            console.error(error);
            return message.reply('Houve um erro ao mover o usuário.');
        }
    }
});

client.on('voiceStateUpdate', (oldState, newState) => {
    if (!monitoredChannelId) return;

    const oldChannel = oldState.channelId;
    const newChannel = newState.channelId;

    if (oldChannel === monitoredChannelId || newChannel === monitoredChannelId) {
        updateUsersInChannel(monitoredChannelId);
    }
});

client.login(process.env.DISCORD_TOKEN);