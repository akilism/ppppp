var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var _ = require('underscore');
var dir = require('directions');

class Conti {
    constructor(start,end,key,fn){
        this.start = start;
        this.end = end;
        this.key = key;
        this.fn = fn;
    }

    isActive(data){
        return data[this.key] >= this.start && data[this.key] < this.end;
    }

    process(data, trans_vals){
        var delta = this.end - this.start;
        var clamped_pct = (data[this.key] - this.start) / delta;
        return this.fn(clamped_pct, trans_vals);
    }

    run(data,trans_vals){
        if(typeof(trans_vals) === "undefined"){
            var trans_vals = {};
        }

        if(this.isActive(data)){
            return this.process(data, trans_vals);
        } else {
            return trans_vals;
        }
    }

    abut(next_end,fn){
        var new_conti = new Conti(this.end, next_end, this.key, fn)        
        new_conti.isActive = _.bind(function(data){
            
            var left_isActive = this.isActive(data),
                this_isActive = data[this.key] >= new_conti.start && data[this.key] < new_conti.end;
            return left_isActive || this_isActive;
        },this);

        new_conti.run = _.bind(function(data, trans_vals){
            if(this.isActive(data)){
                return this.run(data, trans_vals);
            } else if(new_conti.isActive(data)){
                return new_conti.process(data, trans_vals);
            } else {
                return trans_vals;
            }
        },this);

        return new_conti;
    }
}
window.Conti = Conti

window.jQ = $;

Math.linearTween = function (t, b, c, d) {
	return c*t/d + b;
};
Math.easeOutBack = function (t, b, c, d, s) {
		if (s == undefined) s = 1.70158;
		return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
};
Math.easeInOutQuad = function (t, b, c, d) {
	t /= d/2;
	if (t < 1) return c/2*t*t + b;
	t--;
	return -c/2 * (t*(t-2) - 1) + b;
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
          el_height = $p.outerHeight(),
          el_top = $p.position().top,
          scroll_anchor = scroll_top + (window_height * anchor),
          pct_elapsed,
          pct_elapsed_raw;
          
        if (el_top > scroll_anchor) {
          pct_elapsed = 0;
        } else if (el_top + el_height < scroll_anchor) {
          pct_elapsed = 1.0;
        } else {
          pct_elapsed = (scroll_anchor - el_top) / el_height;
        }
        pct_elapsed_raw = (scroll_anchor - el_top) / el_height; 
        return {el_id: $(p).attr("id"), pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw};
      };

      return acc;
    }, {});
  },
  getMarkersInv: function(scroll_top, window_height) {
    scroll_top = -1 * scroll_top;
  
    return _.reduce($(".marker-p"),  function(acc, p) {

      acc[p.id] = function(anchor) {
        if(typeof(anchor) === "undefined"){
          var anchor = 0.0; 
        }

        var $p = $(p),
          el_height = $p.outerHeight(),
          el_top = $p.position().top,
          el_anchor = el_top + (el_height * anchor),
          pct_elapsed,
          pct_elapsed_raw;
          
        if (el_anchor > scroll_top + window_height) {
          pct_elapsed = 0;
        } else if (el_anchor < scroll_top) {
          pct_elapsed = 1.0;
        } else {
          pct_elapsed = 1 - ((el_anchor - scroll_top) / window_height);
        }
        pct_elapsed_raw = 1 - ((el_anchor - scroll_top) / window_height); 
        return {el_id: $(p).attr("id"), pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw};
      };

      return acc;
    }, {});
  },
  bot2Top: function(){
  
  }
};

TRV.animatePov = function(sv,pov){
    var start_pov = sv.getPov(),
        ticks = 24,
        heading_d = pov.heading - start_pov.heading,
        pitch_d = pov.pitch - start_pov.pitch,
        zoom_d = pov.zoom - start_pov.zoom,
        i = 0;
    var next = function(){
        var pov = sv.getPov(),
            h = pov.heading,
            p = pov.pitch,
            z = pov.zoom,
            new_heading = Math.easeInOutQuad(i,start_pov.heading,heading_d,ticks),
            new_pitch = Math.easeInOutQuad(i,start_pov.pitch,pitch_d,ticks),
            new_zoom = Math.easeInOutQuad(i,start_pov.zoom,zoom_d,ticks);
        sv.setPov({heading: new_heading, pitch: new_pitch, zoom: new_zoom});
        i++;
        if(i < ticks){
            setTimeout(function(){
              next();
            },33)
        }
    }
    next();
}

