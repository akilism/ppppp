var $ = require('jquery');
var React = require('react/addons');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var directions = require('directions');
var Conti = require('conti');
var ReactCSSTransitionGroup = React.addons.CSSTransitionGroup;

var scaler = (function(currMin, currMax, otherMin, otherMax) {
  var left = currMax - currMin;
  var right = otherMax - otherMin;

  var scale = right / left;

  var getVal = function(val) {
    return otherMin + (val - currMin) * scale;
  };

  return getVal;
});

window.Conti = Conti;
window.jQ = $;

/*
  // Progress V.
  <div className="v-white-glow"/>
  <div className="v-white">
    <div className="v-red" style={{height: this.state.redh}}/>
  </div>
  <div className="full-black" style={{opacity: this.state.black}}/>
*/

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

var scene = [
    { "name": "bangkok",
      "type": "title",
      "title": "bangkok",
      "backgroundImage": "/thailand/bangkok.jpg",
      "fontSize": 250,
      "coords": { "lat": 40.8025967, "lng": -73.9502753},
      "progressIndicator": {
        "name": "bangkok",
        "location": "thailand",
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
        //if mobile use screen height and width
        [viewportWidth, viewportHeight] = [$(window).width(), $(window).height()+56];
      } else {
        [viewportWidth, viewportHeight] = [$(container).width(), $(container).height()];
      }
      if (!viewportWidth || !viewportHeight) {
        throw new Error("Viewport must have a non-zero width and height");
      }

      this.setState({measurements: {
        viewportWidth, viewportHeight, viewportLeft: 0, viewportTop: 0,
        contentHeight: (viewportHeight * 17), adjustedViewportTop: 0,
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
      // console.log("pctScroll:", pctScroll, " contentHeight:", contentHeight, " viewportTop:", viewportTop, " viewportHeight:", this.state.measurements.viewportHeight);
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
  }

  render() {
    // down the street 13.782658, 100.516636
    // restaurant 13.782994, 100.515541
    // <SlideStreet startPos={{lat:13.782658, lng: 100.516636}} endPos={{lat: 13.782994, lng: 100.515541}} />
    // ["Bangkok! ", " Oh ", " my ", " god. ", " I ", " have ", " just ", " landed ", " but ", " already ", " it's ", " kind ", " of ", " everything ", " I ", " wanted."]

    var images = ['khao_day.jpg', 'khao_famous_day.jpg', 'khao_cheap_eats_day.jpg', 'khao_hostel_day.jpg', 'khao_booze_day.jpg', 'khao_anything_day.jpg'];
    var altImages = ['khao_night.jpg', 'khao_famous_night.jpg', 'khao_cheap_eats_night.jpg', 'khao_hostel_night.jpg', 'khao_booze_night.jpg', 'khao_anything_night.jpg'];
    var galleryImages = [{file: 'cook0.png', caption: "&ldquo;But there are hidden gems in the quite side streets, locals secret spots and what not.&rdquo;"},
    {file: 'cook1.png', caption: "&ldquo;I can smell the chillies down the block, clearly this is my kind of place.&rdquo;"},
    {file: 'cook2.png', caption: "Pad Kra Pao Gai... Thai Basil Chicken. Oooh that heat, love that."},
    {file: 'cook3.png', caption: "Chef Dunn in kitchen and shes got bellys to feed. Let's do this."},
    {file: 'cook4.png', caption: "I wanna bring some heat so everyone's fucking coughing in this bitch."},
    {file: 'cook5.png', caption: "Now we're going to find out if I'm the real deal or not.."},
    {file: 'cook6.png', caption: "It's pretty good, it's real yummy."},
    {file: 'cook7.png', caption: "Bo bo bo!"}];
    return (
      <div>
        <SlideBlock measurements={this.props.measurements} start={0.075} end={0.12} caption="&ldquo;I am a spice fiend, live and breath that shit, and it's been like that since day one. I got introduced to Thai food and it was like a match made in heaven. I was like instantly hooked. I love reading about it, the people, the culture. I'm such a big fan.&rdquo;" />
        <Timelapse measurements={this.props.measurements} start={0.05} end={0.12} imagePath="/thailand/table" frameCount={17} />
        <WordMask measurements={this.props.measurements} start={0.12} end={0.24} bgUrl="/thailand/biketomarket.gif" quote={["The thing is ", " I've never actually ", " been there. ", " That shit's ", " going to change. ", " JD ", " is ", " going ", " to ", " Thailand."]} />
        <Title measurements={this.props.measurements} start={0} end={0.05} title="bangkok" subtitle="with Jourdan Dunn" backgroundImage="/thailand/bangkok.jpg" />
        <SlideMovie measurements={this.props.measurements} start={0.24} end={0.31} videoSrc="/thailand/market2.mp4" />
        <ImageSwitcher measurements={this.props.measurements} start={0.40} end={0.55} images={images} altImages={altImages} />
        <ZoomWords measurements={this.props.measurements} start={0.40} end={0.55} bgUrl="" quote={["Khao San Road ", " Bangkok's famous backpacker disneyland. ", " Cheap food. ", " Cheap hostels. ", " Cheap booze. ", " You can find absolutely anything there."]} />
        <SlippyBlock measurements={this.props.measurements} start={0.31} end={0.41} />
        <ScrollGallery measurements={this.props.measurements} start={0.55} end={0.85} images={galleryImages} />
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
    this.scaler = scaler(this.props.start, this.props.end, 0, 1);
  }

  adjust() {
    throw "You must override adjust"
  }
}

ScanComponent.contextTypes = {
  getPercentage: React.PropTypes.func.isRequired,
};

class SlideComponent extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 0
    }
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements;

    var destTop = viewportHeight * -1,
      newTop;

    if (pctScroll >= this.props.end) {
        newTop = destTop;
    } else if(pctScroll >= this.props.start){
        newTop = Math.linearTween((pctScroll-this.props.start), 0, destTop, 0.1);
    } else {
      newTop = 0;
    }

    return {top: newTop};
  }

  render() {
    // width: this.props.measurements.viewportWidth
    return(
      <div className='bg-slide' style={{
        top: this.state.top,
        backgroundColor: this.props.backgroundColor,
        height: this.props.measurements.viewportHeight,
      }}>
       {this.props.backgroundColor}
      </div>
    )
  }
}

class Title extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 0
    };
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        dest_top = viewportHeight * -1,
        newTop;

    if(adjustedPctScroll < 1){
        newTop = Math.linearTween(adjustedPctScroll, 0, dest_top, 1);
    } else if (pctScroll) {
        newTop = dest_top;
    }

    // if(adjustedPctScroll > 0.01 && adjustedPctScroll < 0.025 && this.refs.sound1.paused) {
    //   this.refs.sound1.play();
    // } else if (adjustedPctScroll >= 1) {
    //   this.refs.sound1.pause();
    // }

    return {top: newTop};
  }

  render() {
    return(
      <div className='bg-slide title-slide' style={{
        height: this.props.measurements.viewportHeight,
        top: this.state.top,
        backgroundImage: "url('" + this.props.backgroundImage + "')",
        backgroundSize: "cover"
      }}>
        <h3 className="vid-title" style={{fontSize: this.props.fontSize}}>{this.props.title}</h3>
        <h4 className="vid-subtitle">{this.props.subtitle}</h4>
        <audio ref="sound1">
          <source src="/thailand/chatter.mp3" type="audio/mp3"/>
        </audio>
      </div>
    )
  }
}

