var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var directions = require('directions');

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
    { "name": "marseille",
      "type": "title",
      "title": "MARSEILLE",
      "backgroundImage": "/erik3/marseille_1.jpg",
      "fontSize": 250,
      "coords": { "lat": 40.8025967, "lng": -73.9502753},
      "progressIndicator": {
        "name": "Marseille",
        "location": "France",
        "startPosition": 0,
        "endPosition": 0.15,
      }},
    // {"name": "progressmap",
    //  "type": "routemap"},
    {"name": "square",
      "type": "slide1",
      "coords": { "lat": 40.780916, "lng": -73.972981 },
      "progressIndicator": {
        "name": "Marseille Square",
        "location": "Marseille, France",
        "startPosition": 0.15,
        "endPosition": 0.35
      }},
    {"name": "slide2",
      "type": "slide2",
      "coords": { "lat": 40.704021, "lng": -74.017073},
      "progressIndicator": {
        "name": "Life is Hard",
        "location": "Marseille, France",
        "startPosition": 0.35,
        "endPosition": 1
      }},
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
        getPercentageInverse: this.getInv.bind(this)
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

      this.setState({measurements: {
        viewportWidth, viewportHeight, viewportLeft: 0, viewportTop: 0,
        contentHeight: (viewportHeight * 8), adjustedViewportTop: 0,
        pctScroll: 0 }});
    }

    componentDidMount() {
      $(window).on('scroll', _.throttle(this.handleScroll.bind(this), 10));
    }

    render() {
      var style = {
        width: this.state.measurements.viewportWidth,
        height: this.state.measurements.contentHeight,
      };

      return (
        <div style={style}>
          <Component ref="viewportRoot" measurements={this.state.measurements} />
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
          contentHeight = this.state.measurements.contentHeight,
          adjustedViewportTop = (viewportTop / this.state.measurements.viewportHeight) * (contentHeight * 0.1),
          pctScroll = viewportTop / (contentHeight - this.state.measurements.viewportHeight);
      this.setState({measurements: _.extend(this.state.measurements, {viewportLeft, viewportTop, contentHeight, adjustedViewportTop, pctScroll})});
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
    getPercentage: React.PropTypes.func.isRequired,
    getPercentageInverse: React.PropTypes.func.isRequired,
  };

  return Viewport;
}

