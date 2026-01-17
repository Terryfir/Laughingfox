import dataUtils from "../utils/data.js";

async function handleEvent({ sock, event, log, font, update }) {
    const events = global.client.events;
    const { 
        getUserData, 
        getGroupData, 
        saveTable, 
        getTable, 
        setUserBanned, 
        isUserBanned, 
        setGroupBanned, 
        isGroupBanned 
    } = dataUtils;

    for (const eventCmd of events.values()) {
        try {
            await eventCmd.onEvent({
                sock,
                event,
                log,
                font,
                update,
                getUserData,
                getGroupData,
                saveTable,
                getTable,
                setUserBanned,
                isUserBanned,
                setGroupBanned,
                isGroupBanned
            });
        } catch (error) {
            log.error(`Error running event: ${eventCmd.config.name}`);
            console.log(error);
        }
    }
}

export default handleEvent;
