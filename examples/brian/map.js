var $ = require('jquery');
var React = require('react');
var {maps} = require('google');

var viceNorth = new maps.LatLng(40.7211588,-73.9579174);
var viceSouth = new maps.LatLng(40.7146628,-73.9658753);

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

exports.AnimatedScrollMarker = AnimatedScrollMarker;
exports.AnimatedLine = AnimatedLine;
