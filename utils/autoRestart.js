import cron from 'node-cron';

const scheduleExit = (action) => {
    cron.schedule('0 */1 * * *', () => {
        if (action) {
            action();
        } else {
            console.log('Timer triggered, but no restart action was defined.');
        }
    });

    console.log('Auto-restart scheduler active: Will trigger every 1 hour.');
};

export default scheduleExit;
