import LogInfo from "../models/loginfo";

const writeLogInfo = (id, data) => {
    const logInfo = new LogInfo(
        {
            date: Date.now(),
            user_id : id,
            data: data,
        }
    );

    logInfo.save();
};

export default writeLogInfo;