class Timelapse extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
        frame: 0
    };
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        dest_top = viewportHeight * -1,
        frames = this.props.frameCount,
        frame,
        newTop;

    if(pctScroll < this.props.start) {
      frame = 0;
    } else if (pctScroll > this.props.end) {
      frame = frames;
    } else {
      frame = Math.min(frames, Math.round(frames * adjustedPctScroll));
    }

    return {frame: frame};
  }

  render() {
    return(
        <img className="timelapse" id="timelapse" src={ this.props.imagePath + "/frame_" + this.state.frame + ".gif"}/>
    )
  }
}

class WordMask extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
        text: [],
        maskText: [],
        wordCount: 0,
        wordIdx: -1,
        played: false,
        clipMode: 'text',
        word: '',
        flickered: false
    };
    this.wordScaler = scaler(this.props.start, this.props.end-0.05, 0, 1);
  }

  flicker(count) {
    if(count === 0) {
      $(this.refs.bg).css('-webkit-background-clip', 'initial');
      return;
    } else if(count % 2 === 0) {
      $(this.refs.bg).css('-webkit-background-clip', 'initial');
    } else {
      $(this.refs.bg).css('-webkit-background-clip', 'text');
    }

    setTimeout(() => {
      this.flicker(--count);
    }, 10);
  }

  componentWillMount() {
    this.setState(_.extend(this.state, {wordCount: this.props.quote.length-1, bgUrl: this.props.bgUrl}));
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        adjustWordScroll = this.wordScaler(pctScroll),
        active = this.isActive(this.props.measurements),
        dest_top = viewportHeight * -1,
        text = "",
        maskText = "",
        word = "",
        flickered,
        wordIdx = last_state.wordIdx,
        clipMode = last_state.clipMode,
        played = last_state.played,
        newTop;

    if(adjustedPctScroll < 0) {
      wordIdx = -1;
      clipMode = 'text';
      flickered = false;
    } else {
      wordIdx = Math.round(this.state.wordCount * adjustWordScroll);
      clipMode = 'text';
    }

    //flash in the background
    if(wordIdx > this.state.wordCount) {
      clipMode = '';
      wordIdx = this.state.wordCount+1;

      if(!this.state.flickered) {
        this.flicker(48);
      }
      flickered = true;
      if (this.refs.welcome.paused && !this.state.played && this.state.active) {
        this.refs.welcome.play();
        played = true;
      }
    }

    //update the displayed words.
    //current word in white.
    //hidden span of words to keep the spacing correct.
    //masked out layer of words to show the background image.
    if(wordIdx === -1) {
      maskText = "";
      text = "";
      word = "";
    } else if (wordIdx === 0) {
      maskText = "";
      text = this.props.quote.slice(0, wordIdx).join("");
      word = this.props.quote[wordIdx];
    } else if (wordIdx > this.state.wordCount) {
      word = "";
      maskText = this.props.quote.slice(0, wordIdx+1).join("");
      text = this.props.quote.slice(0, wordIdx+1).join("");
    } else {
      maskText = this.props.quote.slice(0, wordIdx).join("");
      text = this.props.quote.slice(0, wordIdx).join("");
      word = this.props.quote[wordIdx];
    }

    return {active, clipMode, flickered, maskText, text, word, wordIdx, played};
  }

  render() {
    return(
      <div>
        <div className="bg-mask mask-text" style={{backgroundImage: 'url(' + this.state.bgUrl + ')', WebkitBackgroundClip: this.state.clipMode }} ref="bg">
          {this.state.maskText}
        </div>
        <span ref="text" className="mask-text text"><span ref="hide" className="hide">{this.state.text}</span><span ref="show" className="show">{this.state.word}</span></span>
        <audio ref="welcome">
          <source ref="welcomeSrc" type="audio/mp3" src="/thailand/bangkok.mp3" />
        </audio>
      </div>
    )
  }
}

