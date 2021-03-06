var $ = require('jquery');
var React = require('react');
var ReactDOM = require('react-dom');
var _ = require('underscore');
var directions = require('directions');
var Conti = require('conti');

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

Math.linearTween = function (t, b, c, d) { return c*t/d + b; };
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


function createViewport(Component, container) {
  class Viewport extends React.Component {
    getChildContext() {
      return {
        getPercentage: this.getPct.bind(this),
        getPercentageInverse: this.getInv.bind(this),
        toggleWormhole: this.toggleWormhole.bind(this)
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

      this.setState({measurements:
          { viewportWidth,
            viewportHeight,
            viewportLeft: 0,
            viewportTop: 0,
            contentHeight: (viewportHeight * 20),
            adjustedViewportTop: 0,
            pctScroll: 0,
            wormholeDist: 0,
            wormholeActive: false },
        wormholeJump: null,
        jumpDiff: 0,
        wormholePosition: null});
    }

    componentDidMount() {
      $(window).on('scroll', _.throttle(this.handleScroll.bind(this), 10));
    }

    toggleWormhole(wormholeJump) {
      wormholeJump = wormholeJump || this.state.wormholeJump;

      var newState = this.calculateMeasurements(!this.state.measurements.wormholeActive, wormholeJump);
      newState.measurements.wormholeActive = !this.state.measurements.wormholeActive;
      newState.wormholePosition = this.state.measurements.viewportTop;
      this.setState(newState);
    }

    handleScroll(ev) {
      var newState = this.calculateMeasurements(this.state.measurements.wormholeActive, this.state.wormholeJump);
      this.setState(newState);
    }

    calculateMeasurements(wormholeActive, wormholeJump) {
      var viewportLeft = 0, //$(ev.target).scrollLeft(),
          viewportTop = $(window).scrollTop(),
          contentHeight = this.state.measurements.contentHeight,
          adjustedViewportTop = (viewportTop / this.state.measurements.viewportHeight) * (contentHeight * 0.1),
          wormholeDist = this.state.measurements.wormholeDist,
          jumpDiff = this.state.jumpDiff,
          pctScroll;

      // when the wormhole is active viewport top is set to the wormhole activation point. this effectively
      // freezes the non-wormhole components in place to their pre-wormhole positions.
      // when the wormhole is off we subtract the wormhole travelled distance from the viewport top so that
      // pctScroll is calculated as if you never scrolled into the wormhole.
      if(wormholeActive) {
        wormholeDist = this.state.wormholePosition ? viewportTop - this.state.wormholePosition : 0;
        viewportTop = this.state.wormholePosition ?  this.state.wormholePosition : viewportTop;
      } else {
        // wormholeJump is the exit pctScroll location for the wormhole.
        // This is calculated once when we jump out of a wormhole.
        // That value is then applied on each new viewportTop when calculating the pctScroll.
        if(wormholeJump) {
          var jumpTop = wormholeJump * (contentHeight - this.state.measurements.viewportHeight);
          jumpDiff = (viewportTop - wormholeDist) - jumpTop;
          wormholeJump = null;
        }

        viewportTop = (viewportTop - wormholeDist < 0) ? 0 : (viewportTop - wormholeDist);
      }

      pctScroll = (viewportTop - jumpDiff) / (contentHeight - this.state.measurements.viewportHeight);
      //Ugly but stops the cards from scroll past 0.
      pctScroll = (pctScroll < 0) ? 0 : pctScroll;

      return {
        wormholeJump,
        jumpDiff,
        measurements: _.extend(this.state.measurements, {viewportLeft, viewportTop, contentHeight, adjustedViewportTop, pctScroll, wormholeDist})
      };
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

    // These are probably not going to be used anymore. They were for
    // finding a markers pctScroll and invScroll.
    getPct(ref, anchor) {
      var component = this.bfs(ref);
      return component.getPct(anchor);
    }

    getInv(ref, anchor) {
      var component = this.bfs(ref);
      return component.getInv(anchor);
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
    //End unused stuff.
  }

  Viewport.childContextTypes = {
    getPercentage: React.PropTypes.func.isRequired,
    getPercentageInverse: React.PropTypes.func.isRequired,
    toggleWormhole: React.PropTypes.func.isRequired
  };

  return Viewport;
}

class Root extends React.Component {
  constructor(props) {
    super(props)
  }

  render() {
    // <PixelTransition measurements={this.props.measurements} start={0} end={0.5} imagePath="/akilpixi/wiki.jpg" imagePath2="/akilpixi/gza.jpg" />
    // <PixelFace measurements={this.props.measurements} start={0} end={0.1} imagePath="/akilpixi/ratking.jpg" />
    // <ScrambleMask measurements={this.props.measurements} start={0} end={0.1} imagePath="/akilpixi/ratking.jpg" />
    return (
      <div>
        <ScrambleMask measurements={this.props.measurements} start={0} end={0.1} imagePath="/akilpixi/ratking.jpg" />
        <audio id="sfxError">
          <source src="/akilpixi/error.wav" type="audio/wav" />
        </audio>
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

  errorInput() {
    //shake screen or something here.
    console.error("ERROR INPUT!!!!");
    $(".stage-bg").addClass("shake");
    // $("#sfxError")[0].stop();
    var $sfxError = $("#sfxError");
    $sfxError[0].currentTime = 0;
    $sfxError[0].play();
    setTimeout(() => {
      $(".stage-bg").removeClass("shake");
    }, 100);
  }

  bindHandlers() {
    $(window).on("keydown", (e) => {
        if(e.keyCode == 16){
          e.preventDefault();
          this.errorInput();
          return false;
        }
    });
  }
}

ScanComponent.contextTypes = {
  getPercentage: React.PropTypes.func.isRequired,
  toggleWormhole: React.PropTypes.func.isRequired
};

class PixelTransition extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
      maxCellSize: 50
    };
  }

  componentDidMount() {
    this.renderer = new PIXI.WebGLRenderer(990,660, {transparent: true});
    this.refs.stage.appendChild(this.renderer.view);
    this.stage = new PIXI.Container();
    this.filter = new PIXI.filters.PixelateFilter();
    this.filter.size =  new PIXI.Point(1, 1);
    this.stage.filters = [this.filter];
    var image1Texture = new PIXI.Texture.fromImage(this.props.imagePath);
    var image2Texture = new PIXI.Texture.fromImage(this.props.imagePath2);
    this.image1 = new PIXI.Sprite(image1Texture);
    this.image2 = new PIXI.Sprite(image2Texture);
    this.image1.position.x = 0;
    this.image1.position.y = 0;
    this.image2.position.x = 0;
    this.image2.position.y = 0;
    this.image2.alpha = 0;
    this.stage.addChild(this.image1);
    this.stage.addChild(this.image2);
    this.animate();
    this.bindHandlers();
  }

  componentWillReceiveProps() { this.setState(this.adjust(this.state)); }

  isActive(d){ return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end); }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        maxCellSize = this.state.maxCellSize,
        animate = last_state.animate;

    var conti = new Conti(0,0.25,"adjustedPctScroll", (pct, t) => {
      t.cellSize = Math.linearTween(pct, 1, this.state.maxCellSize, 1);
      t.alpha1 = 1;
      t.alpha2 = 0;
      return t;
    }).abut(0.28, (pct, t) => {
      t.cellSize = this.state.maxCellSize;
      t.alpha1 = 1;
      t.alpha2 = 0;
      return t;
    }).abut(0.35, (pct, t) => {
      t.cellSize = this.state.maxCellSize;
      t.alpha1 = Math.linearTween(pct, 1, 0, 1);
      t.alpha2 = Math.linearTween(pct, 0, 1, 1);
      return t;
    }).abut(0.75, (pct, t) => {
      t.cellSize = Math.linearTween(pct, this.state.maxCellSize, -this.state.maxCellSize, 1);
      t.alpha1 = 0;
      t.alpha2 = 1;
      return t;
    }).abut(1, (pct, t) => {
      t.cellSize = 1;
      t.alpha1 = 0;
      t.alpha2 = 1;
      return t;
    });

    var contiData = conti.run(_.extend(this.props.measurements, {adjustedPctScroll}), {});
    contiData.cellSize = (contiData.cellSize < 1) ? 1 : contiData.cellSize;
    // contiData.alpha2 = (adjustedPctScroll >= 1) ? 1 : contiData.alpha2;
    this.filter.size = new PIXI.Point(contiData.cellSize, contiData.cellSize);
    this.image1.alpha = contiData.alpha1;
    this.image2.alpha = contiData.alpha2;
    return {animate: animate};
  }

  animate() {
    requestAnimationFrame(() => { this.animate(); });
    // if(this.state.animate) {
    //   var size = Math.round(Math.random() * this.state.maxCellSize);
    //   this.filter.size = new PIXI.Point(size, size);
    // }
    this.renderer.render(this.stage);
  }

  render() {
    //backgroundImage: "url(" + this.props.imagePath + ")",
    return(
      <div className="stage-bg" style={{position: "fixed", width: 990, height: 660}}>
        <div ref="stage" className="pixi-stage" style={{width: "100%", height: "100%"}} ></div>
      </div>
    )
  }
}

