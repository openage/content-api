
var Coordinates = function(latitude, longitude){
    this.latitude = typeof latitude == "string"? parseFloat(latitude) : latitude ;
    this.longitude = typeof longitude == "string"?  parseFloat(longitude) : longitude;
};

var ToRadian = function(centerLong) {
    return centerLong * Math.PI/180;
};

var RadiansToDegrees =  function(maxLatRads) {
    return maxLatRads * 180/Math.PI;
};

Coordinates.prototype.findNextLocation = function (bearAngle, distance){
    var lonRads = ToRadian(this.longitude);
    var latRads = ToRadian(this.latitude);

    var bearingRads = ToRadian(bearAngle);
    var maxLatRads = Math.asin(Math.sin(latRads) * Math.cos(distance / 6371) + Math.cos(latRads) * Math.sin(distance / 6371) * Math.cos(bearingRads));
    var maxLonRads = lonRads + Math.atan2((Math.sin(bearingRads) * Math.sin(distance / 6371) * Math.cos(latRads)), (Math.cos(distance / 6371) - Math.sin(latRads) * Math.sin(maxLatRads)));

    var maxLat = RadiansToDegrees(maxLatRads);
    var maxLong = RadiansToDegrees(maxLonRads);

    var newCoordinate = new Coordinates(maxLat, maxLong);
    return newCoordinate;
};


module.exports = exports = Coordinates;
