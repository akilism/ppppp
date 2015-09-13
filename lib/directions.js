var polyline = require('polyline');

var directions = (function() {

  var width = 1000;
  var height = 500;
  var toLatLngObj = function(point) { return {lat: point[0], lng: point[1]}; };
  var toGoogleLatLng = function(point) { return new google.maps.LatLng(point[0], point[1]); };
  var fromGoogleLatLng = function(point) { return [point.G, point.K]; };

  var addMidPoints = function(points, distThreshold, interpolationAmount) {
    for(let len = points.length-1, i = 1; i < len; i++) {
      let pointA = toGoogleLatLng(points[i-1]),
        pointB = toGoogleLatLng(points[i]),
        distanceBetween = google.maps.geometry.spherical.computeDistanceBetween(pointA, pointB);

        if(distanceBetween >= distThreshold) {
          let newPoint = fromGoogleLatLng(google.maps.geometry.spherical.interpolate(pointA, pointB, interpolationAmount));
          // console.log("distGreater: ", distanceBetween, newPoint);
          points.splice(i, 0, newPoint);
        }
    }
    return points;
  };

  var makeWaypoint = function(point) {
    return {
      location: point,
      stopover: true
    };
  };

  var getDirections = function(points) {
    // console.log(points);
    return new Promise((resolve, reject) => {
      var trip = { origin: points[0],
        waypoints: (points.length > 2) ? points.slice(1, points.length).map(makeWaypoint) : [],
        destination: points[points.length-1],
        travelMode: google.maps.TravelMode.WALKING
      };

      // console.log(trip);

      var directions = new google.maps.DirectionsService();
      directions.route(trip, (result, status) => {
        if(status === "OK") {
          // console.log(result);
          var routePoints = polyline.decode(result.routes[0].overview_polyline);
          resolve(addMidPoints(routePoints, 50, 0.5));
          return;
        }
        reject(status);
      });
    });
  };

  var buildMarker = function(point) {
    return {
      marker: new google.maps.Marker({position: point.coords, animation: google.maps.Animation.DROP, title: point.name}),
      trigger: null
    };
  };

  var getDirectionsPolyline = function(points) {
    let markers =  points.map(buildMarker);

    return getDirections(markers.map((m) => {
      return m.marker.position;
    })).then((routePoints) => {
      return routePoints;
    });
  };

  var convertLatLng = function(point) {
    let x = (width * (180 + point[1]) / 360) % (width + (width / 2));
    let latRadians = point[0] * Math.PI / 180;
    let mercatorN = Math.log(Math.tan((Math.PI / 4) + (latRadians / 2)));
    let y = (height/2) - (width * mercatorN / 2 * Math.PI);
    return [x, y];
  };

  var getXY = function(points) {
    return getDirectionsPolyline(points).then((points) => {
      return points.map(convertLatLng);
    });
  };



  return {
    getLatLng:getDirectionsPolyline,
    getXY:getXY
  };
}());

module.exports = directions;
