var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var polyline = require('polyline');

Math.linearTween = function (t, b, c, d) {
  //
  return c*t/d + b;
};
Math.easeOutBack = function (t, b, c, d, s) {
    if (s === undefined) s = 1.70158;
    return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b;
};
Math.easeInOutQuad = function (t, b, c, d) {
  t /= d/2;
  if (t < 1) return c/2*t*t + b;
  t--;
  return -c/2 * (t*(t-2) - 1) + b;
};

// "markers": [{"name": "crown-vic", "anchor": 0.75}];

var scene = [

    // { "name": "marseille",
    //   "type": "title",
    //   "title": "MARSEILLE",
    //   "backgroundImage": "/erik3/marseille_1.jpg",
    //   "fontSize": 250},
    {"name": "progressmap",
     "type": "routemap"},
    // {"name": "square",
    // "type": "slide1"},
    // {"name": "slide2",
    // "type": "slide2"},
    // { "name": "intro",
    //   "copy": "We just moved to a new office, which is in a different part of the neighborhood than we are used to. In New York, even something as small as a few blocks can change everything. To show us around, we hooked up with VICE veteran, Ben Kammerle, to show us all the spots.",
    //   "type": "marker",
    //   "left": null,
    //   "right": null},
    // { "name": "12-chairs",
    //   "copy": "He first took us to 12 chairs. One of the best new restaurants in the neighborhood and right next door to the office. It’s run by some badass Israelis - we talked to the owner and got his story. He ordered us some hummus and falafel. It was awesome but Ben was extremely rude to the staff. Ben was being a total jerk, but thank goodness 12 Chairs has some incredible mint lemonade to calm us down.",
    //   "type": "marker",
    //   "left": null,
    //   "right": null},
    //  { "name": "timelapse",
    //   "type": "timelapse",
    //   "marker": "crown-vic",
    //   "anchor": 0.75},
    // { "name": "crown-vic",
    //   "copy": "To Ben, Brooklyn in the summer means bars with backyards. \"Don’t even mess around with ones that don’t.\" he says, \"No one will be there.\" He took us to one of the best backyards, Crown Victoria. Probably because he’s cheap. In the back of the bar was a great taco truck... Great drinks... And tons of space to waste away your day. In brooklyn, day drinking is encouraged. There’s a tone of games to wile away the day. Cornholing. I don’t know why they call it that. Horseshoes. Not to mention, on sundays they roast an entire pig",
    //   "type": "marker",
    //   "left": null,
    //   "right": null},
    // { "name": "fireworks-transition",
    //   "type": "transition",
    //   "marker": "crown-vic",
    //   "anchor": 0.20},
    // { "name": "crown-vic-2",
    //   "copy": "To Ben, Brooklyn in the summer means bars with backyards. \"Don’t even mess around with ones that don’t.\" he says, \"No one will be there.\" He took us to one of the best backyards, Crown Victoria. Probably because he’s cheap. In the back of the bar was a great taco truck... Great drinks... And tons of space to waste away your day. In brooklyn, day drinking is encouraged. There’s a tone of games to wile away the day. Cornholing. I don’t know why they call it that. Horseshoes. Not to mention, on sundays they roast an entire pig",
    //   "type": "marker",
    //   "left": null,
    //   "right": null}
      ];