class SlideMovie extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 0,
      caption: ".",
      active: false,
      videoSrc: "",
      played: false,
      slideWords: "6.5%",
      cardData: {
        name: "Tewate Market",
        coords: {lat: 13.771224, lng: 100.502749},
        city: "Bangkok",
        country: "Thailand"
      }
    };
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  componentWillMount() {
    this.setState(_.extend(this.state, {top: this.props.measurements.viewportHeight}));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state, d) {
    let {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        caption = "It's amazing this market.",
        videoSrc = last_state.videoSrc,
        played = last_state.played,
        top;

    var conti = new Conti(0,0.75,"adjustedPctScroll", (pct, t) => {
      t.top = Math.linearTween(pct,viewportHeight,-viewportHeight,1);
      t.play = false;
      t.videoSrc = this.props.videoSrc;
      // if(!this.refs.videoSrc.getAttribute("src")) {
      //   this.refs.videoSrc.setAttribute("src", this.props.videoSrc);
      // }

      return t;
    }).abut(1, (pct, t) => {
      // console.log("videosource:", this.refs.videoSrc);
      t.top = 0;
      t.play = true;
      return t;
    });

    var trans_data = conti.run(_.extend(this.props.measurements, {adjustedPctScroll}), {});
    // console.log(trans_data);

    if(trans_data.videoSrc) {
      videoSrc = trans_data.videoSrc;
    }

    if (trans_data.play) {
      // console.log(this.refs.video.loop, this.refs.video.paused);

      if(this.refs.video.paused && !this.state.played) {
        //this.refs.video.play();
        played = true;
      }
    };

    if(adjustedPctScroll < 0) {
      top = viewportHeight;
      if(!this.refs.video.paused) {
        this.refs.video.pause();
      }
    } else if (adjustedPctScroll > 1) {
      top = 0;
    } else {
      top = trans_data.top;
    }

    return {active, caption, played, top, videoSrc};
  }

  render() {
    var controls = (this.props.controls) ? 'controls' : '';
    var loop = (this.props.loop) ? 'loop' : '';
    return(
      <div ref="slideRoot" className='bg-slide bg-video' style={{
        top: this.state.top,
        height: this.props.measurements.viewportHeight,
        zIndex: 100
      }}>
        <video ref="video" className="slide-video" controls>
          <source ref="videoSrc" type="video/mp4" src={this.props.videoSrc} />
        </video>
        <h5 className="slide-caption video-caption" style={{display: this.state.caption ? 'block' : 'none'}}>
          &ldquo;It's amazing this <GoogleCardLink cssClass="video-link" cardData={this.state.cardData} text="market" />.&rdquo;
        </h5>
      </div>
    ); //'
  }
}

