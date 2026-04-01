let runtimeGraphClient = null;
let runtimeDataManager = null;

export function setRuntimeServices({ graphClient, dataManager }) {
    runtimeGraphClient = graphClient || null;
    runtimeDataManager = dataManager || null;
}

export function clearRuntimeServices() {
    runtimeGraphClient = null;
    runtimeDataManager = null;
}

export function getGraphClient() {
    return runtimeGraphClient;
}

export function getDataManager() {
    return runtimeDataManager;
}