function createViewport(Component, container) {
  class Viewport extends React.Component {
    getChildContext() {
      return {
        getPercentage: this.getPct.bind(this),
        getPercentageInverse: this.getInv.bind(this),
        ...this.state
      };
    }

    componentWillMount() {
      var viewportWidth, viewportHeight;
      if (container === document.body) {
        [viewportWidth, viewportHeight] = [$(window).width(), $(window).height()];
      } else {
        [viewportWidth, viewportHeight] = [$(container).width(), $(container).height()];
      }
      if (!viewportWidth || !viewportHeight) {
        throw new Error("Viewport must have a non-zero width and height");
      }

      this.setState({
        viewportWidth, viewportHeight,
        viewportLeft: 0, viewportTop: 0,
        contentHeight: (viewportHeight*30), adjustedViewportTop: 0,
        pctScroll: 0
      });
    }

    componentDidMount() {
      $(window).on('scroll', _.throttle(this.handleScroll.bind(this), 5));
    }

    render() {
      var style = {
        width: this.state.viewportWidth,
        height: this.state.contentHeight,
      };
      return (
        <div style={style}>
          <Component ref="viewportRoot" />
        </div>
      );
    }

    getPct(ref, anchor) {
      var component = this.bfs(ref);
      return component.getPct(anchor);
    }

    getInv(ref, anchor) {
      var component = this.bfs(ref);
      return component.getInv(anchor);
    }

    handleScroll(ev) {
      var viewportLeft = $(ev.target).scrollLeft(),
          viewportTop = $(ev.target).scrollTop(),
          contentHeight = this.state.contentHeight,
          adjustedViewportTop = (viewportTop / this.state.viewportHeight) * (contentHeight * 0.1),
          pctScroll = viewportTop / (contentHeight - this.state.viewportHeight);
      this.setState({viewportLeft, viewportTop, contentHeight, adjustedViewportTop, pctScroll});
    }

    bfs(ref) {
      let items = [];
      let path = [];

      var buildPath = function(path) { return path.reverse().join(' -> '); };

      var search = function(items, goal, path) {
        if(items.length === 0) { throw new Error('Item not found.'); }
        let [refName, component] = items.shift();
        if(goal === refName) { return component; }
        return search(_.pairs(component.refs).concat(items), goal, path.concat(refName));
      };

      return search(_.pairs(this.refs), ref, []);
    }
  }

  Viewport.childContextTypes = {
    viewportWidth: React.PropTypes.number.isRequired,
    viewportHeight: React.PropTypes.number.isRequired,
    viewportLeft: React.PropTypes.number.isRequired,
    viewportTop: React.PropTypes.number.isRequired,
    contentHeight: React.PropTypes.number.isRequired,
    adjustedViewportTop: React.PropTypes.number.isRequired,
    pctScroll: React.PropTypes.number.isRequired,
    getPercentage: React.PropTypes.func.isRequired,
    getPercentageInverse: React.PropTypes.func.isRequired,
  };

  return Viewport;
}

class Root extends React.Component {
  buildComponents(content) {
    return content.map((el, i) => {
      switch (el.type) {
        case "marker":
          return <MarkerComponent ref={el.name} copy={el.copy} key={el.name} idx={i}  />;
        case "transition":
          return <TransitionComponent ref={el.name} marker={el.marker} anchor={el.anchor} key={el.name}  />
        case "timelapse":
          return <Timelapse ref={el.name} marker={el.marker} anchor={el.anchor} key={el.name} />
        case "title":
          return <Title ref={el.name} title={el.title} backgroundImage={el.backgroundImage} key={el.name} />
        case "slide1":
          return <Slide1 ref={el.name} key={el.name} />
        case "slide2":
          return <Slide2 ref={el.name} key={el.name} />
        case "routemap":
          return <RouteMap ref={el.name} key={el.name} />
        default:
          throw new Error("Unrecognized Component Type: " + el.type);
      }
    });
  }

  render() {
    var content = this.buildComponents(scene);
    return (
      <div>
        {content}
      </div>
    );
  }
}

Root.contextTypes = {
  viewportHeight: React.PropTypes.number.isRequired,
  viewportTop: React.PropTypes.number.isRequired,
  viewportWidth: React.PropTypes.number.isRequired,
  adjustedViewportTop: React.PropTypes.number.isRequired,
};

class Base extends React.Component {
  constructor(props) {
    super(props);
  }

  getPct(anchor) {
    var {viewportHeight, adjustedViewportTop} = this.context,
      $p = $(ReactDOM.findDOMNode(this)),
      el_height = $p.outerHeight(),
      el_top = $p.position().top,
      scroll_anchor = adjustedViewportTop + (viewportHeight * anchor),
      pct_elapsed,
      pct_elapsed_raw;
      // isActive = ($p.attr("data-activate") === "true") ? true : false;

    if (el_top > scroll_anchor) {
      pct_elapsed = 0;
    } else if (el_top + el_height < scroll_anchor) {
      pct_elapsed = 1.0;
    } else {
      pct_elapsed = (scroll_anchor - el_top) / el_height;
    }
    pct_elapsed_raw = (scroll_anchor - el_top) / el_height;
    //el_id: $p.attr("id"), isActive: isActive
    return {pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw};
  }

  getInv(anchor) {
    var {viewportHeight, viewportTop} = this.context,
      $p = $(ReactDOM.findDOMNode(this)),
      el_height = $p.outerHeight(),
      el_top = $p.position().top,
      el_anchor = el_top + (el_height * anchor),
      pct_elapsed,
      pct_elapsed_raw;

      if (el_anchor > viewportTop + viewportHeight) {
        pct_elapsed = 0;
      } else if (el_anchor < viewportTop) {
        pct_elapsed = 1.0;
      } else {
        pct_elapsed = 1 - ((el_anchor - viewportTop) / viewportHeight);
      }
      pct_elapsed_raw = 1 - ((el_anchor - viewportTop) / viewportHeight);
      // el_id: $(p).attr("id"), isActive: isActive
      return {pct_elapsed: pct_elapsed, pct_elapsed_raw: pct_elapsed_raw};
  }
}

