const LIVE_VIEW_PORT_RANGE_START = 17400;
const LIVE_VIEW_PORT_RANGE_SIZE = 600;

const liveViewPort =
  LIVE_VIEW_PORT_RANGE_START + Math.floor(Math.random() * LIVE_VIEW_PORT_RANGE_SIZE);

export const LIVE_VIEW_URL = `http://127.0.0.1:${liveViewPort}`;
