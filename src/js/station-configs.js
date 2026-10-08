// Bridge station-configs.js to residentEvilStationConfigs
// Provides 7-station Resident Evil quest configuration

const stationConfigs = (typeof residentEvilStationConfigs !== 'undefined')
  ? residentEvilStationConfigs
  : {};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = stationConfigs;
}
