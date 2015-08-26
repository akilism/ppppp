var $ = require('jquery');
var React = require('react');
var {maps} = require('google');
var source = require('./in_cold_blood.txt');
var cityGuideData = require('./city_guide');

var Ease = {
  linear(pos, start, scale, distance) {
    return scale * (pos / distance) + start;
  },
  inOutCubic(pos, start, scale, distance) {
    pos /= distance/2;
    if (pos < 1) return scale/2*pos*pos*pos + start;
    pos -= 2;
    return scale/2*(pos*pos*pos + 2) + start;
  },
  outElastic(pos, start, scale, distance) {
    if ((pos/=distance) < (1/2.75)) {
      return scale*(7.5625*pos*pos) + start;
    } else if (pos < (2/2.75)) {
      return scale*(7.5625*(pos-=(1.5/2.75))*pos + .75) + start;
    } else if (pos < (2.5/2.75)) {
      return scale*(7.5625*(pos-=(2.25/2.75))*pos + .9375) + start;
    } else {
      return scale*(7.5625*(pos-=(2.625/2.75))*pos + .984375) + start;
    }
  }
};

var viceNorth = new maps.LatLng(40.7211588,-73.9579174);
var viceSouth = new maps.LatLng(40.7146628,-73.9658753);

// Create the polyline and add the symbol to it via the 'icons' property.

function animate(scrollStart, scrollEnd, latLngStart, latLngEnd, easeFn) {
  var latScale = latLngEnd.lat() - latLngStart.lat();
  var lngScale = latLngEnd.lng() - latLngStart.lng();
  var distance = scrollEnd - scrollStart;
  return (pos) => {
    return new maps.LatLng(
      easeFn(pos, latLngStart.lat(), latScale, distance),
      easeFn(pos, latLngStart.lng(), lngScale, distance)
    );
  };
}

class AnimatedScrollMarker extends maps.OverlayView {
  constructor(options) {
    super();
    this.end = options.end;
    this.relativeStart = options.relativeStart;
    this.easingFn = options.easingFn || Ease.linear;
    if (options.map) {
      this.setMap(options.map);
    }
  }

  onAdd() {
    var projection = this.getProjection();
    var end = projection.fromLatLngToContainerPixel(this.end);
    var start = new maps.Point(end.x + this.relativeStart.x, end.y + this.relativeStart.y);
    var startLatLng = projection.fromContainerPixelToLatLng(start);
    this.marker = new maps.Marker(startLatLng);
    this.animateFn = animate(0, getScrollEnd(), startLatLng, this.end, this.easingFn);
    this.marker.setMap(this.map);
    this.marker.setPosition(this.animateFn($(window).scrollTop()));
    $(window).on('scroll', () => {
      var pos = $(window).scrollTop();
      this.marker.setPosition(this.animateFn(pos));
    });
  }

  draw() {}

  onRemove() {}
}

class AnimatedLine extends maps.OverlayView {
  constructor(options) {
    super();
    this.start = options.start;
    this.end = options.end;
    if (options.map) {
      this.setMap(options.map);
    }
    this.easeFn = options.easeFn || Ease.linear;
  }

  onAdd() {
    var lineSymbol = {
      path: 'M 0,-1 0,1',
      strokeOpacity: 1,
      strokeColor: '#ff0000',
      strokeLineCap: 'butt',
    };
    var stretchFn = animate(0, getScrollEnd(), this.start, this.end, this.easeFn);
    this.polyline = new maps.Polyline({
      path: [this.start, stretchFn($(window).scrollTop())],
      strokeOpacity: 0,
      icons: [{
        icon: lineSymbol,
        repeat: '20px',
      }],
      map: this.map,
    });
    $(window).on('scroll', () => {
      var projection = this.getProjection();
      var pos = $(window).scrollTop();
      var end = stretchFn(pos);
      var startPoint = projection.fromLatLngToContainerPixel(this.start);
      var endPoint = projection.fromLatLngToContainerPixel(end);

      if (Math.pow(startPoint.x - endPoint.x, 2) + Math.pow(startPoint.y - endPoint.y, 2) < Math.pow(10, 2)) {
        this.polyline.setPath([this.start, stretchFn(pos)]);
        this.polyline.setVisible(false);
      } else {
        this.polyline.setVisible(true);
        this.polyline.setPath([this.start, stretchFn(pos)]);
      }
    });
  }

  draw() {}

  onRemove() {}

}



class TallBoy extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      start: null,
      distance: null,
    };
  }

  componentDidMount() {
    var $node = $(React.findDOMNode(this));
    var start = $node.offset().top;
    var distance = $node.height();
    this.setState({
      start: start,
      distance: distance,
    });
  }

  render() {
    var data = this.props.data;
    return (
      <div>
        {this.state.start} {this.state.distance}
      </div>
    );
  }
}

class Tailor extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      start: null,
      distance: null,
    };
  }

  componentDidMount() {
  }

  render() {
    var data = this.props.data;
    return (
      <div>
      </div>
    );
  }
}

function getScrollEnd() {
  return $(document).height() - $(window).height();
}
window.onload = function() {
  var map = new maps.Map(document.getElementById('map'), {
    center: { lat: 40.7211128, lng: -73.985336 },
    zoom: 15,

    disableDefaultUI: true,
    scrollwheel: false,
    navigationControl: false,
    mapTypeControl: false,
    scaleControl: false,
    draggable: false,
  });

  var viceNorthMarker = new AnimatedScrollMarker({
    end: viceNorth,
    relativeStart: new maps.Point(0, -100),
    map: map,
  });
  var viceSouthMarker = new AnimatedScrollMarker({
    end: viceSouth,
    relativeStart: new maps.Point(0, -100),
    map: map
  });
  var flight = new AnimatedLine({
    start: viceNorth,
    end: viceSouth,
    map: map,
  });
  maps.event.addListener(map, 'tilesloaded', function(){
    document.getElementById('map').style.position = 'fixed';
  });
  var $text = $('#text').text(source);
  var startCenter = new maps.LatLng(40.7211128, -73.985336);
  var endCenter = new maps.LatLng(40.7195235, -73.9609452);
  var panFn = animate(0, getScrollEnd(), startCenter, endCenter, Ease.inOutCubic);
  map.setCenter(panFn($(window).scrollTop()));
  $(window).on('scroll', () => {
    var pos = $(window).scrollTop();
    map.setCenter(panFn(pos));
  });
  //React.render(<TallBoy/ >, $('#text').get(0));
}; 