Base.contextTypes = {
  viewportHeight: React.PropTypes.number.isRequired,
  viewportTop: React.PropTypes.number.isRequired,
  adjustedViewportTop: React.PropTypes.number.isRequired,
  pctScroll: React.PropTypes.number.isRequired,
};

class MarkerComponent extends Base {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <p className="marker-p" id={this.props.id}  onClick={this.props.clickHandler} data-activate={this.props.isActive}>
        {this.props.copy}
      </p>
    );
  }
}

class ScanComponent extends Base {
  constructor(props) {
    super(props);
  }

  adjust() {
    throw "You must override adjust"
  }
}

ScanComponent.contextTypes = {
  getPercentage: React.PropTypes.func.isRequired,
  viewportHeight: React.PropTypes.number.isRequired,
  viewportTop: React.PropTypes.number.isRequired,
  contentHeight: React.PropTypes.number.isRequired,
  pctScroll: React.PropTypes.number.isRequired,
  adjustedViewportTop: React.PropTypes.number.isRequired
};

class Timelapse extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
        frame: 0
    };
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  adjust(last_state) {
    var marker = this.context.getPercentage(this.props.marker, this.props.anchor),
      marker_elapsed = marker.pct_elapsed,
      frames = 59,
      frame,
      bg_top;

    frame = Math.round(frames * marker_elapsed);
    return {frame: frame};
  }

  render() {
    return(
        <img style={{width: "100%"}} id="timelapse" src={"/erik/timelapse/frame_" + this.state.frame +".gif"}/>
    )
  }
}

class Title extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bg_top: 0
    };
  }

  componentWillMount() {
    var dimensions = {
      width: this.context.viewportWidth,
      height: this.context.viewportHeight
    };
    this.setState(_.extend(this.state, dimensions));
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.context;


    var dest_top = viewportHeight * -1 ;
    if(pctScroll < 0.1){
        // console.log("a",this.state.bg_top)
        var new_top = Math.linearTween(pctScroll, 0, dest_top, 0.1);
    } else if (pctScroll) {
        // console.log("t",this.state.bg_top)
        var new_top = dest_top;
    }
    // return {bg_top: new_top, height: viewportHeight, width: "100%"};
    return _.extend(last_state, {bg_top: new_top});
  }

  render() {
    return(
      <div className='bg-slide' style={{
        // position: "absolute",
        top: this.state.bg_top,
        width: this.state.width,
        height: this.state.height,
        backgroundImage: "url('" + this.props.backgroundImage + "')",
        backgroundSize: "cover",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100
      }}>
        <h3 className="vid-title" style={{fontSize: this.props.fontSize}}>{this.props.title}</h3>
      </div>
    )
  }
}

class TransitionComponent extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      visible: false

    };
  }

  adjust(last_state, d) {
    var marker = d.markers[this.props.marker](this.props.anchor);
    var marker_elapsed = marker.pct_elapsed;

    if(marker_elapsed > 0) {
      var opacity = Math.linearTween(marker_elapsed, 0, 1, 1.0);
      return {visible: true, opacity: opacity};
    }

    return {visible: false};
  }

  getStyle() {
    if(this.state.visible) {
      return {visibility: "visible", opacity: this.state.opacity};
    } else {
      return {visibility: "visible", opacity: 0};
    }
  }

  render() {
    var content = <img src="/akil3/fireworks.jpg" style={{width: "100%"}} />;
    return (
      <div className="transition" style={this.getStyle()}>
        {content}
      </div>
    );
  }
}