class Root extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      progressIndicators: []
    }
  }

  componentWillMount() {
    var progressIndicators = scene.filter((el) => {
      return el.progressIndicator;
    })
    .map((el, i) => {
      return _.extend(el.progressIndicator, {"coords": el.coords});
    });
    this.setState({progressIndicators: progressIndicators})
  }

  buildComponents(content) {
    return content.map((el, i) => {
      switch (el.type) {
        case "marker":
          return <MarkerComponent ref={el.name} copy={el.copy} key={el.name} idx={i} measurements={this.props.measurements} />;
        case "transition":
          return <TransitionComponent ref={el.name} marker={el.marker} anchor={el.anchor} key={el.name} measurements={this.props.measurements} />
        case "timelapse":
          return <Timelapse ref={el.name} marker={el.marker} anchor={el.anchor} key={el.name} measurements={this.props.measurements} />
        case "title":
          return <Title ref={el.name} title={el.title} backgroundImage={el.backgroundImage} key={el.name} measurements={this.props.measurements} />
        case "slide1":
          return <Slide1 ref={el.name} key={el.name} measurements={this.props.measurements} />
        case "slide2":
          return <Slide2 ref={el.name} key={el.name} measurements={this.props.measurements} />
        case "routemap":
          return <RouteMap ref={el.name} key={el.name} measurements={this.props.measurements} />
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
        <ProgressBar ref="progressBar" progressIndicators={this.state.progressIndicators}  measurements={this.props.measurements} />
      </div>
    );
  }
}


class Base extends React.Component {
  constructor(props) {
    super(props);
  }

  getPct(anchor) {
    var {viewportHeight, adjustedViewportTop} = this.props.measurements,
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
    var {viewportHeight, viewportTop} = this.props.measurements,
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
    // console.log('title.componentWillReceiveProps:', this.props.measurements.viewportTop, ':', this.props.measurements.pctScroll);
    this.setState(this.adjust(this.state));
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements;

    // console.log('title.adjust:', viewportTop, ':', pctScroll);
    var dest_top = viewportHeight * -1 ;
    if(pctScroll < 0.1){
        // console.log("a",this.state.bg_top)
        var new_top = Math.linearTween(pctScroll, 0, dest_top, 0.1);
    } else if (pctScroll) {
        // console.log("t",this.state.bg_top)
        var new_top = dest_top;
    }
    return {bg_top: new_top, height: viewportHeight, width: "100%"};
  }

  render() {
    return(
      <div className='bg-slide' style={{
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

// class TransitionComponent extends ScanComponent {
//   constructor(props) {
//     super(props);
//     this.state = {
//       visible: false

//     };
//   }

//   adjust(last_state, d) {
//     var marker = d.markers[this.props.marker](this.props.anchor);
//     var marker_elapsed = marker.pct_elapsed;

//     if(marker_elapsed > 0) {
//       var opacity = Math.linearTween(marker_elapsed, 0, 1, 1.0);
//       return {visible: true, opacity: opacity};
//     }

//     return {visible: false};
//   }

//   getStyle() {
//     if(this.state.visible) {
//       return {visibility: "visible", opacity: this.state.opacity};
//     } else {
//       return {visibility: "visible", opacity: 0};
//     }
//   }

//   render() {
//     var content = <img src="/akil3/fireworks.jpg" style={{width: "100%"}} />;
//     return (
//       <div className="transition" style={this.getStyle()}>
//         {content}
//       </div>
//     );
//   }
// }

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
      width: this.props.measurements.viewportWidth,
      height: this.props.measurements.viewportHeight
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
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements;
    if(this.isActive(this.props.measurements)){
        this.state.active = true;
    } else {
        this.state.active = false;
    }

    if(pctScroll < 0.1){
        // $("#shopping-mp3")[0].play();
        var new_pitch = 64.9837616957764;
        var new_volume = 0;
    } else if (pctScroll >= 0.1 && pctScroll < 0.2) {
        // $("#shopping-mp3")[0].play();
        var clamped_pct = (pctScroll - 0.1) / 0.1;
        var new_pitch = Math.linearTween(clamped_pct, 64.9837616957764, -64.9837616957764, 1);
        var new_volume = Math.linearTween(clamped_pct,0,0.6,1);
    } else if (pctScroll >= 0.2 && pctScroll < 0.35) {
        // $("#shopping-mp3")[0].play();
        var new_pitch = 0;
        var new_volume = 0.6
    } else if (pctScroll >= 0.35 && pctScroll < 0.45) {
        // $("#shopping-mp3")[0].play();
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
          // $("#shopping-mp3-1")[0].play();
        }
    } else if ((pctScroll >= 0.2 && pctScroll < 0.25)){
        caption = "Traffic had stopped, my head spinning.";
        if(caption !== this.state.caption){
          // $("#shopping-mp3-2")[0].play();
        }
    } else if ((pctScroll >= 0.25 && pctScroll < 0.3)) {
        caption = "Yung TourGuide was laughing.<br/>'First time, eh?'";
        if(caption !== this.state.caption){
          console.log(caption,this.state.caption)
          // $("#shopping-mp3-4")[0].play();
        }
    } else {
        caption = "My hand was clutching a bottle of magic juice. My night had just started."
        if(caption !== this.state.caption){
          // $("#shopping-mp3-3")[0].play();
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
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements;
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
      width: this.props.measurements.viewportWidth,
      height: this.props.measurements.viewportHeight,
      bg_top: -1 * this.props.measurements.viewportHeight
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

class ProgressIndicator extends React.Component {
  render() {
    return (
      <g>
        <circle cx={this.props.x} cy={this.props.y} r={this.props.r} />
        <circle cx={this.props.x} cy={this.props.y} r={this.props.r*1.75} onClick={this.props.clickHandler} className="indicator-click" />
      </g>
    );
  }
}

class ProgressBar extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      progress: 0,
      progressPx: 0,
      progressPct: 0,
      barWidth: 0,
      barY: 125,
      activeIndicator: {coords:  {lat: 40.786858, lng: -73.962468}, show: false}
    };
  }

  setCard(x, y) {
    var $card = $(ReactDOM.findDOMNode(this.refs.progressCard));
    var top = 10;
    var left = x - $card.width() - 50;
    var right = 60;
      $card.css({
        top: top,
        // left: (left < 10) ? 10 : left
        right: right
      });
  }

  handleClick(i, evt) {
    var indicator = this.props.progressIndicators[i];
    indicator.show = true;
    if(this.state.activeIndicator.name === indicator.name) {
      this.setState(_.extend(this.state, {activeIndicator: {show: false}}));
    } else {
      this.setState(_.extend(this.state, {activeIndicator: indicator}));
      this.setCard(evt.clientX, evt.clientY);
    }
  }

  getCurrentIndicator() {
    var pctScroll = this.props.measurements.pctScroll;
    return this.props.progressIndicators.filter((i) => {
      return pctScroll >= i.startPosition && pctScroll < i.endPosition;
    })[0];
  }

  handleGClick(evt) {
    var indicator = this.getCurrentIndicator();
    indicator.show = true;
    if(this.state.activeIndicator.name === indicator.name) {
      this.setState(_.extend(this.state, {activeIndicator: {show: false}}));
    } else {
      this.setState(_.extend(this.state, {activeIndicator: indicator}));
      this.setCard(evt.clientX, evt.clientY);
    }
  }

  showGBar(evt) {
    var indicator = this.getCurrentIndicator();
    indicator.show = true;
    this.setState(_.extend(this.state, {activeIndicator: indicator}));
    this.setCard(evt.clientX, evt.clientY);
  }

  hideGBar(evt) {
    this.setState(_.extend(this.state, {activeIndicator: {show: false}}));
  }

  componentWillMount() {
    // directions.getXY(this.props.progressIndicators).then((res) => {
    //   console.log(res);
    //   this.setState(_.extend(this.state, {barWidth: (this.props.measurements.viewportWidth - 80)}));
    // });
    this.setState(_.extend(this.state, {barWidth: (this.props.measurements.viewportWidth - 80)}));
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll, viewportWidth} = this.props.measurements;
    return _.extend(last_state, {progressPx: Math.round(this.state.barWidth * pctScroll), progressPct: (pctScroll * 100)});
  }

  buildIndicator(i, idx) {
    var r = 5;
    return <ProgressIndicator clickHandler={this.handleClick.bind(this, idx)} y={this.state.barY} x={(i.position * this.state.barWidth)+(r * 2)} r={r} name={i.name} key={i.name} />;
  }

  highlight(point) { return [point[0], point[1] - 3]; }
  lowlight(point) { return [point[0], point[1] + 3]; }

  render() {
    var indicators = _.map(this.props.progressIndicators, this.buildIndicator, this);
    var pointsBar = [[0, this.state.barY], [this.state.barWidth, this.state.barY]];
    //this.state.progressPx-20
    var pointsFill = [[0, this.state.barY], [this.state.progressPx, this.state.barY]];
    var showCard = (this.state.activeIndicator.show) ? 'visible' : 'hidden';
    // {indicators}
    return (
      <div className="progress-bar">
        <img className="g-icon" src="g.png" onMouseEnter={this.showGBar.bind(this)} onMouseLeave={this.hideGBar.bind(this)} />
        <svg xmlns="http://www.w3.org/2000/svg" className="progress-svg" style={{width: (this.state.barWidth)}}>
          <g>
            <polyline className="progress-highlight" points={pointsBar.map(this.highlight)} />
            <polyline className="progress-back" points={pointsBar} />
            <polyline className="progress-lowlight" points={pointsBar.map(this.lowlight)} />
          </g>
          <g>
            <polyline className="progress-fill" points={pointsFill} />
          </g>
        </svg>
        <div ref="progressCard" className="progress-card" style={{visibility: showCard}}>
          <div ref="cardMap" className="progress-card-map">
            <Map center={this.state.activeIndicator.coords} zoom={17} position={this.state.activeIndicator.position} />
          </div>
          <div className="progress-card-name">{this.state.activeIndicator.name}</div>
          <div className="progress-card-subtitle">{this.state.activeIndicator.location}</div>
        </div>
      </div>
    );
  }
}

class Map extends React.Component {
  componentDidMount() {
    console.log(this.props.center);
     this.map = new google.maps.Map(ReactDOM.findDOMNode(this.refs.map), {
      center: this.props.center,
      zoom: this.props.zoom,
      disableDefaultUI: true,
      // disableDoubleClickZoom: true,
      // draggable: false,
      scrollwheel: false
    });
  }

  componentWillReceiveProps(nextProps) {
    this.map.setCenter(nextProps.center);
  }

  render() {
    return (<div ref="map" className="map-container"></div>);
  }
}

function embedComponent(Component, container, callback) {
  $(container).empty();
  var Viewport = createViewport(Component, container);
  ReactDOM.render(<Viewport/>, container, callback);
}

$(function() {
  embedComponent(Root, document.body);
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
