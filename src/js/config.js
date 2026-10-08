// Analytics API configuration (disabled)
const API_KEY = '';
const API_BASE_URL = '';

function getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        uuid: params.get('uuid'),
        station: params.get('station')
    };
}