class TestComponent extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <div style={{position: 'relative', width: '100%', height: '100%'}}>
        <Title/>
        <HomeMap/>
        <Timebar/>
        <Slide2/>
        <Slide1/>
      </div>
    );
  }
}

class ScanComponent extends React.Component {
  constructor(props) {
    super(props);
    TRV.scan_components.push(this);
  }

  isActive(){
    return false;
  }

  componentDidMount(){
    var new_scroll = $(window).scrollTop(),
        window_height = $(window).height(),
        markers = TRV.getMarkers(new_scroll, window_height),
        inv_markers = TRV.getMarkersInv(new_scroll, window_height),
        last_state = _(this.state).clone(),
        new_state = this.adjust(last_state, {
          scroll_top: new_scroll,
          markers: markers,
          inv_markers: inv_markers
        });
    this.setState(new_state);
  }

  adjust() {
    throw "You must override adjust"
  }
}

class HomeMap extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        bg_top: 0,
      };
    }

    componentDidMount(){
      var layer = "toner";
      var mapOptions = {
        center: { lat: 40.71988, lng: -73.95726},
        zoom: 17,
        mapTypeId: layer,
        disableDefaultUI: true,
        scrollwheel: false,
        navigationControl: false,
        mapTypeControl: false,
        scaleControl: false,
        draggable: false,
        mapTypeControlOptions: {
          mapTypeIds: [layer]
        }
      };
      var map = new google.maps.Map(document.getElementById('map'),
          mapOptions);
      map.mapTypes.set(layer, new google.maps.StamenMapType(layer));
      TRV.map = map;
      
      google.maps.event.addListenerOnce(map, 'idle', function(){
        var topRight = map.getProjection().fromLatLngToPoint(map.getBounds().getNorthEast());
        var bottomLeft = map.getProjection().fromLatLngToPoint(map.getBounds().getSouthWest());
        var scale = Math.pow(2, map.getZoom());
        var projection = TRV.map.getProjection();
        var xy_path = _.map(TRV.city, function(v,k){
           var latlng = new google.maps.LatLng(v.lat, v.lng);
           var worldPoint =  projection.fromLatLngToPoint(latlng)
           return [(worldPoint.x - bottomLeft.x) * scale, (worldPoint.y - topRight.y) * scale]
        })
        //var draw = SVG('drawing')
        
        //var polyline = draw.polyline(xy_path).fill('none').stroke({color: "#ff0000", width: 8 })
        //TRV.path = _(xy_path).map(function(p){return [p[0] + 10,p[1] + 10]})
        //TRV.polyline = polyline
        //var s = Snap("#drawing");
        //var line = s.polyline(_.flatten(xy_path))
        //line.attr({
            //stroke: "#ff0000",
            //strokeWidth: 8,
            //fill: "none"
        //})
        //TRV.path = _.flatten(xy_path)
        //TRV.line = line
        //TRV.a = s.polyline([0,0,100,100])
        //TRV.a.attr({
            //stroke: "#ff0000",
            //strokeWidth: 8,
            //fill: "none"
        //})

      });
      TRV.map.addListener('click', function(e) {
        console.log(e.latLng)
      })


      //var path = _.map(TRV.city, function(v,k){
        //return {name: k, coords: new google.maps.LatLng(v.lat, v.lng)}
      //})

      //console.log("getting path")
      //dir.getXY(path).then(function(d){
        //console.log("xy",d)
      //})

      //var transit_path = dir.getLatLng(path)
      //transit_path.then(function(d){
        //var path = _(d).map(function(p){return {lat: p[0], lng: p[1]}})
        //var tripPath = new google.maps.Polyline({
            //path: path,
            //geodesic: true,
            //strokeColor: '#FF0000',
            //strokeOpacity: 0.9,
            //strokeWeight: 8
          //});
         //tripPath.setMap(TRV.map)
      //})
      

    }

    adjust(last,d){
      var dest_top = -1 * $(window).height();
      var conti = new Conti(0,0.15,"pct_scroll",function(pct,t){
        t.bg_top = 0;
        return t;
      }).abut(0.2,function(pct,t){
        t.bg_top = Math.linearTween(pct, 0, dest_top, 1);
        return t;
      }).abut(1, function(pct,t){
        t.bg_top = dest_top;
        return t;
      })
 
      var trans_data = conti.run(d,{})

      return trans_data
    }

    render(){
        return (
          <div id="map-wrapper" style={{top: this.state.bg_top}}>
                <div id="map"/>
            </div>
        )   
    }
}

