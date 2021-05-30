const logger = require('./logger.js')
const moment = require('moment');
const today = new Date();
const enums = {
    FRIDAY: 5,
    SATURDAY: 6,
    SUNDAY: 0,
    JANUARY: 0,
    PI_INDEX: 0,
    PI_CUTOFF_DATE: 9,
    SPRINT_INDEX: 1,
    MAX_SPRINT: 5,
    ONE_WEEK: 7
}
const incrementPersonel = (onCall, rotationArr) => {
    const onCallIndex = rotationArr.findIndex(element => element === onCall);
    const onDeckIndex = ((onCallIndex >= 0) && (onCallIndex + 1 < rotationArr.length)) ? onCallIndex + 1 : 0;

    return rotationArr[onDeckIndex];
}

const isWeekend = () => { return (today.getDay() == enums.SUNDAY || today.getDay() == enums.SATURDAY); }

const incrementShiftDay = ({ dayCount }, { shiftLength, ignoreWeekends }) => {
    const isWeekend = (today.getDay() == enums.SUNDAY || today.getDay() == enums.SATURDAY);

    if (ignoreWeekends && isWeekend) {
        return dayCount;
    } else if (dayCount + 1 >= shiftLength) {
        return 0;
    } else {
        return dayCount + 1;
    }
}

const incrementShifts = (shift) => {
    switch (shift.type) {
        case 'DATE':
            return getShiftDates(shift);
        case 'RELEASE':
            return getReleaseNumbers(shift.next.split('.').map(num => { return parseInt(num) }));
    }

}

const addDaysToDate = (date, days) => {
    const output = new Date(date);
    output.setDate(output.getDate() + days);
    return output;
}
const calculateOffsets = (startDayOfWeek, shiftLength, ignoreWeekends) => {
    let offset = (startDayOfWeek == enums.SATURDAY || startDayOfWeek == enums.SUNDAY) ? 2 : 0;

    if (ignoreWeekends) {
        // calculate how many work weeks shift will span and additional days
        const weekSpanCount = Math.floor(shiftLength / 5);
        const remainingDaysCount = shiftLength % 5;


        offset = (weekSpanCount * 7) + remainingDaysCount;
        // check to see if the shift will run into/through the first weekend
        if (startDayOfWeek + remainingDaysCount > enums.FRIDAY) {
            offset += 2
        }

        // check to see if the shift will end on a weekend
        const endDayOfWeek = (startDayOfWeek + offset) % 7;
        if (endDayOfWeek === enums.SUNDAY || endDayOfWeek == enums.SATURDAY) {
            offset += 2
        }
        return offset

    } else return shiftLength;

}
const getShiftDates = ({ shiftLength, ignoreWeekends }) => {

    // don't count today as part of the shift length
    let onCallOffset = calculateOffsets(today.getDay(), shiftLength - 1, ignoreWeekends);
    const onCallEnd = addDaysToDate(today, onCallOffset)

    if (ignoreWeekends && onCallEnd.getDay() + 1 == enums.SATURDAY) {
        onCallOffset += 2
    }

    const onDeckStart = addDaysToDate(today, onCallOffset + 1)

    const onDeckOffset = calculateOffsets(onDeckStart.getDay(), shiftLength, ignoreWeekends);
    const onDeckEnd = addDaysToDate(today, onDeckOffset + onCallOffset)

    return `${moment(onDeckStart).format('M/D')} - ${moment(onDeckEnd).format('M/D')} `;
}

const getReleaseNumbers = ([programIncrement, sprint, release]) => {
    sprint += 1
    // Allow for over max sprint if date is in Januare and before the 9th
    if ((sprint > 5) && ((today.getMonth() != enums.JANUARY) || (today.getDate() > enums.PI_CUTOFF_DATE))) {
        sprint = 1
        //increment program increment when sprint gets reset... reset program increments in January
        programIncrement = today.getMonth() == enums.JANUARY ? 1 : programIncrement + 1;

    }
    return `${programIncrement}.${sprint}.${release}`;
}

module.exports = {
    incrementShiftDay,
    incrementShifts,
    incrementPersonel,
    isWeekend
}