class Slide1 extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bg_top: 0,
      caption: false,
      active: false,
      redh: 0
    };
  }

  componentWillMount() {
    var dimensions = {
      width: this.context.viewportWidth,
      height: this.context.viewportHeight
    };
    this.setState(_.extend(this.state, dimensions));
  }

  isActive(d){
    if(d.pctScroll >= 0.1 && d.pctScroll < 0.35){
        return true;
    } else {
        return false;
    }
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.context;
    if(this.isActive(this.context)){
        this.state.active = true;
    } else {
        this.state.active = false;
    }

    if(pctScroll < 0.1){
        $("#shopping-mp3")[0].play();
        var new_pitch = 64.9837616957764;
        var new_volume = 0;
    } else if (pctScroll >= 0.1 && pctScroll < 0.2) {
        $("#shopping-mp3")[0].play();
        var clamped_pct = (pctScroll - 0.1) / 0.1;
        var new_pitch = Math.linearTween(clamped_pct, 64.9837616957764, -64.9837616957764, 1);
        var new_volume = Math.linearTween(clamped_pct,0,0.6,1);
    } else if (pctScroll >= 0.2 && pctScroll < 0.35) {
        $("#shopping-mp3")[0].play();
        var new_pitch = 0;
        var new_volume = 0.6
    } else if (pctScroll >= 0.35 && pctScroll < 0.45) {
        $("#shopping-mp3")[0].play();
        var new_pitch = 0;
        var clamped_pct = (pctScroll - 0.35) / 0.1;
        var new_volume = Math.linearTween(clamped_pct,0.6,-0.6,1);
        // console.log("fadeout",new_volume)
    } else if (pctScroll >= 0.45) {
        $("#shopping-mp3")[0].pause();
        var new_pitch = 0;
        var new_volume = 0;
    }
    // console.log("v",new_volume);
    $("#shopping-mp3")[0].volume = new_volume;

    var caption = false;
    if (pctScroll < 0.15) {
        caption = false
    } else if ((pctScroll >= 0.15 && pctScroll < 0.2)){
        caption = "I woke up in the middle of the promenade.";
        if(caption !== this.state.caption){
          $("#shopping-mp3-1")[0].play();
        }
    } else if ((pctScroll >= 0.2 && pctScroll < 0.25)){
        caption = "Traffic had stopped, my head spinning.";
        if(caption !== this.state.caption){
          $("#shopping-mp3-2")[0].play();
        }
    } else if ((pctScroll >= 0.25 && pctScroll < 0.3)) {
        caption = "Yung TourGuide was laughing.<br/>'First time, eh?'";
        if(caption !== this.state.caption){
          console.log(caption,this.state.caption)
          $("#shopping-mp3-4")[0].play();
        }
    } else {
        caption = "My hand was clutching a bottle of magic juice. My night had just started."
        if(caption !== this.state.caption){
          $("#shopping-mp3-3")[0].play();
        }
    }

    if(pctScroll < 0.1){
        var card_pct = 0;
    } if(pctScroll > 0.35) {
        var card_pct = 1;
    } else {
        var card_pct = (pctScroll - 0.1) / 0.25;
    }
    var redh = Math.linearTween(card_pct,0,79,1)

    var current_pov = this.state.streetView.getPov();

    current_pov.pitch = new_pitch;
    this.state.streetView.setPov(current_pov)
    return {bg_top: 0, caption: caption, redh: redh};
  }

  togglePov(){
    var current_pov = _.clone(this.state.streetView.getPov());
    if(!this.pov_toggle){
        current_pov.heading += 180;
        this.pov_toggle = true;
    } else {
        current_pov.heading -= 180;
        this.pov_toggle = false;
    }
    animatePov(this.state.streetView,current_pov);
  }

  componentDidMount(){
    var domNode = this.refs.map; //ReactDOM.findDOMNode();
    var map = new google.maps.Map(domNode);
    // replace "toner" here with "terrain" or "watercolor"
    this.state.map = map;
    this.state.streetView = map.getStreetView();
    this.state.streetView.setVisible(true);
    this.state.streetView.setOptions({ linksControl: false,
      panControl: false,
      zoomControl: false,
      mapTypeControl: false,
      streetViewControl: false,
      overviewMapControl: false,
      addressControl: false,
      enableCloseButton: false})

    var startPoint = new google.maps.LatLng(43.29638, 5.377674);
    this.state.streetView.setPosition(startPoint)
    this.state.streetView.setPov({heading: 77.68007576992042, pitch: 64.9837616957764, zoom: 1})
    $(domNode).css({"pointer-events": "none"})

    $(window).on("keydown",_.bind(function(e){
        if(e.keyCode == 32){
            if(this.state.active){
                e.preventDefault();
                this.togglePov();
                $(".v-white-glow").css({opacity:1});
                setTimeout(function(){
                    $(".v-white-glow").css({opacity:0});
                },500)
                return false;
            }
        }
    },this))
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  render() {
    return(
      <div className='bg-slide' style={{
        top: this.state.bg_top,
        width: this.state.width,
        height: this.state.height,
      }}>
        <div ref="map" id="slide1" style= {{
          width: this.state.width,
          height: this.state.height,
        }}></div>
        <h5 className="slide-caption" style={{display: this.state.caption ? 'block' : 'none'}} dangerouslySetInnerHTML={{ __html: this.state.caption}}>
        </h5>
        <div className="v-white-glow"></div>
        <div className="v-white">
            <div className="v-red" style={{height: this.state.redh}}/>
        </div>

        <audio id="shopping-mp3" loop>
          <source src="/akil2/ambient_city.mp3" type="audio/mp3"/>
        </audio>

        <audio id="shopping-mp3-1">
          <source src="/akil2/ambient_city.mp3" type="audio/mp3"/>
        </audio>
        <audio id="shopping-mp3-2">
          <source src="/akil2/ambient_city.mp3" type="audio/mp3"/>
        </audio>
        <audio id="shopping-mp3-3">
          <source src="/akil2/ambient_city.mp3" type="audio/mp3"/>
        </audio>
        <audio id="shopping-mp3-4">
          <source src="/akil2/ambient_city.mp3" type="audio/mp3"/>
        </audio>
      </div>
    )
  }
}

