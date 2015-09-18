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
        caption: false,
        zindex:100
      };
    }

    togglePov(t){
      var current_pov = _.clone(TRV.streetView.getPov());
      if(t){
          current_pov.heading = 257.68007576992042;
          this.pov_toggle = true;
      } else {
          current_pov.heading = 77.68007576992042;
          this.pov_toggle = false;
      }
      TRV.animatePov(TRV.streetView,current_pov);
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
         })

         var asap = {
              url: 'asap-head-yellow.png',
              size: new google.maps.Size(90,110),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(40,55),
              zIndex: 10
         }
          var marker = new google.maps.Marker({
                position: {lat: TRV.city["bar"].lat, lng: TRV.city["bar"].lng},
                map: TRV.map,
                zIndex: 10,
                icon: asap
              });
      })
      
      this.setUpPano();
      $(window).on("keydown",_.bind(function(e){
          if(e.keyCode == 16){
            this.togglePov(true);
          }
      },this))
      $(window).on("keyup",_.bind(function(e){
          if(e.keyCode == 16){
            this.togglePov(false);
          }
      },this))

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
      }).abut(1, function(pct,t){
        t.bg_top = 0;
        t.zindex = 20;
        return t;
      })
 
      var trans_data = conti.run(d,{})

      var pano_conti = new Conti(0,0.45,"pct_scroll",function(clamped_pct, t){
          TRV.streetView.setVisible(false);
          t.caption = false;
          t.new_pitch = 64.9837616957764;
          t.new_slide = 10;
          return t;
      }).abut(0.47, function(clamped_pct, t){
          TRV.streetView.setVisible(true);
          t.caption = true;
          t.new_pitch = 64.9837616957764;
          t.new_slide = 10;
          return t;
      }).abut(0.57, _.bind(function(clamped_pct, t){
          TRV.streetView.setVisible(true);
          t.caption = true;
          t.new_pitch = Math.linearTween(clamped_pct, 64.9837616957764, -64.9837616957764, 1)
          t.new_slide = Math.linearTween(clamped_pct,10,-100,1);
          return t;
      },this)).abut(1, _.bind(function(clamped_pct, t){
          TRV.streetView.setVisible(true);
          t.caption = true;
          t.new_pitch = 0;
          t.new_slide = -100;
          return t;
      },this))

      trans_data = pano_conti.run(d,trans_data)

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
                <h6 className="slide-words" style={{
                  top: this.state.new_slide + "%",
                  display: this.state.caption ? "block" : "none"
                }}>
                    At 6:00 PM, I got the text. "Meet Yung Tourguide in the middle of Marseille and take this pill". A pill popped out of my phone, because it was the future. I was gonna have a crazy night in the service of journalism.
                </h6>
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
        playhead_left: -29
      };
      this.dots = {
        0: "",
        25: "I wanna get closer. Hold 'SHIFT' and scroll.",
        45: "What's over there? Hold 'SHIFT' to look around.",
        70: "",
        99: ""
      }
    }

    componentDidMount(){
        $(window).on("keydown",_.bind(function(e){
            if(e.keyCode === 16){
              $("#bass-hit")[0].play();
              this.setState({zoom: true})
            }
        },this))    
        $(window).on("keyup",_.bind(function(e){
            if(e.keyCode === 16){
              $("#bass-hit-2")[0].play();
              this.setState({zoom: false})
            }
        },this))    
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
          <audio id="bass-casino" autoPlay>
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
        bg_top: 0,
        caption: "",
        caption_2: "",
        toggle: false,
        intro: true,
        intro_text: "A$AP Rocky is sitting across from me at a table inside Brooklyn’s Sound Factory Studios. He looks away from the table, away from a sparse dinner he occasionally picks at, away from me, and repeats, under his breath, the two words I’ve never heard him say, and didn’t think I ever would: “No comment.”",
        intro_text_2: "No comment"
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

      var caption_conti = new Conti(0,0.25,"pct_scroll",function(pct,t){
        t.caption = ""
        t.caption_2 = ""
        t.intro = true
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
                {this.state.toggle ? this.state.intro_text_2 : this.state.intro_text}
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

});
