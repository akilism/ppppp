var React = require('react');
var ReactDOM = require('react-dom');
var $ = require('jquery');
var _ = require('underscore');
var dir = require('directions');
var Flipbook = require('flipbook')

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

TRV.animatePov = function(sv,pov,fn){
    clearTimeout(TRV.anim)
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
            TRV.anim = setTimeout(function(){
              next();
            },33)
        } else {
            if(typeof(fn) !== "undefined"){
                fn()
            }
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
        <Slide0/>
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
        caption: false,
        title: false,
        face: false,
        face_frame: 0,
        zindex:100,
        highlight: false
      };
      TRV.homemap = this
    }

    togglePov(t,fn){
      var current_pov = _.clone(TRV.streetView.getPov());
      if(t){
          current_pov.heading = 257.68007576992042;
          this.pov_toggle = true;
      } else {
          current_pov.heading = 77.68007576992042;
          this.pov_toggle = false;
      }
      TRV.animatePov(TRV.streetView,current_pov,fn);
    }

    setUpPano(){
      TRV.streetView = TRV.map.getStreetView();
      TRV.streetView.setVisible(true);
      TRV.streetView.setOptions( {linksControl: false,panControl: false, zoomControl: false, mapTypeControl: false, streetViewControl: false, overviewMapControl: false, addressControl: false, enableCloseButton: false})

      var startPoint = new google.maps.LatLng(43.29638, 5.377674); 
      TRV.streetView.setPosition(startPoint)
      TRV.streetView.setPov({heading: 77.68007576992042, pitch: 64.9837616957764, zoom: 1})
      $('#pano1').css({"pointer-events": "none"})
    }

    componentDidMount(){
      var layer = "toner";
      var mapOptions = {
        center: { lat: 40.71988, lng: -73.95826},
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

      });
      TRV.map.addListener('click', function(e) {
        console.log(e.latLng)
      })


      var path = _.map(TRV.city, function(v,k){
        return {name: k, coords: new google.maps.LatLng(v.lat, v.lng)}
      })

      //console.log("getting path")
      //dir.getXY(path).then(function(d){
        //console.log("xy",d)
      //})

      var transit_path = dir.getLatLng(path)
      transit_path.then(function(d){
        var d = _(d).select(function(p){return p[0] && p[1]})
        var path = _(d).map(function(p){return {lat: p[0], lng: p[1]}})
        var tripPath = new google.maps.Polyline({
            path: path,
            geodesic: true,
            strokeColor: '#FFFF00',
            strokeWeight: 12
          });
         tripPath.setMap(TRV.map)
          var image = {
              url: 'yellow-dot.png',
              size: new google.maps.Size(26,26),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(13,13),
              zIndex: 1
            };
         _(TRV.city).each(function(v,k){
          var marker = new google.maps.Marker({
                position: {lat: v.lat, lng: v.lng},
                map: TRV.map,
                zIndex: 1,
                icon: image
              });
          marker.addListener("mouseover",function(){
            TRV.homemap.setState({highlight:v.item});
          })
          marker.addListener("mouseout",function(){
            TRV.homemap.setState({highlight:false});
          })
         })

         var asap = {
              url: 'asap-head-yellow.png',
              size: new google.maps.Size(90,110),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(40,55),
              zIndex: 10
         }
          TRV.asap_marker = new google.maps.Marker({
                position: {lat: TRV.city["bar"].lat, lng: TRV.city["bar"].lng},
                map: TRV.map,
                zIndex: 10,
                icon: asap
           });
      })
      
      this.setUpPano();
      $(window).on("keydown",_.bind(function(e){
          if(e.keyCode == 16 && this.state.zindex < 100){
            this.togglePov(true,_.bind(function(){
                this.last_title = this.state.title;
                this.setState({face:true, title: false});
            },this));
          }
      },this))
      $(window).on("keyup",_.bind(function(e){
          if(e.keyCode == 16){
            this.setState({face:false, title: this.last_title});
            this.togglePov(false);
          }
      },this))

      setInterval(_.bind(function(){
        if(this.state.face){
            var f = this.state.face_frame,
                new_f = (f + 1) % 8
            this.setState({face_frame: new_f});
        }
      },this),100)

    }

    adjust(last,d){
      var dest_top = -1 * $(window).height();
      var conti = new Conti(0,0.15,"pct_scroll",function(pct,t){
        t.bg_top = 0;
        t.zindex = 100;
        return t;
      }).abut(0.2,function(pct,t){
        t.bg_top = Math.linearTween(pct, 0, dest_top, 1);
        t.zindex = 100;
        return t;
      }).abut(0.7, function(pct,t){
        t.bg_top = 0;
        t.zindex = 96;
        return t;
      }).abut(0.75, function(pct,t){
        t.bg_top = Math.linearTween(pct, 0, dest_top, 1);
        t.zindex = 96;
        return t;
      }).abut(1, function(pct,t){
        t.bg_top = dest_top;
        t.zindex = 96;
        return t;
      })
 
      var trans_data = conti.run(d,{})

      var pano_conti = new Conti(0,0.45,"pct_scroll",function(clamped_pct, t){
          TRV.streetView.setVisible(false);
          t.caption = false;
          t.new_pitch = 64.9837616957764;
          t.new_slide = 10;
          t.title = false;
          return t;
      }).abut(0.47, function(clamped_pct, t){
          TRV.streetView.setVisible(true);
          t.caption = true;
          t.new_pitch = 64.9837616957764;
          t.new_slide = 10;
          t.title = false;
          return t;
      }).abut(0.55, _.bind(function(clamped_pct, t){
          TRV.streetView.setVisible(true);
          t.caption = true;
          t.new_pitch = Math.linearTween(clamped_pct, 64.9837616957764, -64.9837616957764, 1)
          t.new_slide = Math.linearTween(clamped_pct,10,-100,1);
          t.title = false;
          return t;
      },this)).abut(1, _.bind(function(clamped_pct, t){
          TRV.streetView.setVisible(true);
          t.caption = true;
          t.title = "In the middle of the street, A$AP Rocky pointed to a manhole and told me to climb in."
          t.new_pitch = 0;
          t.new_slide = -100;
          return t;
      },this))

      trans_data = pano_conti.run(d,trans_data)

      var head_conti = new Conti(0,0.1,"pct_scroll",function(pct,t){
        TRV.asap_marker.setPosition(new google.maps.LatLng(40.719770091561315, -73.9578366279602))
      }).abut(0.2, function(pct,t){
        var new_lat = Math.linearTween(pct,40.719770091561315,-0.00093512727,1)
        var new_lng = Math.linearTween(pct,-73.9578366279602,0.00141620635,1)
        TRV.asap_marker.setPosition(new google.maps.LatLng(new_lat,new_lng))
      }).abut(1,function(pct,t){
        TRV.asap_marker.setPosition(new google.maps.LatLng(40.718834964282536, -73.95642042160034))
      })

      head_conti.run(d,{})

      if(TRV.streetView){
        var current_pov = TRV.streetView.getPov();
        current_pov.pitch = trans_data.new_pitch;
        TRV.streetView.setPov(current_pov)
      }

        return trans_data
    }

    render(){
        return (
          <div id="map-wrapper" style={{top: this.state.bg_top, zIndex: this.state.zindex}}>
                <div id="map"/>
                <h2 id="map-title" style={{
                  display: this.state.caption ? "none" : "block"
                }}>
                    The itinerary
                </h2>
                <ol id="itinerary" style={{
                  display: this.state.caption ? "none" : "block"
                }}>
                  <li id="hills-item" className={
                    this.state.highlight === "hills-item" ? "highlight" : ""
                  }>The hills</li>
                    <li id="square-item" className={
                    this.state.highlight === "square-item" ? "highlight" : ""
                  }>The town square</li>
                    <li id="crubby-item" className={
                    this.state.highlight === "crubby-item" ? "highlight" : ""
                  }>Crubby's Cool Club</li>
                    <li id="club-item" className={
                    this.state.highlight === "club-item" ? "highlight" : ""
                  }>Cool Club #2</li>
                </ol>
                <h6 className="slide-words" style={{
                  top: this.state.new_slide + "%",
                  display: this.state.caption ? "block" : "none"
                }}>
                    At 6:00 PM, I got the text. "Meet Yung Tourguide in the middle of Marseille and take this pill". A pill popped out of my phone, because it was the future. I was gonna have a crazy night in the service of journalism.
                </h6>
                <div className="vid-title" style={{
                  display: (this.state.title ? "block" : "none"),
                  zIndex:21
                }}>{this.state.title}</div>
                <img className="full-gif" style={{
                  display: this.state.face ? "block" : "none",
                  bottom: 0,
                  width:1400,
                  left: "50%",
                  marginLeft: "-700px",
                  zIndex:20
                }} src={"spin/head_" + this.state.face_frame + ".png"}/>
            </div>
        )   
    }
}