class SlideBlock extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      top: 0,
      opacity: 0,
      active: false,
      caption: true,
      display: 'none'
    };
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  componentWillMount() {
    this.setState(_.extend(this.state, {top: this.props.measurements.viewportHeight}));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state, d) {
    let {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        opacity,
        top,
        display = last_state.display;

    var conti = new Conti(0,0.5,"adjustedPctScroll", (pct, t) => {
      t.top = Math.linearTween(pct,viewportHeight,-viewportHeight,1);
      t.opacity = Math.linearTween(pct, 0, 1, 0.5);
      return t;
    })
    .abut(0.85, (pct, t) => {
      t.top = 0;
      t.opacity = Math.linearTween(pct, 1, 0, 0.5);
      return t;
    })
    .abut(1, (pct, t) => {
      t.top = 0;
      t.opacity = 0;
      return t;
    });

    var trans_data = conti.run(_.extend(this.props.measurements, {adjustedPctScroll}), {});
    // console.log(trans_data);

    if(adjustedPctScroll < 0) {
      top = viewportHeight;
      opacity = 0;
      display = 'none';
    } else if (adjustedPctScroll > 1) {
      top = 0;
      opacity = 0;
      display = 'none';
    } else {
      top = trans_data.top;
      opacity = trans_data.opacity;
      display = 'block';
    }

    return {active, opacity, top, display};
  }

  render() {
    return(
      <div ref="slideRoot" className='bg-slide slide-block' style={{
        top: this.state.top,
        height: this.props.measurements.viewportHeight,
        zIndex: 200,
        opacity: this.state.opacity,
        display: this.state.display
      }}>
        <h5 className="slide-caption block-caption" style={{display: this.state.caption ? 'block' : 'none'}}>
          {this.props.caption}
        </h5>
      </div>
    )
  }
}

class SlippyText extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      className: "slippy-text"
    }
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state, d) {
    let {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements);

    return {active, className: (adjustedPctScroll > 0 && adjustedPctScroll < 0.95) ? "slippy-text from-left" : "slippy-text"};
  }

  render() {
    return (
      <div>
      <h5 className={this.state.className}>
        {this.props.caption}
      </h5>
      </div>
    );
  }
}

class SlippyBlock extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      caption: 'Off to Khao San Road.',
      count: 0,
      maxCount: 6,
      top: 0,
      adjustedPctScroll: 0
    }
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state, d) {
    let {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        count = last_state.count,
        top,
        $slipRoot = $(this.refs.slipRoot);

    if(adjustedPctScroll <= 0) {
      top = 0;
      count = 0;
      if($slipRoot.hasClass('fadezzz')) {
        $slipRoot.removeClass('fadezzz');
      }
    } else if (adjustedPctScroll > 1) {
      top = viewportHeight;
      if(!$slipRoot.hasClass('fadezzz')) {
        $slipRoot.addClass('fadezzz');
      }
    } else {
      if($slipRoot.hasClass('fadezzz')) {
        $slipRoot.removeClass('fadezzz');
      }
      count = Math.round(this.state.maxCount * adjustedPctScroll);
      top = Math.linearTween(adjustedPctScroll, 0, viewportHeight, 0.85);
    }

    return {active, count, top, adjustedPctScroll};
  }

  getTextBlock(count) {
    var measurements = _.extend(_.clone(this.props.measurements), {pctScroll: this.state.adjustedPctScroll});
    return Array(count).fill(0).map((v, i) => {
      var start = i * 0.15,
          // end = i * 0.25,
          end = 1;
      return <SlippyText caption={this.state.caption} key={i} start={start} end={end} measurements={measurements} />
    });
  }

  render() {
    var textBlocks = (this.state.adjustedPctScroll > 0) ? this.getTextBlock(this.state.count) : [];
    return(
      <div ref="slipRoot" className="slippy-block" style={{
        height: this.state.top,
        zIndex: 100
      }}>
        {textBlocks}
      </div>
    )
  }
}