class Timebar extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        asap_on: false,
        playhead_left: -29
      };
      this.dots = {
        0: "",
        25: "I wanna get closer. Press 'SHIFT' and scroll.",
        60: "",
        70: "",
        99: ""
      }
    }

    adjust(last,d){
      var track_width = $("#timebar-track-inner").width();
      var conti = new Conti(0,0.2,"pct_scroll",function(pct,t){
        t.playhead_left = -29;
        t.asap_on = true;
        t.caption = false;
        return t;
      }).abut(1,_.bind(function(pct,t){
        var near_dots = _(this.dots).map(function(title,dot){return [dot,Math.abs(dot - (pct * 100))]}),
        asap_on = _(near_dots).find(function(dot){return dot[1] < 1});
        
        if(asap_on && this.dots[asap_on[0]].length > 0){
          t.caption = this.dots[asap_on[0]];
        } else {
            t.caption = false;
        }

        if(asap_on){
          t.playhead_left = Math.linearTween(asap_on[0]/100, -20, track_width, 1);
        } else {
          t.playhead_left = Math.linearTween(pct, -20, track_width, 1);
        }
        console.log("p",t.playhead_left)

        t.asap_on = asap_on && asap_on[0];

        return t;
      },this))
 
      var trans_data = conti.run(d,{})


      return trans_data
    }

    render(){
      var track_passed = $("#timebar-track-inner").width() - this.state.playhead_left - 10;

      return(
        <div id="timebar">
          <div id="timebar-track">
            <div id="timebar-track-inner">

              <div id="timebar-track-passed" style={{
                  right: track_passed
              }}/>
              <div className="track-dot" style={{left:0}}/>
              <div className="track-dot" style={{left: "25%"}}/>
              <div className="track-dot" style={{left: "60%"}}/>
              <div className="track-dot" style={{left: "70%"}}/>
              <div className="track-dot" style={{left: "99%"}}/>
              <img src={this.state.asap_on ? "asap-head-yellow.png" : "asap-head.png"} id="playhead" style={{
                  left: this.state.playhead_left
              }}/>
              <div id="head-caption" style={{
                display: (this.state.caption ? "block" : "none"),
                left: this.state.playhead_left + 40
              }}>
                {this.state.caption}
              </div>
            </div>
          </div>
        </div>
      )
    }

}

class Slide1 extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        frame: 0,
        frames: 22,
        base_bg: "round-gif",
        bg_top: 0
      };
    }

    adjust(last,d){
      var new_frame = Math.round(d.pct_scroll/0.002) % this.state.frames,
          target_height = -1300;
      var conti = new Conti(0,0.4,"pct_scroll",function(pct,t){
        t.bg_top = 0;
        return t;
      }).abut(0.45,function(pct,t){
        t.bg_top = Math.linearTween(pct,0,target_height,1)
        return t;
      }).abut(1,function(pct,t){
        t.bg_top = target_height;
        return t;
      })
 
      var trans_data = conti.run(d,{})
      trans_data.frame = new_frame;

      return trans_data;
    }
    componentDidMount(){
        $(window).on("keydown",_.bind(function(e){
            if(e.keyCode === 16){
              var pct_scroll = $(window).scrollTop() / ($("body").height() - $(window).height());
              var new_frame = Math.round(pct_scroll/0.002) % 14; 
              this.setState({frames: 14, base_bg: "round-gif-2", frame: new_frame})
            }
        },this))    
        $(window).on("keyup",_.bind(function(e){
            if(e.keyCode === 16){
              this.setState({frames: 22, base_bg: "round-gif"})
            }
        },this))    
    }
    render(){
        return (
          <img className="full-gif" src={this.state.base_bg + "/frame_" + this.state.frame + ".gif"} style={{
            top: this.state.bg_top
          }}/>
        )
    }
}