class Timebar extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        asap_on: false,
        zoom: false,
        playhead_left: -29,
        right: false,
        current_dot: false
      };
      this.dots = {
        0: "",
        25: "I wanna get closer. Hold 'SHIFT' and scroll.",
        45: "What's over there? Hold 'SHIFT' to look around.",
        70: "Help that dude high-five me. Tap 'SHIFT' rapidly until we smack.",
        85: "What happened last night? Tap 'SHIFT' to fill in the blanks ...",
        91: "What city was I in? 'SHIFT'",
        93: "Was I even at the beach? 'SHIFT'",
        97: "SHIFT"
      }
      TRV.timebar = this;
    }

    componentDidMount(){
        $(window).on("keydown",_.bind(function(e){
            if(e.keyCode === 16 && ! TRV.stop){
              console.log(this.state.current_dot)
              $("#bass-hit")[0].play();
              this.setState({zoom: true})
            }
            if(e.keyCode === 16){
            }
        },this))    
        $(window).on("keyup",_.bind(function(e){
            if(e.keyCode === 16 && ! TRV.stop){
              $("#bass-hit-2")[0].play();
              this.setState({zoom: false})
            }
            if(e.keyCode === 16){
              clearTimeout(TRV.stop_to)
              TRV.stop = true;
              TRV.stop_to = setTimeout(function(){
                TRV.stop = false;
              },300)
            }
        },this))    
    }

    adjust(last,d){
      var track_width = $("#timebar-track-inner").width();
      var conti = new Conti(0,0.2,"pct_scroll",function(pct,t){
        t.playhead_left = -29;
        t.asap_on = true;
        t.caption = false;
        t.right = false;
        t.current_dot = false;
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
          t.current_dot = asap_on
        } else {
          t.current_dot = false
          t.playhead_left = Math.linearTween(pct, -20, track_width, 1);
        }

        if(pct > 0.9){
            t.right = true;
        } else {
            t.right = false;
        }

        t.asap_on = asap_on && asap_on[0];

        return t;
      },this))
 
      var trans_data = conti.run(d,{})

      if(trans_data.asap_on && ! this.state.asap_on){
        $("#click-hit")[0].play();
      }

      return trans_data
    }

    render(){
      var track_passed = $("#timebar-track-inner").width() - this.state.playhead_left - 10;

      return(
        <div id="timebar">
          <audio id="bass-hit">
            <source src="bass-hit.mp3" type="audio/mpeg"/>
          </audio>
          <audio id="bass-hit-2">
            <source src="bass-hit-2.mp3" type="audio/mpeg"/>
          </audio>
          <audio id="click-hit">
            <source src="click.mp3" type="audio/mpeg"/>
          </audio>
          <audio id="bass-casino">
            <source src="bass-casino.mp3" type="audio/mpeg"/>
          </audio>
          <div id="timebar-track">
            <div id="timebar-track-inner">

              <div id="timebar-track-passed" style={{
                  right: track_passed
              }}/>
              <div className="track-dot" style={{left:0}}/>
              <div className="track-dot" style={{left: "25%"}}/>
              <div className="track-dot" style={{left: "45%"}}/>
              <div className="track-dot" style={{left: "70%"}}/>
              <div className="track-dot" style={{left: "85%"}}/>
              <div className="track-dot-s" style={{left: "91%"}}/>
              <div className="track-dot-s" style={{left: "93%"}}/>
              <div className="track-dot-s" style={{left: "97%"}}/>
              <div className="track-dot" style={{left: "99%"}}/>
              <img src={this.state.asap_on ? "asap-head-yellow.png" : "asap-head.png"} id="playhead" style={{
                  display: this.state.zoom ? "none" : "block",
                  left: this.state.playhead_left
              }}/>
              <img src={this.state.asap_on ? "asap-head-yellow.png" : "asap-head.png"} id="playhead-z" style={{
                  display: this.state.zoom ? "block" : "none",
                  left: this.state.playhead_left
              }}/>
              <div id="head-caption" className={ this.state.zoom ? "z" : ""} style={{
                display: (this.state.caption ? "block" : "none"),
                left: this.state.right ? this.state.playhead_left -160 : this.state.playhead_left + 40
              }}>
                {this.state.caption}
              </div>
            </div>
          </div>
        </div>
      )
    }

}