class PixelFace extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
        maxCellSize: 15,
        animate: true
    };
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        maxCellSize = this.state.maxCellSize,
        animate = last_state.animate;

    if(pctScroll < this.props.start + 0.005) {
      animate = true;
      this.filter.size =  new PIXI.Point(maxCellSize, maxCellSize);
    } else if (pctScroll > this.props.end) {
      animate = false;
      this.filter.size =  new PIXI.Point(1, 1);
    } else {
      // console.log(1 - adjustedPctScroll);
      animate = false;
      let size = Math.min(maxCellSize, (1 - adjustedPctScroll) * maxCellSize);
      this.filter.size = new PIXI.Point(size, size);
    }

    return {animate: animate};
  }

  componentDidMount() {
    this.renderer = new PIXI.WebGLRenderer(990,660, {transparent: true});
    this.refs.stage.appendChild(this.renderer.view);
    this.stage = new PIXI.Container();
    this.filter = new PIXI.filters.PixelateFilter();
    this.filter.size =  new PIXI.Point(this.state.maxCellSize, this.state.maxCellSize);
    this.stage.filters = [this.filter];
    this.head();
    // this.body();
    this.animate();
    this.bindHandlers();
  }

  animate() {
    requestAnimationFrame(() => { this.animate(); });
    if(this.state.animate) {
      var size = Math.round(Math.random() * this.state.maxCellSize);
      this.filter.size = new PIXI.Point(size, size);
    }
    this.renderer.render(this.stage);
  }

  head() {
    var hakFrame = new PIXI.Rectangle(65, 0, 125, 140);
    var wikiFrame = new PIXI.Rectangle(445, 80, 140, 140); //PIXI.Rectangle(310, 180, 340, 270);
    var sportingLifeFrame = new PIXI.Rectangle(800, 30, 130, 125);
    var baseTexture = PIXI.BaseTexture.fromImage(this.props.imagePath);
    var hakTexture = new PIXI.Texture(baseTexture, hakFrame);
    var wikiTexture = new PIXI.Texture(baseTexture, wikiFrame);
    var sportingLifeTexture = new PIXI.Texture(baseTexture, sportingLifeFrame);
    var hak = new PIXI.Sprite(hakTexture);
    var wiki = new PIXI.Sprite(wikiTexture);
    var sportingLife = new PIXI.Sprite(sportingLifeTexture);
    hak.position.x = 65;
    hak.position.y = 0;
    wiki.position.x = 445;
    wiki.position.y = 80;
    sportingLife.position.x = 800;
    sportingLife.position.y = 30;
    this.stage.addChild(hak);
    this.stage.addChild(wiki);
    this.stage.addChild(sportingLife);
  }

  body() {
    var hakFrame = new PIXI.Rectangle(0, 0, 270, 660);
    var wikiFrame = new PIXI.Rectangle(380, 80, 260, 580); //PIXI.Rectangle(310, 180, 340, 270);
    var sportingLifeFrame = new PIXI.Rectangle(715, 30, 275, 630);
    var baseTexture = PIXI.BaseTexture.fromImage(this.props.imagePath);
    var hakTexture = new PIXI.Texture(baseTexture, hakFrame);
    var wikiTexture = new PIXI.Texture(baseTexture, wikiFrame);
    var sportingLifeTexture = new PIXI.Texture(baseTexture, sportingLifeFrame);
    var hak = new PIXI.Sprite(hakTexture);
    var wiki = new PIXI.Sprite(wikiTexture);
    var sportingLife = new PIXI.Sprite(sportingLifeTexture);
    hak.position.x = 0;
    hak.position.y = 0;
    wiki.position.x = 380;
    wiki.position.y = 80;
    sportingLife.position.x = 715;
    sportingLife.position.y = 30;
    this.stage.addChild(hak);
    this.stage.addChild(wiki);
    this.stage.addChild(sportingLife);
  }

  render() {
    return(
      <div className="stage-bg" style={{backgroundImage: "url(" + this.props.imagePath + ")", position: "fixed", width: 990, height: 660}}>
        <div ref="stage" className="pixi-stage" style={{width: "100%", height: "100%"}} ></div>
      </div>
    )
  }
}