class Slide2 extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        frame: 0,
        frames: 20,
        base_bg: "barbie-gif"
      };
    }

    adjust(last,d){
        var new_frame = Math.round(d.pct_scroll/0.002) % this.state.frames;
        return {frame: new_frame} 
    }
    componentDidMount(){
        $(window).on("keydown",_.bind(function(e){
            if(e.keyCode === 16){
              var pct_scroll = $(window).scrollTop() / ($("body").height() - $(window).height());
              var new_frame = Math.round(pct_scroll/0.002) % 14; 
              this.setState({frames: 14, base_bg: "barbie-gif-2", frame: new_frame})
            }
        },this))    
        $(window).on("keyup",_.bind(function(e){
            if(e.keyCode === 16){
              this.setState({frames: 20, base_bg: "barbie-gif"})
            }
        },this))    
    }
    render(){
        return (
          <img className="full-gif" src={this.state.base_bg + "/frame_" + this.state.frame + ".gif"}/>
        )
    }
}

class Title extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bg_top: 0,
    };
  }
  adjust(last_state, d) {
    var dest_top = -1 * $(window).height();
    if(d.pct_scroll < 0.1){
        var new_top = Math.linearTween(d.pct_scroll, 0, dest_top, 0.1);
    } else if (d.pct_scroll) { 
        var new_top = dest_top;
    }
    return {bg_top: new_top};
  }

  render() {
    return(
      <div className='bg-slide' style={{
        position: "fixed",
        top: this.state.bg_top,
        width: this.state.width,
        height: this.state.height,
        backgroundImage: "url('marseille_1.jpg')",
        backgroundSize: "cover",
        zIndex: 2000000
      }}>
        <h3 className="vid-title" style={{fontSize: 300}}>MARSEILLE</h3>
      </div>
    )
  }
}

TRV.city = {
  "bar": {
      lat: 40.719770091561315,
      lng: -73.9578366279602,
      full_name: "Trilby's Bar",
  },
  "park": {
      lat: 40.72061576057116,
      lng: -73.95473599433899,
      full_name: "City Park IV",
  },
  "club": {
      lat: 40.71924154297441,
      lng: -73.9540708065033,
      full_name: "The Bounce Club",
  },
  "resto": {
      lat: 40.72007908725286,
      lng: -73.95987510681152,
      full_name: "Spicee's Meatball",
  },
  "afterhours": {
    lat: 40.71704598853704, 
    lng: -73.95642042160034,
    full_name: "Furry's Bar"
  }
}

$(function() {

  $("#page").height($(window).height() * 30);
  TRV.last_scroll = $(window).scrollTop();
  TRV.root = ReactDOM.render(<TestComponent/>, document.getElementById('track'));
  $(window).on("scroll",_.throttle(function(){
    var new_scroll = $(window).scrollTop(),
        window_height = $(window).height(),
        $copy = $('#copy'),
        new_copy_top = (new_scroll / window_height) * (- $copy.height() * 0.1);
    var markers = TRV.getMarkers(new_copy_top, window_height);
    var inv_markers = TRV.getMarkersInv(new_copy_top, window_height);
    $copy.css({
      top: new_copy_top,
    });
    var pct_scroll = new_scroll / ($("body").height() - $(window).height());
    _(TRV.scan_components).each(function(c){
      var last_state = _(c.state).clone();
      var new_state = c.adjust(last_state, {
        scroll_top: new_scroll,
        pct_scroll: pct_scroll,
        markers: markers,
        inv_markers: inv_markers
      });
      c.setState(new_state);
    });
  },5));
});