class Slide2 extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      bg_top: 0
    };
  }

  adjust(last_state, d) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.context;
    var otop = -1 * viewportHeight;

    if(pctScroll < 0.35){
        var bg_top = otop;
    } else if (pctScroll > 0.45){
        var bg_top = 0;
    } else {
        var clamped_scroll = (pctScroll - 0.35) / 0.1
        var bg_top = Math.linearTween(clamped_scroll, otop, -1 * otop, 1)
    }
    return _.extend(last_state, {bg_top: bg_top});
  }

  componentWillMount() {
    var dimensions = {
      width: this.context.viewportWidth,
      height: this.context.viewportHeight,
      bg_top: -1 * this.context.viewportHeight
    };
    this.setState(_.extend(this.state, dimensions));
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  render() {
    return(
      <div className='bg-slide' style={{
        position: "fixed",
        top: this.state.bg_top,
        width: this.state.width,
        height: this.state.height,
        backgroundColor: "white"
      }}>
      </div>
    )
  }
}

// class RouteMap extends ScanComponent {

//   adjust(last_state) {
//     if(!this.routes[0].routePoints) { return last_state; }
//     var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.context;
//     // console.log(this.context);
//     // return {};
//     // var marker_elapsed = new_state.markers["intro"](0).pct_elapsed;
//     var pointsIdx = Math.round((this.routes[0].routePoints.length - 1) * pctScroll);

//     var that = this;
//     var poly = new google.maps.Polyline({
//       path: this.routes[0].routePoints.slice(0, pointsIdx).map(that.toLatLngObj),
//       strokeColor: '#dd0',
//       strokeOpacity: 1.0,
//       strokeWeight: 3
//     });

//     poly.setMap(this.map);
//     if(this.routes[0].poly) { this.routes[0].poly.setMap(null); }
//     this.routes[0].poly = poly;

//     this.map.setCenter(this.toGoogleLatLng(this.routes[0].routePoints[pointsIdx]));
//     // this.map.setZoom(15);
//     return _.extend(this.state, { routePoints: this.routes[0].routePoints.slice(0, pointsIdx) });
//   }


//   componentWillMount() {
//     this.routes = [{ poly: null,
//     markers: [{ marker: new google.maps.Marker({ position: { lat: 40.8025967, lng: -73.9502753},
//         animation: google.maps.Animation.DROP,
//         title: 'Amy Ruth\'s'}),
//       trigger: null},
//       {marker: new google.maps.Marker({ position: { lat: 40.797814, lng: -73.960124},
//         animation: google.maps.Animation.DROP,
//         title: 'Secret Smoke Spot'}),
//       trigger: null }]}];

//     return this.getDirectionsPolyline(this.routes[0].markers.map((m) => {
//       return m.marker.position;
//     })).then((routePoints) => {
//       this.routes[0].routePoints = routePoints;
//       this.state.routePoints = routePoints;
//       var dimensions = {
//       width: 300,
//       height: this.context.viewportHeight,
//       mapHeight: this.context.viewportHeight - 10
//       };
//       console.log(routePoints);
//       this.setState(_.extend(this.state, dimensions));
//     });
//   }

//   componentWillReceiveProps() {
//    this.setState(this.adjust(this.state));
//   }