class ScrambleMask extends ScanComponent {
  constructor(props) {
    super(props);
    this.state = {
        maxCellSize: 15,
        animate: true
    };
  }

  componentWillReceiveProps() {
    this.setState(this.adjust(this.state));
  }

  isActive(d){
    return (d.pctScroll >= this.props.start && d.pctScroll < this.props.end);
  }

  adjust(last_state) {
    var {viewportHeight, viewportTop, adjustedViewportTop, contentHeight, pctScroll} = this.props.measurements,
        adjustedPctScroll = this.scaler(pctScroll),
        active = this.isActive(this.props.measurements),
        maxCellSize = this.state.maxCellSize,
        animate = last_state.animate;

    if(pctScroll < this.props.start + 0.005) {
      animate = true;
      this.filter.size =  new PIXI.Point(maxCellSize, maxCellSize);
    } else if (pctScroll > this.props.end) {
      animate = false;
      this.filter.size =  new PIXI.Point(1, 1);
    } else {
      // console.log(1 - adjustedPctScroll);
      animate = false;
      let size = Math.min(maxCellSize, (1 - adjustedPctScroll) * maxCellSize);
      this.filter.size = new PIXI.Point(size, size);
    }

    return {animate: animate};
  }

  componentDidMount() {
    this.renderer = new PIXI.WebGLRenderer(990,660, {transparent: true});
    this.refs.stage.appendChild(this.renderer.view);
    this.stage = new PIXI.Container();
    this.filter = new PIXI.filters.PixelateFilter();
    this.filter.size =  new PIXI.Point(this.state.maxCellSize, this.state.maxCellSize);
    this.stage.filters = [this.filter];
    this.head();
    this.animate();
    this.bindHandlers();
  }

