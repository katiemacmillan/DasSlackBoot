const axios = require('axios');
const logger = require('./logger.js');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

const BUCKET_NAME = 'app3-scheduler.appspot.com';
const STATE_FILE = 'currentStateTest.json'

const getState = async () => {
    const stateFile = await storage.bucket(BUCKET_NAME).file(STATE_FILE).download('./currentStateTest.json');
    return JSON.parse(stateFile[0].toString());
}

const saveState = async (state) => {
    await storage.bucket(BUCKET_NAME).file(STATE_FILE).save(Buffer.from(JSON.stringify(state)));
}


const updateUserGroup = async (groupId, userId, headers) => {
    return await makeRequest(`https://slack.com/api/usergroups.users.update?usergroup=${groupId}&users=${userId}`, headers);

}

const updateChannelTopic = async (channelId, topicStr, headers) => {
    return await makeRequest(`https://slack.com/api/conversations.setTopic?channel=${channelId}&topic=${topicStr}`, headers);
}

const getChannelTopic = async (channelId, headers) => {
    try {
        const data = await makeRequest(`https://slack.com/api/conversations.info?channel=${channelId}`, headers)
        if (data) return data.channel.topic.value
    } catch (err) {
        logger.log(err);
    }
    return null;

}

const makeRequest = async (url, payload) => {

    logger.log(url);
    try {
        const res = await axios(url, payload);
        return res.data;
    } catch (err) {
        logger.err(`${err.response.status} - ${err.response.statusText}`)
    }
    return null
}
module.exports = {
    updateUserGroup,
    updateChannelTopic,
    getChannelTopic,
    getCurrentRelease,
    getState,
    saveState
}