//   componentDidMount() {
//     var styles = [{ featureType: "all", stylers: [{ visibility: "off" }]}];
//     var mapNode = this.refs.map;
//     // this.map = new google.maps.Map(ReactDOM.findDOMNode(this.refs.map), {
//     //   center: {lat: 40.786858, lng: -73.962468},
//     //   zoom: 14,
//     //   backgroundColor: 'transparent',
//     //   disableDefaultUI: true,
//     //   disableDoubleClickZoom: true,
//     //   // draggable: false,
//     //   scrollWheel: false
//     // });
//     this.map = new google.maps.Map(this.refs.map, {
//       center: {lat: 40.786858, lng: -73.962468},
//       backgroundColor: 'transparent',
//       zoom: 14
//     });
//     this.map.setOptions({styles: styles});

//     _.forEach(this.routes,(rte) => {
//       _.forEach(_.where(rte.markers, {trigger: null}), (m) => {
//         // console.log(m);
//         m.marker.setMap(this.map);
//       });
//     });

//     this.map.setCenter(this.routes[0].markers[0].marker.position);

//   }

//   render() {
//     return (
//       <div className="map" style={{position: 'fixed', height: this.state.height, width: this.state.width, top: 0}}>
//         <div ref="map" className="map" style={{height: this.state.height, width: "100%"}}></div>
//       </div>
//       );
//   }
// }

class RouteMap extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      routePoints: []
    };
  }

  adjust(last_state, new_state) {
    var marker_elapsed = new_state.markers["intro"](0).pct_elapsed;
    var pointsIdx = Math.round((this.routes[0].routePoints.length - 1) * marker_elapsed);

    var that = this;
    var poly = new google.maps.Polyline({
      path: this.routes[0].routePoints.slice(0, pointsIdx).map(that.toLatLngObj),
      strokeColor: '#000000',
      strokeOpacity: 1.0,
      strokeWeight: 3
    });

    poly.setMap(this.map);
    if(this.routes[0].poly) { this.routes[0].poly.setMap(null); }
    this.routes[0].poly = poly;

    // this.map.setCenter(this.toGoogleLatLng(this.routes[0].routePoints[pointsIdx]));
    this.map.setZoom(15);
    return { routePoints: this.routes[0].routePoints.slice(0, pointsIdx) };
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

  getDirectionsPolyline(points) {
    return new Promise((resolve, reject) => {
      var trip = { origin: points[0],
        waypoints: (points.length > 2) ? points.slice(1, destination.length) : [],
        destination: points[points.length-1],
        travelMode: google.maps.TravelMode.WALKING
      };

      var directions = new google.maps.DirectionsService();
      directions.route(trip, (result, status) => {
        if(status === "OK") {
          var routePoints = polyline.decode(result.routes[0].overview_polyline);
          // console.log(routePoints);
          // console.table(routePoints);
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

  componentDidMount() {
    var styles = [{ featureType: "all", stylers: [{ visibility: "off" }]}];
    var mapNode = this.refs.map;
    // this.map = new google.maps.Map(ReactDOM.findDOMNode(this.refs.map), {
    //   center: {lat: 40.786858, lng: -73.962468},
    //   zoom: 14,
    //   backgroundColor: 'transparent',
    //   disableDefaultUI: true,
    //   disableDoubleClickZoom: true,
    //   // draggable: false,
    //   scrollWheel: false
    // });
    this.map = new google.maps.Map(this.refs.map, {
      center: {lat: 40.786858, lng: -73.962468},
      backgroundColor: 'transparent',
      zoom: 14,
      disableDefaultUI: true,
      disableDoubleClickZoom: true
    });
    this.map.setOptions({styles: styles});

    _.forEach(this.routes,(rte) => {
      _.forEach(_.where(rte.markers, {trigger: null}), (m) => {
        console.log(m);
        m.marker.setMap(this.map);
      });
    });

    this.map.setCenter(this.routes[0].markers[0].marker.position);

  }

  render() {
    return (
      <div className="mapHolder">
        <div className="map" ref="map"></div>
      </div>);
  }
}

function embedComponent(Component, container, callback) {
  $(container).empty();
  var Viewport = createViewport(Component, container);
  ReactDOM.render(<Viewport/>, container, callback);
}

$(function() {
  embedComponent(Root, document.querySelector("#app"));
});

var animatePov = function(sv,pov){
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
        console.log(new_heading)
        sv.setPov({heading: new_heading, pitch: new_pitch, zoom: new_zoom});
        i++;
        if(i < ticks){
            setTimeout(function(){
              next();
            },33)
        }
    }
    next();
};
