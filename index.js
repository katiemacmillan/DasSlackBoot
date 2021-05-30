const logger = require('./logger.js');
const scheduler = require('./scheduler.js');
const requester = require('./requestHelper.js');

const today = new Date();
let state;

const insertVariables = (stringValue, personel, shifts) => {
    const slackPersonel = {
        onCall: state.slackPersonelIdMap[personel.onCall],
        onDeck: state.slackPersonelIdMap[personel.onDeck]
    }
    stringValue = stringValue.replace('${onCall}', slackPersonel.onCall);
    stringValue = stringValue.replace('${onDeck}', slackPersonel.onDeck);
    stringValue = stringValue.replace('${currentShift}', shifts.current);
    stringValue = stringValue.replace('${nextShift}', shifts.next);
    stringValue = stringValue.replace('${groupId}', personel.groupId);
    return stringValue;
}

const handleTopic = async (topic, personel, shifts) => {
    let oldTopic = await requester.getChannelTopic(topic.channelId, state.slackHeaders);
    let splitTopic = oldTopic.split(topic.delimiter);

    if ((splitTopic.length <= 1) && (splitTopic[0] == '')) {
        splitTopic = [];
    }

    Object.keys(topic.replacements).map(function (key) {
        const topicSegment = insertVariables(topic.replacements[key], personel, shifts);
        if (key >= splitTopic.length) {
            splitTopic.push(topicSegment);
        } else {
            splitTopic[key] = topicSegment
        }
    });

    splitTopic = splitTopic.filter(function (el) {
        return (el != null) && (el != '');
    });

    return splitTopic.join(topic.delimiter);

}
const handleShift = async (shift) => {
    const { personel, topic, shifts, rotation, ignoreWeekends, title } = shift;
    const isWeekend = scheduler.isWeekend();

    logger.log(`Shift ${title} ... Ignores Weekends? ${ignoreWeekends}... Is Weekend? ${isWeekend}`)

    /****************************PERSONEL**********************************/
    if (!ignoreWeekends || !isWeekend()) {
        logger.log(`Incrementing shift day for shift ${title}`)
        personel.dayCount = scheduler.incrementShiftDay(personel, shifts);

        if (personel.dayCount == 0) {
            logger.log(`Shift ${title} has a new person going on call`)

            personel.onCall = personel.onDeck;
            personel.onDeck = scheduler.incrementPersonel(personel.onDeck, rotation);
            shift.personel = personel;

            /****************************SHIFTS**********************************/
            shifts.current = shifts.next;
            shifts.next = scheduler.incrementShifts(shifts);
            shift.shifts = shifts;

            /****************************Topic**********************************/
            if (personel.groupId) {
                const userIds = personel.otherGroupMembers ? personel.otherGroupMembers.push(personel.onCall) : personel.onCall;
                await requester.updateUserGroup(personel.groupId, userIds, state.slackHeaders);
            }
            if (topic.channelId){
                const newTopic = await handleTopic(topic, personel, shifts);
                await requester.updateChannelTopic(topic.channelId, newTopic, state.slackHeaders);
            }
        }
    } else {
        logger.log(`No update to shift ${title} shift today`);
    }
    return shift;
}



const updateShifts = async () => {
    const promiseArray = state.shifts.map(shift => { return handleShift(shift) });
    await Promise.all(promiseArray);
}

const execute = async () => {
    state = await requester.getState();
    await updateShifts(state);
    await requester.saveState(state);
    logger.log(`Completed Shift Update For ${today.toDateString()}`);
}

module.exports = { execute }