class ZoomWords extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
        text: [],
        maskText: [],
        wordCount: 0,
        wordIdx: -1,
        clipMode: 'none',
        display: 'none',
        word: '',
        flickered: false
    };
  }

  componentWillMount() {
    this.setState(_.extend(this.state, {wordCount: this.props.quote.length-1, bgUrl: this.props.bgUrl}));
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        dest_top = viewportHeight * -1,
        text = "",
        maskText = "",
        word = "",
        wordIdx,
        display,
        newTop;

    if(pctScroll < this.props.start) {
      display = 'none';
      wordIdx = -1;
    } else if (pctScroll > this.props.end) {
      wordIdx = this.state.wordCount+1;
      display = 'block';
    } else {
      display = 'block';
      wordIdx = Math.min(this.state.wordCount, Math.round(this.state.wordCount * adjustedPctScroll));
    }

    // console.log(this.state.wordCount, wordIdx);

    if(wordIdx === -1) {
      maskText = "";
      text = "";
      word = "";
    } else if (wordIdx === 0) {
      maskText = "";
      text = this.props.quote.slice(0, wordIdx).join("");
      word = this.props.quote[wordIdx];
    } else if (wordIdx > this.state.wordCount) {
      word = "";
      maskText = this.props.quote.slice(0, wordIdx+1).join("");
      text = this.props.quote.slice(0, wordIdx+1).join("");
    } else {
      maskText = this.props.quote.slice(0, wordIdx).join("");
      text = this.props.quote.slice(0, wordIdx).join("");
      word = this.props.quote[wordIdx];
    }

    // console.log('word:', word, 'wordidx:', wordIdx, flickered);
    return {active, display, maskText, text, word, wordIdx};
  }

  getZoomText() {
    return (
      <div className="zoomed-text" style={{
        display: (this.state.word) ? 'flex' : 'none'
      }}>
        <span ref="zoomText">{this.state.word}</span>
      </div>);
  }

  render() {
    var zoomText = this.getZoomText();
    return(
      <div style={{display: this.state.display}}>
        <div className="bg-zoom zoom-text" style={{
          backgroundImage: (this.state.bgUrl) ? 'url(' + this.state.bgUrl + ')' : '',
          WebkitBackgroundClip: this.state.clipMode,
          zIndex: 100 }}
          ref="bg">
          {this.state.maskText}
          {zoomText}
        </div>
      </div>
    )
  }
}

