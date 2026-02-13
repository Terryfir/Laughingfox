import cron from 'node-cron';

const scheduleExit = (action) => {
    cron.schedule('0 */3 * * *', () => {
        if (action) {
            action();
        } else {
            console.log('Timer triggered, but no restart action was defined.');
        }
    });

    console.log('Auto-restart scheduler active: Will trigger every 3 hour.');
};

export default scheduleExit;
