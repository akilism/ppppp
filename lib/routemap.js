var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');
var polyline = require('polyline');

class RouteMap extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      routePoints: []
    };
  }

  adjust(last_state) {
    if(!this.routes[0].routePoints) { return last_state; }
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.context;
    var pointsIdx = Math.round((this.routes[0].routePoints.length - 1) * pctScroll);
    var currentPath = this.routes[0].routePoints.slice(0, pointsIdx);
    var that = this;
    var poly = new google.maps.Polyline({
      path: currentPath.map(that.toLatLngObj),
      strokeColor: '#000',
      strokeOpacity: 1.0,
      strokeWeight: 4
    });

    var point = this.routes[0].routePoints[pointsIdx];
    if(point) {
      var markers = this.getMarkerAt(point);
      // console.log(this.routes[0].routePoints);
      if(markers.length > 0) {
        // console.log(markers);
        if(markers[0].marker.added) {
          markers[0].marker.setMap(null);
          markers[0].marker.added = false;
        } else {
          markers[0].marker.setMap(this.map);
          markers[0].marker.added = true;
        }
      }
    }
    poly.setMap(this.map);
    if(this.routes[0].poly) { this.routes[0].poly.setMap(null); }
    this.routes[0].poly = poly;

    // this.map.setCenter(this.toGoogleLatLng(this.routes[0].routePoints[pointsIdx]));
    // this.map.setZoom(15);

    // var bounds = new google.maps.LatLngBounds(this.routes[0].markers[this.routes[0].markers.length-1].marker.position ,this.routes[0].markers[0].marker.position);
    return _.extend(this.state, { routePoints: currentPath });
  }

  getMarkerAt(point) {
    // return [];
    // console.log("================================");
    return this.routes[0].markers.filter(function(m) {
      var isMarker = ((m.marker.position.G.toFixed(3) === point[0].toFixed(3)) && (m.marker.position.K.toFixed(3) === point[1].toFixed(3)));
      // console.log('marker:', m.marker.position.G, m.marker.position.K);
      // console.log('line point:', point[0], point[1]);
      // console.log(isMarker);
      // console.log("-----------------------------");
      return isMarker;
    });
  }

  getMarkersIn(path) {
    return false;
  }

  toLatLngObj(point) { return {lat: point[0], lng: point[1]}; };
  toGoogleLatLng(point) { return new google.maps.LatLng(point[0], point[1]); }
  fromGoogleLatLng(point) { return [point.G, point.K]; }

  addMidPoints(points, distThreshold, interpolationAmount) {
    for(let len = points.length-1, i = 1; i < len; i++) {
      let pointA = this.toGoogleLatLng(points[i-1]),
        pointB = this.toGoogleLatLng(points[i]),
        distanceBetween = google.maps.geometry.spherical.computeDistanceBetween(pointA, pointB);

        if(distanceBetween >= distThreshold) {
          let newPoint = this.fromGoogleLatLng(google.maps.geometry.spherical.interpolate(pointA, pointB, interpolationAmount));
          // console.log("distGreater: ", distanceBetween, newPoint);
          points.splice(i, 0, newPoint);
        }
    }
    return points;
  }

  makeWaypoint(point) {
    return {
      location: point,
      stopover: true
    };
  }

  getDirectionsPolyline(points) {
    // console.log(points);
    return new Promise((resolve, reject) => {
      var trip = { origin: points[0],
        waypoints: (points.length > 2) ? points.slice(1, points.length).map(this.makeWaypoint) : [],
        destination: points[points.length-1],
        travelMode: google.maps.TravelMode.WALKING
      };

      var directions = new google.maps.DirectionsService();
      directions.route(trip, (result, status) => {
        if(status === "OK") {
          console.log(result);
          var routePoints = polyline.decode(result.routes[0].overview_polyline);
          resolve(this.addMidPoints(routePoints, 50, 0.5));
          return;
        }
        reject(status);
      });
    });
  }

  componentWillMount() {
    this.routes = [{ poly: null,
      markers: [{ marker: new google.maps.Marker({ position: { lat: 40.8025967, lng: -73.9502753},
        animation: google.maps.Animation.DROP,
        title: 'Amy Ruth\'s'}),
      trigger: null},
      {marker: new google.maps.Marker({ position: { lat: 40.797814, lng: -73.960124},
        animation: google.maps.Animation.DROP,
        title: 'Secret Smoke Spot'}),
      trigger: null },
      {marker: new google.maps.Marker({ position: { lat: 40.780916, lng: -73.972981},
        animation: google.maps.Animation.DROP,
        title: 'AMNH'}),
      trigger: null },
      {marker: new google.maps.Marker({ position: { lat: 40.783778, lng: -73.986376},
        animation: google.maps.Animation.DROP,
        title: 'Hudson River Hot Dog Vendor'}),
      trigger: null },
      {marker: new google.maps.Marker({ position: { lat: 40.704021, lng: -74.017073},
        animation: google.maps.Animation.DROP,
        title: 'Battery Park Underpass'}),
      trigger: null }]}];

    return this.getDirectionsPolyline(this.routes[0].markers.map((m) => {
      return m.marker.position;
    })).then((routePoints) => {
      this.routes[0].routePoints = routePoints;
      this.state.routePoints = routePoints;
      var dimensions = {
        width: 150,
        height: this.context.viewportHeight,
        mapHeight: this.context.viewportHeight - 10
      };
      // console.log(routePoints);
      this.setState(_.extend(this.state, dimensions));
    });
  }

  componentWillReceiveProps() { this.setState(this.adjust(this.state)); }

  componentDidMount() {
    var styles = [{ featureType: "all", stylers: [{ visibility: "off" }]}];
    var mapNode = this.refs.map;

    this.map = new google.maps.Map(this.refs.map, {
      backgroundColor: 'transparent',
      center: {lat: 40.786858, lng: -73.962468},
      disableDefaultUI: true,
      disableDoubleClickZoom: true,
      draggable: false,
      keyboardShortcuts: false,
      scrollwheel: false,
      zoom: 13
    });
    this.map.setOptions({styles: styles});

    //Add all markers to map initially
    // _.forEach(this.routes,(rte) => {
    //   _.forEach(_.where(rte.markers, {trigger: null}), (m) => {
    //     console.log(m);
    //     m.marker.setMap(this.map);
    //   });
    // });

    this.routes[0].markers[0].marker.setMap(this.map);
    // this.map.setCenter(this.routes[0].markers[0].marker.position);
    var bounds = new google.maps.LatLngBounds(this.routes[0].markers[this.routes[0].markers.length-1].marker.position ,this.routes[0].markers[0].marker.position);
    // this.map.setCenter(bounds.getCenter());
    this.map.fitBounds(bounds);
  }

  render() {
    return (
      <div className="mapHolder">
        <div className="map" ref="map"></div>
      </div>);
  }
}
