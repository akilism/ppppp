var React = require('react');
var $ = require('jquery');
var _ = require('underscore');
var polyline = require('polyline');
var PureRenderMixin = require('react/addons').addons.PureRenderMixin;

Math.linearTween = function (t, b, c, d) {
	return c*t/d + b;
};

window.TRV = {
  last_scroll: 0,
  scan_components: [],
  getMarkers: function(scroll_top, window_height) {
    scroll_top = -1 * scroll_top;
    
    return _.reduce($(".marker-p"),  function(acc, p) {

      acc[p.id] = function(anchor) {
        if(typeof(anchor) === "undefined"){
          var anchor = 0.0; 
        }

        var $p = $(p),
          el_height = $p.height(),
          el_top = $p.position().top,
          scroll_anchor = scroll_top + (window_height * anchor),
          pct_elapsed;
          
        if (el_top > scroll_anchor) {
          pct_elapsed = 0;
        } else if (el_top + el_height < scroll_anchor) {
          pct_elapsed = 1.0;
        } else {
          pct_elapsed = (scroll_anchor - el_top) / el_height;
        }
        // console.log($p.attr("id"), scroll_anchor, pct_elapsed);
        return {el_id: $(p).attr("id"), pct_elapsed: pct_elapsed};
      };

      return acc;
    }, {});
  }
};

class TestComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div style={{position: 'relative', width: '100%', height: '100%'}}>
        <Bg/>
      </div>
    );
  }
}

class ScanComponent extends React.Component {
  constructor(props) {
    super(props);
    TRV.scan_components.push(this);
  }
 
  componentDidMount(){
    var new_scroll = $(window).scrollTop(),
        window_height = $(window).height(),
        markers = TRV.getMarkers(new_scroll, window_height),
        last_state = _(this.state).clone(),
        new_state = this.adjust(last_state, {
          scroll_top: new_scroll,
          markers: markers,
        });
    this.setState(new_state);
  }

  adjust() {
    throw "You must override adjust"
  }
}

class Bg extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bg_top: 0
    };
    TRV.scan_components.push(this);
  }
  adjust(last_state, d) {
    var first_graf_elapsed = d.markers["12-chairs"](0.5).pct_elapsed,
        window_height = $(window).height(),
        bg_top;
    if (first_graf_elapsed > 0.5) {
      bg_top = Math.linearTween(first_graf_elapsed - 0.5, -window_height, window_height, 0.5);
    } else {
      bg_top = -window_height;
    }
    return {bg_top: bg_top};
  }

  render() {
    return(
      <div className='bg-slide' style={{
        position: "fixed",
        top: this.state.bg_top,
        width: $(window).width(),
        height: $(window).height(),
      }}/>
    )
  }
}

// class Map extends ScanComponent {
//   constructor(props) {
//     super(props);
//     this.state = {

//     }
//   }
// }

var setMap = function(selector) {
  var map = new google.maps.Map(document.getElementById(selector), {
    center: {lat: 40.786858, lng: -73.962468},
    zoom: 13
  });

  return map;
}

var getDirectionsPolyline = function(points) {
  return new Promise(function(resolve, reject) {
    var trip1 = {
      origin: points[0],
      destination: points[points.length-1],
      travelMode: google.maps.TravelMode.WALKING
    };

    var directions = new google.maps.DirectionsService();
    directions.route(trip1, function(result, status) {
      // console.log(result, status);
      if(status !== "OK") {
        reject(status);
        return;
      }
      var polypoints = polyline.decode(result.routes[0].overview_polyline);
      resolve(polypoints);
    });
  });
}


$(function() {
  $("#page").height($(window).height() * 10);
  TRV.last_scroll = $(window).scrollTop();
  TRV.root = React.render(<TestComponent/>, document.getElementById('track'));

  var map = setMap('map');
  map.addListener('click', addLatLng);

  function addLatLng(event) {
  console.log(event);
  // debugger;
  }

  var amyRuths = {lat: 40.8025967, lng: -73.9502753};
  var amyRuthsMarker = new google.maps.Marker({position: amyRuths,
    animation: google.maps.Animation.DROP,
    title: 'Amy Ruth\'s'});
  amyRuthsMarker.setMap(map);

  var centralPark = {lat: 40.797814, lng: -73.960124};
  var centralParkMarker = new google.maps.Marker({position: centralPark,
    animation: google.maps.Animation.DROP,
    title: 'Secret Smoke Spot'});
  centralParkMarker.setMap(map);

  getDirectionsPolyline([amyRuths, centralPark]).then(function(polyline) {
    var poly = new google.maps.Polyline({
      strokeColor: '#000000',
      strokeOpacity: 1.0,
      strokeWeight: 3
    });
    poly.setMap(map);
    var lastIdx = -1;

    $(window).on("scroll",_.throttle(function(){
      var new_scroll = $(window).scrollTop(),
          window_height = $(window).height(),
          $copy = $('#copy'),
          new_copy_top = (new_scroll / window_height) * (- $copy.height() * 0.1);
      var markers = TRV.getMarkers(new_copy_top, window_height);
      var marker_elapsed = markers['intro'](0).pct_elapsed;
      
      var path = poly.getPath();
      var pointsIdx = Math.round((polyline.length-1) * marker_elapsed);
      var newPoint = polyline[pointsIdx];
      console.log(lastIdx, pointsIdx);

      if(pointsIdx > lastIdx) {
        path.insertAt(pointsIdx, new google.maps.LatLng(newPoint[0], newPoint[1]));  
      } else if (pointsIdx < lastIdx){
        path.removeAt(pointsIdx);
      }


      lastIdx = pointsIdx;
    },5));
  });
});