class Slide0 extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        speed_syn: 1.0,
        low_pass: 4,
        wav: false,
        selection: 0,
        bass: false,
        invert: false
      };
    }

    adjust(last,d){
        return {}
    }

    componentDidMount(){
        var renderer = new PIXI.WebGLRenderer($(window).width(), $(window).height(), {transparent: true, antialias: true});
        document.getElementById("slide0-canvas").appendChild(renderer.view);
        var stage = new PIXI.Container();
        var loader = PIXI.loader;
        var frames = _.range(0,40);
        var movie;

        this.fragmentShader = `
            precision mediump float;
            uniform vec2 resolution;
            uniform float time;
            uniform float time_multi;
            uniform float freq;
            uniform float ts;

            const mat3 rgb2yiq = mat3(0.299, 0.587, 0.114, 0.595716, -0.274453, -0.321263, 0.211456, -0.522591, 0.311135);
            const mat3 yiq2rgb = mat3(1.0, 0.9563, 0.6210, 1.0, -0.2721, -0.6474, 1.0, -1.1070, 1.7046);

            void main(){
                // Fragment coords relative to the center of viewport, in a 1 by 1 coords sytem.
                vec2 uv = -1.0 + 2.0* gl_FragCoord.xy / resolution.xy;

                // But I want circles, not ovales, so I adjust y with x resolution.
                vec2 homoCoords = vec2( uv.x, 2.0* gl_FragCoord.y/resolution.x );

                // Sin of distance from a moving origin to current fragment will give us..... 
                vec2 movingOrigin1 = vec2(sin(time*.7*time_multi),+sin(time*1.7*time_multi));
                
                // ...numerous... 
                float frequencyBoost = freq; 
                
                // ... awesome concentric circles.
                float wavePoint1 = sin(distance(movingOrigin1, homoCoords)*frequencyBoost);
                
                // I want sharp circles, not blurry ones.
                float blackOrWhite1 = sign(wavePoint1);
                
                // That was cool ! Let's do it again ! (No, I dont want to write a function today, I'm tired).
                vec2 movingOrigin2 = vec2(-cos(time*2.0),-sin(time*3.0));
                float wavePoint2 = sin(distance(movingOrigin2, homoCoords)*frequencyBoost * ts);
                float blackOrWhite2 = sign(wavePoint2);
                
                // I love pink.
                vec3 pink = vec3(1.0, .5, .9 );
                vec3 darkPink = vec3(0.5, 0.1, 0.3);

                vec3 yColorPink = rgb2yiq * pink;
                float hue = mod(time, 360.0);
                float originalHuePink = atan(yColorPink.b, yColorPink.g);
                float finalHuePink = originalHuePink + hue;
                float chromaPink = sqrt(yColorPink.b*yColorPink.b+yColorPink.g*yColorPink.g);
                vec3 yFinalColor = vec3(yColorPink.r, chromaPink * cos(finalHuePink), chromaPink * sin(finalHuePink));
                vec3 finalPink = yiq2rgb*yFinalColor;

                vec3 yColorDPink = rgb2yiq * darkPink;
                float originalHueDPink = atan(yColorDPink.b, yColorDPink.g);
                float finalHueDPink = originalHueDPink + hue;
                float chromaDPink = sqrt(yColorDPink.b*yColorDPink.b+yColorDPink.g*yColorDPink.g);
                vec3 yFinalColorD = vec3(yColorDPink.r, chromaDPink * cos(finalHueDPink), chromaDPink * sin(finalHueDPink));
                vec3 finalDPink = yiq2rgb*yFinalColorD;
                
                // XOR virtual machine.
                float composite = blackOrWhite1 * blackOrWhite2;
                
                // Pinkization
                gl_FragColor = vec4(max( finalPink * composite, finalDPink), 1.0);
            }
        `
        this.eye_bg = new PIXI.Sprite.fromImage("grimes-gif/frame_0.gif")
        this.eye_bg.width = $(window).width()
        this.eye_bg.height = $(window).height()
        this.uniforms = {
            resolution: { type: "v2", value: {x: this.eye_bg.width, y: this.eye_bg.height}},
            time: {type: "1f", value: 0.0},
            freq: {type: "1f", value: 50.0},
            time_multi: {type: "1f", value: 1.0},
            ts: {type: "1f", value: 1.0}
        }
        this.shader = new PIXI.AbstractFilter(null, this.fragmentShader, this.uniforms)
        this.eye_bg.shader = this.shader;
        stage.addChild(this.eye_bg);
        this.invert_filter = new PIXI.filters.InvertFilter(); 
        this.eye_bg.filters = [this.invert_filter];


        frames = _.map(frames,function(i){
          loader.add("frame_"+i,"grimes-gif/frame_"+i+".gif")
          return "frame_"+i;
        })
        loader.load(_.bind(function(l,r){
          frames = _.map(frames,function(f){
            return r[f].texture;
          })
          movie = new PIXI.extras.MovieClip(frames);
          var movie_2 = new PIXI.extras.MovieClip(frames);
          var movie_3 = new PIXI.extras.MovieClip(frames);
          var movie_4 = new PIXI.extras.MovieClip(frames);
          var ar = movie.height/movie.width;
          var new_height = $(window).width() * ar
          var offset = $(window).height() - new_height;
          this.movie = movie
          this.movie_2 = movie_2
          this.movie_3 = movie_3
          this.movie_4 = movie_4

          window.movies = [movie_4,movie_3,movie_2,movie];
          var invert_filter = this.invert_filter;
          _(window.movies).each(function(m){
            m.gotoAndPlay(0); 
            m.width = $(window).width();
            m.height = m.width * ar;
            m.position.y = offset;
            m.anchor.x = 0.5;
            m.position.x = $(window).width()/2;
            m.animationSpeed = 0.48
            stage.addChild(m);
          })

          movie_2.scale.x = -1 * movie_2.scale.x;
          movie_4.scale.x = -1 * movie_4.scale.x;
          movie_2.alpha = 0;
          movie_3.alpha = 0;
          movie_4.alpha = 0;

          movie_3.scale.x = movie_3.scale.x * 2;
          movie_3.scale.y = movie_3.scale.y * 2;
          movie_4.scale.x = movie_4.scale.x * 2;
          movie_4.scale.y = movie_4.scale.y * 2;
          movie_3.blendMode = PIXI.BLEND_MODES.MULTIPLY;
          movie_4.blendMode = PIXI.BLEND_MODES.MULTIPLY;
          movie_3.position.y = -400;
          movie_4.position.y = -400;

          requestAnimationFrame( animate );
          
          var filter = new PIXI.filters.ColorMatrixFilter();
          movie.filters = [filter,this.invert_filter]
          movie_2.filters = [filter,this.invert_filter]
          this.color_filter = filter;
          this.color_filter.saturate(this.state.speed_syn * 2)
          this.color_filter.hue((this.state.speed_syn - 1) * 90,true)
        },this))
            //displacementFilter,
            //desatFilter,
            //frame = 0,
            //erik_top, erik_bot;

        //var text = new PIXI.Text(" I SAT ON THE GRASS AND\nREMEMBERED WHEN IT WAS\nA PARKING LOT ",{font : '100px Vice Gothic', fill : 0xffffff, align : 'center', padding: 100});
        //text.anchor.x = 0.5
        //text.anchor.y = 0.5
        //text.position.y = 200
        //text.blendMode = PIXI.BLEND_MODES.OVERLAY
        //text.alpha = 0.8

        //loader.add("erik-bottom", "erik-bottom.png")
        //loader.add("erik-top", "erik-top.png")
        //loader.add("displacement","displacement_map.jpg")
        //loader.load(function(l,r){
          //erik_bot = new PIXI.Sprite(r["erik-bottom"].texture) 
          //stage.addChild(erik_bot)
          //stage.addChild(text)
          //erik_top = new PIXI.Sprite(r["erik-top"].texture) 
          //stage.addChild(erik_top)
          //var displacement_map = new PIXI.Sprite(r["displacement"].texture)
          //displacementFilter = new PIXI.filters.DisplacementFilter(displacement_map);
          //desatFilter = new PIXI.filters.ColorMatrixFilter()
          //window.d = desatFilter
          //erik_top.filters = [desatFilter]
          //erik_bot.filters = [displacementFilter]
          //text.filters = [displacementFilter]
          //requestAnimationFrame( animate );
        //})

      //var that = this;

      window.AudioContext = window.AudioContext||window.webkitAudioContext;
      context = new AudioContext();
      var soundtrackBuffer = null;
      var request = new XMLHttpRequest();
      var freq = this.state.low_pass;
      var filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 22000 
      filter.Q.value = 0 
      window.bg_filter = filter;
      request.open('GET', "base-track.mp3", true);
      request.responseType = 'arraybuffer';
      request.onload = function() {
        context.decodeAudioData(request.response, function(buffer) {
          soundtrackBuffer = buffer;
          var source = context.createBufferSource();
          source.buffer = buffer;
          source.connect(filter)
          filter.connect(context.destination)
          source.loop = true;
          window.bg_source = source
          // Track is 85 bpm g# maj
          var request_3 = new XMLHttpRequest();
          request_3.open('GET', "bass.mp3", true);
          request_3.responseType = 'arraybuffer';
          request_3.onload = function() {
            context.decodeAudioData(request_3.response, function(buffer) {
              var bass_soundtrackBuffer = buffer;
              var bass_source = context.createBufferSource();
              bass_source.buffer = buffer;
              bass_source.loop = true;
              window.bass_source = bass_source
              var bass_gainNode = context.createGain();
              bass_source.connect(bass_gainNode)
              bass_gainNode.connect(context.destination)
              window.bass_gain = bass_gainNode
              bass_gain.gain.value = 0
              bass_source.playbackRate.value = 1.328125;
              source.start(0);
              bass_source.start(0);
              bass_source.loop = true
              // Track is 128 bpm 
            }, function(){});
          }
          request_3.send();
        }, function(){});
      }
      request.send();

      var request_2 = new XMLHttpRequest();
      request_2.open('GET', "vo.mp3", true);
      request_2.responseType = 'arraybuffer';
      request_2.onload = function() {
        context.decodeAudioData(request_2.response, function(buffer) {
          soundtrackBuffer = buffer;
          var source = context.createBufferSource();
          source.buffer = buffer;
          source.loop = true;
          window.vo_source = source
          var gainNode = context.createGain();
          source.connect(gainNode)
          gainNode.connect(context.destination)
          window.vo_gain = gainNode
          // Track is 85 bpm g# maj
        }, function(){});
      }
      request_2.send();
      

      $(document).on("keydown",_.bind(function(e){
        var selection = this.state.selection;

        if(e.keyCode === 16){
            var selection = (this.state.selection + 1) % 4
            this.setState({selection: selection})
        }
        
        if(e.keyCode === 13 && selection === 0){
          var speed = (this.state.speed_syn + 0.2) % 1.6; 
          this.setState({speed_syn: speed})
        } else if(e.keyCode === 13 && selection === 1){
          var low_pass = (this.state.low_pass + 1) % 6; 
          this.setState({low_pass: low_pass})
        } else if (e.keyCode === 13 && selection === 2){
          var vo = ! this.state.wav;
          this.setState({wav: vo})
        } else if (e.keyCode === 13 && selection === 3){
          var bass = ! this.state.bass;
          this.setState({bass: bass})
        }

        if(e.keyCode === 13){
          this.setState({invert: true})
        }

      },this))

      $(document).on("keyup",_.bind(function(e){
        if(e.keyCode === 13){
          this.setState({invert: false})
        }
      },this))

      var uniforms = this.uniforms;
      var state = this.state;
      var that = this;
      function animate(ts) {
              requestAnimationFrame( animate );
              uniforms.time.value = ts/1000;
              uniforms.freq.value = [5.0,10.0,20.0,40.0,60.0,100.0][that.state.low_pass]
              uniforms.time_multi.value = [6.0,4.0,2.0,1.5,1.0,0.8][that.state.low_pass]
              uniforms.ts.value = that.state.speed_syn
              //frame += 1
              //var wave = (frame % 40)
              //if(wave > 20){
                //wave = 40 - wave
              //}
              //if(window.source){
                //window.source.playbackRate.value = that.state.speed
              //}
              //displacementFilter.scale.x = Math.random() * that.state.wave
              //displacementFilter.scale.y = Math.random() * that.state.wave
              //desatFilter.saturate(that.state.top_alpha - 1);
              //text.position.x = that.state.left
              //erik_bot.alpha = that.state.top_alpha;
              renderer.render(stage);
          }
    }

    render(){
        var bar_height = this.state.speed_syn * 100;
        var bar_height_2 = this.state.low_pass * 25 + 10;
        var bar_height_3 = this.state.wav ? 100 : 50;
        var bar_height_4 = this.state.bass ? 100 : 50;
        var bar_selected = this.state.selection == 0;
        var bar_selected_2 = this.state.selection == 1;
        var bar_selected_3 = this.state.selection == 2;
        var bar_selected_4 = this.state.selection == 3;

        if(window.bg_source){
          window.bg_source.playbackRate.value = this.state.speed_syn
          window.bg_filter.frequency.value = [200,500,1000,4000,22000,16000][this.state.low_pass];
          window.bass_source.playbackRate.value = this.state.speed_syn * 1.328125;
          window.bg_filter.Q.value = [0.2,0.1,0.1,0.1,0,0.2][this.state.low_pass];
          bass_gain.gain.value = this.state.bass ? 1.0 : 0
        }

        if(window.vo_source){
            if(this.state.wav && ! this.started){
                this.started = true;
                vo_source.start();
                vo_gain.gain.value = 0.7
            } else if (this.state.wav && this.started) {
                vo_gain.gain.value = 0.7
            } else if(!this.state.wav) {
                vo_gain.gain.value = 0
            }
        }

        if(this.movie){
            this.movie.animationSpeed = 0.48 * this.state.speed_syn
            this.movie_2.animationSpeed = 0.48 * this.state.speed_syn
            this.color_filter.saturate(this.state.speed_syn * 2)
            this.color_filter.hue((this.state.speed_syn - 1) * 90,true)
            this.movie_2.alpha = this.state.bass ? 1.0 : 0
            this.movie_3.alpha = this.state.wav ? 1.0 : 0;
            this.movie_4.alpha = this.state.wav && this.state.bass ? 1.0 : 0;
        }

        if(this.invert_filter){
            this.invert_filter.invert = (this.state.invert ? 1 : 0);
        }

        return (
            <div id="slide0">
                <div id="slide0-canvas"></div>
                <div id="bar-1" style={{
                    position: "absolute",
                    bottom:10,
                    left:10,
                    backgroundColor: "red",
                    height: bar_height,
                    width: 50,
                }} className={bar_selected ? "selected-bar control-bar" : "control-bar"}></div>
                <div id="bar-2" style={{
                    position: "absolute",
                    bottom:10,
                    left:70,
                    backgroundColor: "blue",
                    height: bar_height_2,
                    width: 50
                }} className={bar_selected_2 ? "selected-bar control-bar" : "control-bar"}></div>
                <div id="bar-3" style={{
                    position: "absolute",
                    bottom:10,
                    left:130,
                    backgroundColor: "yellow",
                    height: bar_height_3,
                    width: 50
                }} className={bar_selected_3 ? "selected-bar control-bar" : "control-bar"}></div>
                <div id="bar-4" style={{
                    position: "absolute",
                    bottom:10,
                    left:190,
                    backgroundColor: "green",
                    height: bar_height_4,
                    width: 50
                }} className={bar_selected_4 ? "selected-bar control-bar" : "control-bar"}></div>
            </div>
        )
    }
}
class Slide1 extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        scroll_top: 0,
        stretch: 0,
        frame: 0,
        frame_2: 0,
        offset_y: -200
      };
    }

    adjust(last,d){

        var conti = new Conti(0,0.1,"pct_scroll",function(pct,t){
          var new_frame = (d.pct_scroll / 0.0003) % 95 
          t.frame = new_frame
          t.frame_2 = 23
          t.stretch = 0;
          t.opacity = 1;
          t.offset_y = -300;
          return t;
        }).abut(0.12,function(pct,t){
          t.frame = 48;
          t.frame_2 = 23
          t.stretch = Math.linearTween(pct,0,40000,1)
          t.opacity = 1;
          t.offset_y = -300;
          return t;
        }).abut(0.13,function(pct,t){
          t.frame = 48;
          t.frame_2 = 23
          t.stretch = 40000
          t.opacity = 1 - pct;
          t.offset_y = -300;
          return t;
        }).abut(0.15,function(pct,t){
          t.frame = 48;
          t.frame_2 = 23
          t.stretch = Math.linearTween(pct,40000,-40000,1)
          t.opacity = 0;
          t.offset_y = Math.linearTween(pct,-300,300,1);
          return t;
        }).abut(1,function(pct,t){
          var new_frame = (pct / 0.001) + 23;
          if(new_frame > 66){
            new_frame = 66
          }
          console.log("f",new_frame)
          t.frame = 48;
          t.frame_2 = new_frame;
          t.stretch = 0;
          t.opacity = 0;
          t.offset_y = 0;
          return t;
        })
   
        var trans_data = conti.run(d,{})
        return trans_data
    }
    componentDidMount(){
        var renderer = new PIXI.WebGLRenderer($(window).width(), $(window).height(), {transparent: true, antialias: true});
        document.getElementById("slide1").appendChild(renderer.view);
        var stage = new PIXI.Container();
        var frames = _.range(0,95);
        var frames_2 = _.range(0,68);
        frames = _.map(frames,function(i){return PIXI.Texture.fromImage("face-gif/frame_"+i+".gif")})
        frames_2 = _.map(frames_2,function(i){return PIXI.Texture.fromImage("maddie-gif/frame_"+i+".gif")})
        var movie = new PIXI.extras.MovieClip(frames);
        var movie_2 = new PIXI.extras.MovieClip(frames_2);
        var new_height = $(window).width() / ar;
        var ar = 1.77
        movie.gotoAndStop(0)
        movie_2.gotoAndStop(0)
        stage.addChild(movie_2);
        stage.addChild(movie);
        var colorMatrix = new PIXI.filters.ColorMatrixFilter();
        stage.filters = [colorMatrix]
        colorMatrix.desaturate();
        TRV.face = movie;
        TRV.face_2 = movie_2;
        requestAnimationFrame( animate );
        var that = this;
        
        function animate() {
                    
                requestAnimationFrame( animate );

                movie.width = $(window).width();
                movie_2.width = $(window).width();
                movie.height = ($(window).width() / ar) + that.state.stretch;
                movie_2.height = ($(window).width() / ar) + that.state.stretch;
                movie.y = -1 * that.state.stretch;
                movie_2.y = that.state.offset_y;
                movie.alpha = that.state.opacity
                movie.gotoAndStop(that.state.frame);
                movie_2.gotoAndStop(that.state.frame_2);
                renderer.render(stage);
            }
    }
    render(){
        console.log("st",this.state.scroll_top)
        var fadeIn = function(){return 0}
        var fadeOut = function(){return 1}
        return (
            <div id="slide1">
                <div className="vid-title big">
                    WE TALKED FOR A FEW HOURS
                </div>
            </div>
        )
    }
}

