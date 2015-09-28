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
        <Title/>
        <HomeMap/>
        <Timebar/>
        <Slide5/>
        <Slide4/>
        <Slide3/>
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

class Slide1 extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        frame: 0,
        frames: 22,
        base_bg: "round-gif",
        bg_top: 0,
        caption: "",
        caption_2: "",
        toggle: false,
        intro: true,
        intro_text: "A$AP Rocky is sitting across from me at a table inside Brooklyn’s Sound Factory Studios. He looks away from the table, away from a sparse dinner he occasionally picks at, away from me, and repeats, under his breath, the two words I’ve never heard him say, and didn’t think I ever would: “No comment.”<br/><br/>To be fair, it’s been a long day, and he’s barely on the other end of it. A studio all-nighter that ended at 8 a.m. A photo shoot. This interview. A corporate fashion meeting. But despite his schedule, the “no comment” is still a surprise, even though it’s in response to a question about his love life.",
        intro_text_2: "No comment",
        intro_top: 0
      };
    }

    adjust(last,d){
      var new_frame = Math.round(d.pct_scroll/0.002) % this.state.frames,
          target_height = -1300;
      var conti = new Conti(0,0.41,"pct_scroll",function(pct,t){
        t.bg_top = 0;
        return t;
      }).abut(0.46,function(pct,t){
        t.bg_top = Math.linearTween(pct,0,target_height,1)
        return t;
      }).abut(1,function(pct,t){
        t.bg_top = target_height;
        return t;
      })
 
      var trans_data = conti.run(d,{})
      trans_data.frame = new_frame;
      var delta = $(".intro-cropper-inner").innerHeight() - $(".intro-cropper").innerHeight();

      var caption_conti = new Conti(0,0.2,"pct_scroll",function(pct,t){
        t.caption = ""
        t.caption_2 = ""
        t.intro = true
        t.intro_top = 0
        return t;
      }).abut(0.23,function(pct,t){
        t.caption = ""
        t.caption_2 = ""
        t.intro = true
        t.intro_top = Math.linearTween(pct,0,-delta,1)
        return t;
      }).abut(0.25,function(pct,t){
        t.caption = ""
        t.caption_2 = ""
        t.intro = true
        t.intro_top = -delta
        return t;
      }).abut(0.3,function(pct,t){
        t.intro = false
        t.caption = "Between the bar and the club, in the magic hour, we broke down in the mountains."
        t.caption_2 = "Between the bar and the club, in the magic hour, we stopped our car for narrative impact."
        return t;
      }).abut(0.35,function(pct,t){
        t.intro = false
        t.caption = "The hills were the kind of gold you find in lion manes."
        t.caption_2 = "The hills were just hills, ya know?."
        return t;
      }).abut(1,function(pct,t){
        t.intro = false
        t.caption = "We felt like we were in some sort of lyrical interactive media."
        t.caption_2 = "We felt like we were in some sort of bullshit interactive media."
        return t;
      })
      trans_data = caption_conti.run(d,trans_data)


      return trans_data;
    }
    componentDidMount(){
        $(window).on("keydown",_.bind(function(e){
            if(e.keyCode === 16){
              var pct_scroll = $(window).scrollTop() / ($("body").height() - $(window).height());
              var new_frame = Math.round(pct_scroll/0.002) % 14; 
              this.setState({frames: 14, base_bg: "round-gif-2", frame: new_frame, toggle: true})
            }
        },this))    
        $(window).on("keyup",_.bind(function(e){
            if(e.keyCode === 16){
              this.setState({frames: 22, base_bg: "round-gif", toggle: false})
            }
        },this))    
    }
    render(){
        return (
          <div className="full-card" style={{
            top: this.state.bg_top,
            zIndex:98
          }}>
            <img className="full-gif" src={this.state.base_bg + "/frame_" + this.state.frame + ".gif"} style={{
            }}/>
            <div className="vid-intro" style={{
                display: (this.state.intro ? "block" : "none") 
            }}> 
                <div className="intro-cropper">
                  <div className="intro-cropper-inner" dangerouslySetInnerHTML={{__html: this.state.toggle ? this.state.intro_text_2 : this.state.intro_text}} style={{
                    top: this.state.intro_top 
                  }}>
                    </div>
                </div>
            </div>
            <div className="vid-title" style={{
                display: (this.state.toggle ? "none" : "block")
            }}>{this.state.caption}</div>
            <div className="vid-title" style={{
                display: (this.state.toggle ? "block" : "none")
            }}>{this.state.caption_2}</div>
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
class Slide2 extends ScanComponent {
    constructor(props) {
      super(props);
      this.state = {
        frame: 0,
        frames: 20,
        base_bg: "barbie-gif",
        bg_top: 0
      };
    }

    adjust(last,d){
        var new_frame = Math.round(d.pct_scroll/0.002) % this.state.frames;
        var target_height = ($("#barbie-gif").height() + 300) * -1;

        var conti = new Conti(0,0.45,"pct_scroll",function(pct,t){
          t.bg_top = 0;
          return t;
        }).abut(0.47,function(pct,t){
          t.bg_top = Math.linearTween(pct,0,target_height,1)
          return t;
        }).abut(1,function(pct,t){
          t.bg_top = target_height;
          return t;
        })
   
        var trans_data = conti.run(d,{frame: new_frame})

        return trans_data;
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
          <img style={{
            top: this.state.bg_top,
            zIndex: 97
          }} id="barbie-gif" className="full-gif" src={this.state.base_bg + "/frame_" + this.state.frame + ".gif"}/>
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
