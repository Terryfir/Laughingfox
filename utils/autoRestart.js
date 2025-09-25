import cron from 'node-cron';

const scheduleExit = () => {

  cron.schedule('0 */12 * * *', () => {

    console.log('Exiting process...');

    process.exit(2);

  });

  console.log('Process started. Will exit every 12 hours.');

};

export default scheduleExit;