class Slide5 extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        perspective: 190,
        hit: false,
        current_bg: 0,
        current_mid: 0
      };
    }

    adjust(last,d){
        var conti = new Conti(0,0.9,"pct_scroll",function(pct,t){
          t.perspective = 190;
          return t;
        }).abut(1,function(pct,t){
          t.perspective = Math.linearTween(pct,190,50,1)
          return t;
        })
   
        var trans_data = conti.run(d,{})

        return trans_data;
    }
    componentDidMount(){
        $(window).on("keydown",_.bind(function(e){
            var pct_scroll = $(window).scrollTop() / ($("body").height() - $(window).height());
            if(e.keyCode === 16 && pct_scroll > 0.9){
              if(TRV.timebar.state.current_dot && TRV.timebar.state.current_dot[0] === "91"){
                var current_bg = this.state.current_bg;
                this.setState({current_bg: (current_bg + 1) % 2})
              } else if(TRV.timebar.state.current_dot && TRV.timebar.state.current_dot[0] === "93"){
                var current_mid = this.state.current_mid;
                this.setState({current_mid: (current_mid + 1) % 2})
              }
            }
        },this))    
    }
    render(){
        return (
          <div id="last-slide" style={{
            "-webkit-perspective": this.state.perspective
          }}>
            <img id="split-bot" className="full-img" src={"rocky-split-bot-"+this.state.current_bg+".png"}/>
              <img id="split-mid" className="full-img" src={"rocky-split-mid-"+this.state.current_mid+".png"} style={{
                }}/>
                <img id="split-top" className="full-img" src="rocky-split-top.png" style={{
                
                    display: this.state.hit ? "none" : "block"
                }}/>

              <div className="vid-title" style={{
                  display: (this.state.hit ? "block" : "none")
              }}>A$AP disappeared into the sea whence he came</div>
              </div>
        )
    }
}