class ImageSwitcher extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      altImage: "",
      defImage: "",
      imageCount: 0,
      imageIdx: 0
    }
  }

  componentWillMount() {
    this.setState(_.extend(this.state, {imageCount: this.props.images.length-1}));
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        defImage,
        altImage,
        display,
        imageIdx;

    // console.log(adjustedPctScroll);
    if(pctScroll < this.props.start) {
      imageIdx = -1;
      display = 'none';
    } else if (pctScroll > this.props.end) {
      imageIdx = this.state.imageCount;
      display = 'block';
    } else {
      display = 'block';
      imageIdx = Math.min(this.state.imageCount, Math.round(this.state.imageCount * adjustedPctScroll));
    }

    defImage = (imageIdx >= 0) ? "/thailand/" + this.props.images[imageIdx] : "";
    altImage = (imageIdx >= 0) ? "/thailand/" + this.props.altImages[imageIdx] : "";
    return {defImage, altImage, imageIdx, active, display};
  }

  componentDidMount() {
    $(window).on("keydown", (e) => {
      if(e.keyCode == 16 && this.state.active) {
        e.preventDefault();
        let $alt = $(this.refs.altImage);
        if(!$alt.hasClass("switch-from-left")) {
          $(this.refs.altImage).addClass("switch-from-left");
          $('.zoomed-text').addClass('pull-right');
          // $('.zoomed-text span').addClass('flip-colors');
        }
      }
    });

    $(window).on("keyup", (e) => {
      if(e.keyCode == 16 && this.state.active) {
        e.preventDefault();
        let $alt = $(this.refs.altImage);
        if($alt.hasClass("switch-from-left")) {
          $(this.refs.altImage).removeClass("switch-from-left");
          $('.zoomed-text').removeClass('pull-right');
          // $('.zoomed-text span').removeClass('flip-colors');
        }
      }
    });
  }

  render() {
    return (
      <div className="image-switcher" style={{zIndex: 100, display: this.state.display}}>
        <img ref="defImage" src={this.state.defImage} className="switcher-def" />
        <img ref="altImage" src={this.state.altImage} className="switcher-alt" />
      </div>
    );
  }
}

class ScrollGallery extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      imageIdx: -1,
      active: false,
      images: [],
      zIndex: 0
    };
  }

  componentWillMount() {
    this.setState(_.extend(this.state, {imageCount: this.props.images.length-1}));
  }

  componentWillReceiveProps() {
    this.setState(_.extend(this.state, this.adjust(this.state)));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        images = [],
        display,
        imageIdx,
        zIndex = last_state.zIndex;

    if(adjustedPctScroll < 0) {
      imageIdx = -1;
      display = 'none';
      zIndex = 0;
    } else if (adjustedPctScroll > 1) {
      imageIdx = this.state.imageCount;
      display = 'block';
    } else {
      display = 'block';
      imageIdx = Math.min(this.state.imageCount, Math.round(this.state.imageCount * adjustedPctScroll));
      zIndex = 103;
    }

    if(imageIdx >= 0) {
      images = this.props.images.slice(0, imageIdx+1);
    }
    return {active, display, imageIdx, images, zIndex};
  }

  render() {
    var images = this.state.images.map((p, i) => {
      return (
        <img src={p} className="scroll-gallery-image" key={p} />
      );
    });
    return (
      <div className="scroll-gallery" style={{display: this.state.display, zIndex: this.state.zIndex}}>
        <ReactCSSTransitionGroup transitionName="scroll-gallery-image">
          {images}
        </ReactCSSTransitionGroup>
      </div>
    );
  }
}

class GoogleCardLink extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      screenCoords: [],
      showCard: false
    };
  }

  handleClick(e) {
    // console.log(e, this.props.cardData);
    this.setState(_.extend(this.state, {screenCoords: [e.clientX, e.clientY], showCard: (!this.state.showCard)}));
  }

  render() {
    return (
      <div className={this.props.cssClass} ref="link">
        <span onClick={this.handleClick.bind(this)}>{this.props.text}</span>
        <GoogleCard show={this.state.showCard} name={this.props.cardData.name} coords={this.props.cardData.coords} screenCoords={this.state.screenCoords} location={this.props.cardData.city + ', ' + this.props.cardData.country} />
      </div>
    );
  }
}

class GoogleCard extends React.Component {
  // constructor(props) {
  //   super(props);
  // }

  setCard(x, y) {
    var $card = $(ReactDOM.findDOMNode(this.refs.googleCard));
    var top = y - $card.height() - 40;
    var left = x - ($card.width()/2);
    // var right = 60;
      $card.css({
        top: top,
        left: (left < 10) ? 10 : left
        // right: right
      });
  }

  componentWillReceiveProps(nextProps) {
    this.setCard(nextProps.screenCoords[0], nextProps.screenCoords[1]);
  }

  render() {
    var showCard = (this.props.show) ? 'visible' : 'hidden';
    return (
      <div ref="googleCard" className="google-card" style={{visibility: showCard}}>
          <div ref="cardMap" className="google-card-map">
            <Map center={this.props.coords} zoom={18} />
          </div>
          <div className="google-card-name">{this.props.name}</div>
          <div className="google-card-subtitle">{this.props.location}</div>
      </div>
    );
  }
}

class Map extends React.Component {
  componentDidMount() {
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