  randomizePositions() {
    var pos = _.shuffle(this.positions);
    this.hak.position.x = pos[0][0];
    this.hak.position.y = pos[0][1];
    this.wiki.position.x = pos[1][0];
    this.wiki.position.y = pos[1][1];
    this.sportingLife.position.x = pos[2][0];
    this.sportingLife.position.y = pos[2][1];
  }

  animate() {
    requestAnimationFrame(() => { this.animate(); });
    if(this.state.animate) {
      var size = Math.max(3, Math.round(Math.random() * this.state.maxCellSize));
      this.filter.size = new PIXI.Point(size, size);
      this.randomizePositions();
    } else {
      this.hak.position.x = this.positions[0][0];
      this.hak.position.y = this.positions[0][1];
      this.wiki.position.x = this.positions[1][0];
      this.wiki.position.y = this.positions[1][1];
      this.sportingLife.position.x = this.positions[2][0];
      this.sportingLife.position.y = this.positions[2][1];
    }
    this.renderer.render(this.stage);
  }

  head() {
    var hakFrame = new PIXI.Rectangle(65, 0, 125, 140);
    var wikiFrame = new PIXI.Rectangle(445, 80, 140, 140); //PIXI.Rectangle(310, 180, 340, 270);
    var sportingLifeFrame = new PIXI.Rectangle(800, 30, 130, 125);
    var baseTexture = PIXI.BaseTexture.fromImage(this.props.imagePath);
    var hakTexture = new PIXI.Texture(baseTexture, hakFrame);
    var wikiTexture = new PIXI.Texture(baseTexture, wikiFrame);
    var sportingLifeTexture = new PIXI.Texture(baseTexture, sportingLifeFrame);
    this.hak = new PIXI.Sprite(hakTexture);
    this.wiki = new PIXI.Sprite(wikiTexture);
    this.sportingLife = new PIXI.Sprite(sportingLifeTexture);
    this.hak.position.x = 65;
    this.hak.position.y = 0;
    this.wiki.position.x = 445;
    this.wiki.position.y = 80;
    this.sportingLife.position.x = 800;
    this.sportingLife.position.y = 30;
    this.positions = [[65, 0], [445, 80], [800,30]];
    this.stage.addChild(this.hak);
    this.stage.addChild(this.wiki);
    this.stage.addChild(this.sportingLife);
  }

  render() {
    return(
      <div className="stage-bg" style={{backgroundImage: "url(" + this.props.imagePath + ")", position: "fixed", width: 990, height: 660}}>
        <div ref="stage" className="pixi-stage" style={{width: "100%", height: "100%"}} ></div>
      </div>
    )
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