class Slide4 extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        bg_top: 0
      };
    }

    adjust(last,d){
        var target_height = ($(window).height()) * -1;
        var conti = new Conti(0,0.9,"pct_scroll",function(pct,t){
          t.bg_top = 0;
          return t;
        }).abut(0.91,function(pct,t){
          t.bg_top = Math.linearTween(pct,0,target_height,1)
          return t;
        }).abut(1,function(pct,t){
          t.bg_top = target_height;
          return t;
        })
   
        var trans_data = conti.run(d,{})

        return trans_data;
    }
    componentDidMount(){
        var src ="bass-casino.mp3"
        var audio = new Audio();
        audio.src = src;
        audio.autoplay = true;
        audio.id = "bass-casino";
        document.getElementById("slide4").appendChild(audio)
        // analyser stuff
        var context = new webkitAudioContext();
        var analyser = context.createAnalyser();
        analyser.fftSize = 2048;
         
        // connect the stuff up to eachother
        var source = context.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(context.destination);

        var renderer = new PIXI.WebGLRenderer($(window).width(), $(window).height(), {transparent: true, antialias: true});
        document.getElementById("slide4").appendChild(renderer.view);
        var stage = new PIXI.Container();
        var sprite = PIXI.Sprite.fromImage("party.jpg");
        var ar = 1.5
        var new_height = $(window).width() / ar;
        sprite.width = $(window).width();
        sprite.height = new_height;
        stage.addChild(sprite);

        var blur = new PIXI.filters.BlurXFilter()
        blur.blur = 0
        var invert = new PIXI.filters.InvertFilter()
        invert.invert = 0
        var noise = new PIXI.filters.NoiseFilter();
        noise.noise = 0
        var split = new PIXI.filters.RGBSplitFilter();
        split.red = (new PIXI.Point(0, 0))
        split.green = (new PIXI.Point(0, 0)) 
        split.blue = (new PIXI.Point(0, 0))
        sprite.filters = [blur]

        animate();
        var draw_new = false;
        function animate() {
            requestAnimationFrame(animate);

            var num_bars = 60;
            var data = new Uint8Array(2048);
            analyser.getByteFrequencyData(data);

            var bass = _.take(_.drop(data,10),30)
            var avg = _.reduce(bass,function(m,i){return m + i},0) / 30

            var clipped_avg = avg - 155 > 0 ? avg - 155 : 0

            blur.blur = (clipped_avg /100) * 20
            if(draw_new){
                var graphics = new PIXI.Graphics();
                var start_x = Math.random() * $(window).width()
                var start_y = Math.random() * $(window).height()
                var end_x = Math.random() * $(window).width()
                var end_y = Math.random() * $(window).height()
                graphics.lineStyle(90, 0xffffff, 1);
                graphics.moveTo(start_x,start_y);
                graphics.lineTo(end_x,end_y);
                graphics.endFill();
                stage.addChild(graphics);

                draw_new = false
            }

            
            renderer.render(stage);
        }

        $(window).on("keydown",_.bind(function(e){
            if(e.keyCode === 16 && $(window).scrollTop() > 20300){
                draw_new = true; 
            }
        },this))    
    }
    render(){
        return (
          <div id="slide4" style={{
            top: this.state.bg_top
          }}>
            <div className="vid-title" style={{
            }}>The party continued like a real fun event</div>
            <div id="slide4-text"/>
          </div>
        )
    }
}
class Slide3 extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        current_step: 0,
        burst: 0,
        bg_top: 0
      };
    }

    adjust(last,d){
        var target_height = ($(window).height()) * -1;
        var conti = new Conti(0,0.80,"pct_scroll",function(pct,t){
          t.bg_top = 0;
          return t;
        }).abut(0.85,function(pct,t){
          t.bg_top = Math.linearTween(pct,0,target_height,1)
          return t;
        }).abut(1,function(pct,t){
          t.bg_top = target_height;
          return t;
        })
   
        var trans_data = conti.run(d,{})

        return trans_data;
    }
    componentDidMount(){
        $(window).on("keydown",_.bind(function(e){
            if(e.keyCode === 16){
              clearInterval(TRV.shrink);
              var current_step = this.state.current_step;
              if(current_step < 12){
                this.setState({current_step: current_step + 1});
              } else {
                TRV.burst_i = 0
                clearInterval(TRV.burst)
                      clearInterval(TRV.unburst)
                TRV.burst = setInterval(_.bind(function(){
                    TRV.burst_i = TRV.burst_i + 1;
                    if(TRV.burst_i > 7){
                      clearInterval(TRV.burst)
                      clearInterval(TRV.unburst)
                      TRV.unburst = setInterval(_.bind(function(){
                        TRV.burst_i = TRV.burst_i - 1;
                        if(TRV.burst_i >= 0){
                            this.setState({burst: TRV.burst_i, up: false})
                        } else {
                            clearInterval(TRV.unburst)
                        }
                      },this),66)
                    } else {
                        this.setState({burst: TRV.burst_i, up: true, hit: true})
                    }
                },this),66) 
              }
            }
        },this))    
        $(window).on("keyup",_.bind(function(e){
            if(e.keyCode === 16){
                clearInterval(TRV.shrink);
                TRV.shrink = setInterval(_.bind(function(){
                    var current_step = this.state.current_step - 1;
                    this.setState({current_step: current_step});
                    if(current_step === 0){
                        clearInterval(TRV.shrink);
                    } 
                },this),66)
            }
        },this))    
    }
    render(){
        var scale_x = Math.linearTween(this.state.current_step,1,1.7,30);
        var scale_y = Math.linearTween(this.state.current_step,1,2.0,30);
        var burst_scale = Math.linearTween(this.state.burst,0,2,12)
        var burst_opacity = Math.linearTween(this.state.burst,0,1,12)
        var flash = this.state.burst === 1 && this.state.up
        if(flash){
            $("#smash")[0].play()
        }

        return (
          <div id="slide3" style={{
            position: "fixed",
            top: this.state.bg_top
          }}>
            <audio id="smash">
              <source src="smash.mp3" type="audio/mpeg"/>
            </audio>
            <div id="black-back-text">
                He slammed some dude's hand and the guy starts crying. "You're my hero, A$AP." Rocky smiles and disappears.
            </div>
            <img id="high-five-base" className="highfive" src="high-five-base.png" style={{
                display: this.state.hit ? "none" : "block"
            }}/>
            <img id="high-five-guy" className="highfive" src="high-five-guy.png" style={{transform: "scale(" + scale_x+"," + scale_y + ")"}}/>
            <img id="high-five-top" className="highfive" src="high-five-top.png" style={{
                display: this.state.flash ? "none" : "block"
            }}/>
            <img id="starburst" src="starburst.png" style={{
              transform: "scale(" + burst_scale + ")",
              opacity: burst_opacity
            }}/>
          </div>
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
        backgroundImage: "url('asap-title.png')",
        backgroundSize: "cover",
        zIndex: 2000000
      }}>
      </div>
    )
  }
}

TRV.city = {
  "bar": {
      lat: 40.719770091561315,
      lng: -73.9578366279602,
      full_name: "Trilby's Bar",
      item: "hills-item"
  },
  "park": {
      lat: 40.72061576057116,
      lng: -73.95473599433899,
      full_name: "City Park IV",
      item: "hills-item"
  },
  "club": {
      lat: 40.71924154297441,
      lng: -73.9540708065033,
      full_name: "The Bounce Club",
      item: "square-item"
  },
  "resto": {
      lat: 40.72007908725286,
      lng: -73.95987510681152,
      full_name: "Spicee's Meatball",
      item: "crubby-item"
  },
  "afterhours": {
    lat: 40.71704598853704, 
    lng: -73.95642042160034,
    full_name: "Furry's Bar",
    item: "club-item"
  }
}

TRV.adjustAll = function(){
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
}

$(function() {

  $("#page").height($(window).height() * 30);
  TRV.last_scroll = $(window).scrollTop();
  TRV.root = ReactDOM.render(<TestComponent/>, document.getElementById('track'));
  $(window).on("scroll",_.throttle(TRV.adjustAll,5));
  setTimeout(function(){
    $("#page").css({visibility: "visible"});
    TRV.adjustAll();
  },100)
  $(window).on("keydown",function(e){
    if(e.keyCode === 65){
        _($("audio")).each(function(a){
            a.volume = 0;
        })
    }
  })

});
